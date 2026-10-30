import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
export const root = fileURLToPath(new URL("../", import.meta.url));
export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
export const readJSON = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));
export const git = (...args) => execFileSync("git", args, { cwd: root, maxBuffer: 10 * 1024 * 1024 });
export const catalog = readJSON("releases/catalog.json");
export const integrity = readJSON("releases/integrity.json");
const allowed = new Set(readJSON("releases/source-allowlist.json").allowedPackagedFiles);
export function entryForTag(tag) {
  assert.match(tag ?? "", /^v\d+\.\d+\.\d+$/, "A catalogued vMAJOR.MINOR.PATCH tag is required.");
  const entry = catalog.releases.find((release) => release.tag === tag);
  assert.ok(entry, "The tag must be present in the reviewed release catalog.");
  return entry;
}
export function archiveFiles(entry) {
  const path = join(root, entry.archivePath);
  assert.equal(entry.filename, `allauth-react-${entry.version}.tgz`);
  assert.equal(entry.archivePath, `releases/archives/${entry.filename}`);
  assert.equal(entry.checksumPath, `releases/checksums/${entry.filename}.sha256`);
  assert.equal(sha256(readFileSync(path)), entry.sha256, `${entry.version}: archive checksum differs`);
  assert.equal(integrity[entry.filename], entry.sha256, `${entry.version}: root integrity manifest differs`);
  assert.equal(readFileSync(join(root, entry.checksumPath), "utf8"), `${entry.sha256}  ${entry.filename}\n`);
  const names = execFileSync("tar", ["-tzf", path], { encoding: "utf8" }).trim().split("\n").filter((name) => name && name !== "package" && !name.endsWith("/"));
  const result = new Map();
  for (const pathName of names) {
    assert.ok(pathName.startsWith("package/"), "Archive entries must stay under package/.");
    const name = pathName.slice("package/".length);
    assert.ok(allowed.has(name), `${entry.version}: unapproved packaged path ${name}`);
    assert.ok(!result.has(name), "Duplicate archive paths are forbidden.");
    result.set(name, execFileSync("tar", ["-xOzf", path, pathName], { maxBuffer: 5 * 1024 * 1024 }));
  }
  assert.deepEqual([...result.keys()].sort(), entry.sourceFiles.map((file) => file.path).sort());
  for (const file of entry.sourceFiles) {
    const bytes = result.get(file.path);
    assert.equal(bytes.length, file.bytes);
    assert.equal(sha256(bytes), file.sha256, `${entry.version}: source checksum differs for ${file.path}`);
  }
  const manifest = JSON.parse(result.get("package.json").toString("utf8"));
  assert.equal(manifest.name, "@allauth/react");
  assert.equal(manifest.version, entry.version);
  assert.equal(manifest.private, true, "npm publishing remains disabled pending a separate policy decision.");
  assert.equal(manifest.license ?? null, entry.sdkLicense);
  return result;
}
export function verifyTag(entry, files = archiveFiles(entry)) {
  const taggedIntegrity = JSON.parse(git("show", `${entry.tag}:releases/integrity.json`).toString("utf8"));
  assert.equal(taggedIntegrity[entry.filename], entry.sha256, `${entry.tag}: an existing tagged archive hash cannot be rewritten`);
  const names = git("ls-tree", "-r", "--name-only", entry.tag, "--", "packages/react").toString("utf8").trim().split("\n").map((name) => name.slice("packages/react/".length));
  assert.deepEqual(names.sort(), [...files.keys()].sort(), `${entry.tag}: source file inventory differs`);
  for (const [name, bytes] of files) assert.equal(sha256(git("show", `${entry.tag}:packages/react/${name}`)), sha256(bytes), `${entry.tag}: source bytes differ for ${name}`);
  return files;
}
export function notesFor(entry) {
  const date = entry.publishedAt ? `Recorded SDK publication time: ${entry.publishedAt}.` : entry.dateConfidence === "pending" ? "This is a new SDK publication. GitHub release metadata records its exact publication time." : "The original SDK publication date was not retained. This release backfills an already-public archive; its Git import and GitHub publication dates are not original historical release dates.";
  return `${entry.summary}\n\n${entry.notes.map((note) => `- ${note}`).join("\n")}\n\n${date}\n\n[Exact SDK source](${entry.sourceUrl}) · [Public release record](${entry.changelogUrl})\n\nSHA-256: \`${entry.sha256}\`\n`;
}

export function assertTagRetention(entries, tags) {
  const catalogued = new Set(entries.map((entry) => entry.tag));
  for (const tag of tags.filter((name) => /^v\d+\.\d+\.\d+$/.test(name))) {
    assert.ok(catalogued.has(tag), `${tag}: a retained stable tag cannot be removed from the current catalog or integrity manifest.`);
  }
}

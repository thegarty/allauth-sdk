import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { catalog, root, sha256 } from "./catalog.mjs";
import { verifyRelease } from "./verify-release.mjs";
export function verifyAssets(release, expected, complete = true) {
  const names = release.assets.map((asset) => asset.name);
  assert.equal(new Set(names).size, names.length, "Duplicate release assets require manual review.");
  for (const asset of release.assets) {
    const target = expected.find((item) => item.name === asset.name);
    assert.ok(target, "Unexpected existing release asset; nothing will be removed or overwritten.");
    assert.equal(asset.state, "uploaded");
    assert.equal(asset.size, target.size, "Existing asset size differs; replacement is forbidden.");
    assert.equal(asset.digest, `sha256:${target.sha256}`, "Existing asset digest differs or is unavailable; replacement is forbidden.");
  }
  const missing = expected.filter((item) => !names.includes(item.name));
  if (complete) assert.equal(missing.length, 0, "Both checked assets must exist before publication.");
  return missing;
}
export function verifyMetadata(release, metadata) {
  for (const key of ["tag_name", "name", "body", "prerelease"]) {
    assert.equal(release[key], metadata[key], `Release ${key} differs from the reviewed catalog; it will not be silently published or rewritten.`);
  }
}
export function publicationPlan(release, expected, metadata) {
  if (!release) return { action: "create-draft", missing: expected };
  verifyMetadata(release, metadata);
  if (!release.draft) {
    assert.equal(release.immutable, true, "An existing published release must be immutable; it will not be edited.");
    verifyAssets(release, expected);
    return { action: "verified", missing: [] };
  }
  return { action: "resume-draft", missing: verifyAssets(release, expected, false) };
}
function publish(tag) {
  assert.equal(process.env.GITHUB_REPOSITORY, "thegarty/allauth-sdk", "Publishing is scoped to the reviewed SDK repository.");
  assert.ok(process.env.GH_TOKEN, "The workflow requires its native repository token.");
  const repository = process.env.GITHUB_REPOSITORY;
  const { entry, notes } = verifyRelease(tag);
  const metadata = { tag_name: tag, name: entry.title, body: notes, prerelease: false };
  const expected = [entry.archivePath, entry.checksumPath].map((path) => {
    const bytes = readFileSync(join(root, path));
    return { name: path.split("/").at(-1), path: join(root, path), size: bytes.length, sha256: sha256(bytes) };
  });
  const api = (...args) => JSON.parse(execFileSync("gh", ["api", ...args, "-H", "Accept: application/vnd.github+json", "-H", "X-GitHub-Api-Version: 2026-03-10"], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }));
  const pages = api(`repos/${repository}/releases?per_page=100`, "--paginate", "--slurp");
  let release = pages.flat().find((item) => item.tag_name === tag);
  const plan = publicationPlan(release, expected, metadata);
  if (plan.action === "verified") { console.log(`Verified existing immutable release ${tag}; no changes made.`); return; }
  const temporary = mkdtempSync(join(tmpdir(), "allauth-sdk-release-"));
  try {
    const body = join(temporary, "body.json");
    if (!release) {
      writeFileSync(body, JSON.stringify({ ...metadata, draft: true, generate_release_notes: false }));
      release = api(`repos/${repository}/releases`, "--method", "POST", "--input", body);
      assert.equal(release.draft, true);
    }
    for (const asset of plan.missing) {
      const upload = new URL(release.upload_url.replace("{?name,label}", ""));
      assert.equal(upload.origin, "https://uploads.github.com");
      assert.equal(upload.pathname, `/repos/${repository}/releases/${release.id}/assets`);
      upload.searchParams.set("name", asset.name);
      api(upload.href, "--method", "POST", "-H", `Content-Type: ${asset.name.endsWith(".tgz") ? "application/gzip" : "text/plain"}`, "--input", asset.path);
    }
    release = api(`repos/${repository}/releases/${release.id}`);
    assert.equal(release.draft, true);
    verifyMetadata(release, metadata);
    verifyAssets(release, expected);
    writeFileSync(body, JSON.stringify({ ...metadata, draft: false, make_latest: entry.version === catalog.latestVersion ? "true" : "false" }));
    release = api(`repos/${repository}/releases/${release.id}`, "--method", "PATCH", "--input", body);
    assert.equal(release.draft, false);
    assert.equal(release.immutable, true, "Repository release immutability must remain enabled.");
    verifyMetadata(release, metadata);
    verifyAssets(release, expected);
    console.log(`Published and verified immutable release ${tag}: ${release.html_url}`);
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) publish(process.argv[2]);

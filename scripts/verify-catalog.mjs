import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { archiveFiles, assertTagRetention, catalog, git, integrity, root, sha256, verifyTag } from "./catalog.mjs";
assertTagRetention(catalog.releases, git("tag", "--list").toString("utf8").trim().split("\n"));
assert.equal(catalog.reconstructedHistory, true);
assert.equal(catalog.sourceArchiveCatalog, "https://allauth.co/sdk/integrity.json");
assert.deepEqual(catalog.releases.map((entry) => entry.filename).sort(), Object.keys(integrity).sort());
assert.deepEqual(readdirSync(join(root, "releases/archives")).sort(), Object.keys(integrity).sort());
let fileCount = 0;
for (const entry of catalog.releases) {
  assert.equal(entry.tag, `v${entry.version}`);
  assert.equal(entry.downloadUrl, `https://allauth.co/sdk/${entry.filename}`);
  assert.equal(entry.sourceUrl, `https://github.com/thegarty/allauth-sdk/tree/${entry.tag}/packages/react`);
  assert.equal(entry.githubReleaseUrl, `https://github.com/thegarty/allauth-sdk/releases/tag/${entry.tag}`);
  assert.ok(entry.summary && entry.notes.length && entry.provenance.length);
  if (entry.dateConfidence === "unknown") assert.equal(entry.publishedAt, null);
  const files = verifyTag(entry, archiveFiles(entry));
  fileCount += files.size;
  if (entry.version === catalog.latestVersion) {
    assert.deepEqual(readdirSync(join(root, "packages/react")).filter((name) => name !== "node_modules").sort(), [...files.keys()].sort());
    for (const [name, bytes] of files) assert.equal(sha256(readFileSync(join(root, "packages/react", name))), sha256(bytes));
  }
}
console.log(`Verified ${catalog.releases.length} immutable archives and tags, ${fileCount} source-file instances, and the current SDK tree.`);

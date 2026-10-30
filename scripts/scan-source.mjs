import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { archiveFiles, catalog, git, root } from "./catalog.mjs";
import { assertPublicPath, assertPublicText } from "./source-policy.mjs";
let checked = 0;
function inspect(label, bytes) {
  assertPublicText(label, bytes);
  checked += 1;
}
for (const release of catalog.releases) for (const [name, bytes] of archiveFiles(release)) inspect(`${release.version}/${name}`, bytes);
const tracked = git("ls-files", "--cached", "--others", "--exclude-standard", "-z").toString("utf8").split("\0").filter(Boolean);
const allowedTopLevel = new Set([".github", ".gitignore", "packages", "releases", "scripts", "tests", "docs", "README.md", "PROVENANCE.md", "CHANGELOG.md", "RELEASING.md", "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "tsconfig.json"]);
for (const name of tracked) {
  assert.ok(allowedTopLevel.has(name.split("/")[0]), `Unapproved top-level publication path: ${name}`);
  assertPublicPath(name);
  if (!name.endsWith(".tgz")) inspect(name, readFileSync(join(root, name)));
}
console.log(`Checked ${checked} text-source instances; no credential-pattern matches or private configuration paths found. This is a scoped disclosure check, not a guarantee of absence.`);

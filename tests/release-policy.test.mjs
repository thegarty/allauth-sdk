import assert from "node:assert/strict";
import test from "node:test";
import { publicationPlan } from "../scripts/publish-release.mjs";
import { notesFor } from "../scripts/catalog.mjs";

test("a new release without publication evidence does not invent a timestamp or historical backfill", () => {
  const notes = notesFor({ summary: "New SDK", notes: ["Retry-After forwarding"], publishedAt: null, dateConfidence: "pending", sourceUrl: "https://fixture.example/source", changelogUrl: "https://fixture.example/release", sha256: "a".repeat(64) });
  assert.match(notes, /new SDK publication/);
  assert.doesNotMatch(notes, /backfills|Recorded SDK publication time/);
});

const expected = [
  { name: "allauth-react-1.4.3.tgz", size: 3, sha256: "a".repeat(64) },
  { name: "allauth-react-1.4.3.tgz.sha256", size: 96, sha256: "b".repeat(64) },
];
const metadata = { tag_name: "v1.4.3", name: "AllAuth React SDK 1.4.3", body: "Reviewed catalog notes", prerelease: false };
const assets = expected.map((asset) => ({ name: asset.name, size: asset.size, state: "uploaded", digest: `sha256:${asset.sha256}` }));

test("an existing immutable release is verified without a publication or replacement plan", () => {
  assert.deepEqual(publicationPlan({ ...metadata, draft: false, immutable: true, assets }, expected, metadata), { action: "verified", missing: [] });
});

test("a resumed draft uploads only the missing checksum and preserves its existing archive", () => {
  assert.deepEqual(publicationPlan({ ...metadata, draft: true, assets: assets.slice(0, 1) }, expected, metadata), { action: "resume-draft", missing: expected.slice(1) });
});

test("mismatched or unverifiable published assets cannot be silently replaced", () => {
  for (const changed of [{ digest: `sha256:${"c".repeat(64)}` }, { digest: null }, { size: 4 }]) {
    assert.throws(() => publicationPlan({ ...metadata, draft: false, immutable: true, assets: [{ ...assets[0], ...changed }, assets[1]] }, expected, metadata));
  }
  assert.throws(() => publicationPlan({ ...metadata, draft: false, immutable: false, assets }, expected, metadata));
});

test("an unexpected or mismatched draft asset stops publication rather than clobbering it", () => {
  assert.throws(() => publicationPlan({ ...metadata, draft: true, assets: [{ ...assets[0], digest: "sha256:unexpected" }] }, expected, metadata));
  assert.throws(() => publicationPlan({ ...metadata, draft: true, assets: [...assets, { name: "unreviewed.txt", size: 1, state: "uploaded", digest: "sha256:unknown" }] }, expected, metadata));
});


test("draft and published releases cannot carry unreviewed titles, bodies or prerelease metadata", () => {
  for (const draft of [true, false]) {
    for (const changed of [{ name: "Different title" }, { body: "Stale notes" }, { prerelease: true }]) {
      assert.throws(() => publicationPlan({ ...metadata, draft, immutable: true, assets, ...changed }, expected, metadata));
    }
  }
});

import { fileURLToPath } from "node:url";
import { entryForTag, notesFor, verifyTag } from "./catalog.mjs";
export function verifyRelease(tag) {
  const entry = entryForTag(tag);
  verifyTag(entry);
  return { entry, notes: notesFor(entry) };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { entry, notes } = verifyRelease(process.argv[2]);
  if (process.argv[3] === "--notes") process.stdout.write(notes);
  else console.log(JSON.stringify({ tag: entry.tag, title: entry.title, version: entry.version, archive: entry.archivePath, checksum: entry.checksumPath, sha256: entry.sha256, sourceUrl: entry.sourceUrl }));
}

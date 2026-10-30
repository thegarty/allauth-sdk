import assert from "node:assert/strict";
import test from "node:test";
import { assertPublicPath, assertPublicText } from "../scripts/source-policy.mjs";
import { assertTagRetention } from "../scripts/catalog.mjs";

test("every env-file suffix is blocked in every directory", () => {
  for (const path of [".env", ".env.local", "docs/.env.local", "scripts/.env.production", "examples/.env.test/config"]) assert.throws(() => assertPublicPath(path));
  assert.doesNotThrow(() => assertPublicPath("docs/environment.md"));
});

test("unquoted database connection credentials are rejected without logging their value", () => {
  const value = ["DATABASE_URL", "=", "postgresql:", "//", "synthetic-user", ":", "synthetic-password", "@", "database.example", "/fixture"].join("");
  assert.throws(() => assertPublicText("synthetic fixture", Buffer.from(value)));
});

test("deleting an archive and both catalog entries cannot remove an existing stable tag", () => {
  assert.throws(() => assertTagRetention([{ tag: "v1.4.3" }], ["v1.0.0", "v1.4.3"]));
  assert.doesNotThrow(() => assertTagRetention([{ tag: "v1.0.0" }, { tag: "v1.4.3" }], ["v1.0.0", "v1.4.3", "scratch"]));
});

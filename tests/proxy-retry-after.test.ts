import assert from "node:assert/strict";
import test from "node:test";
import { createAllAuthProxy } from "@allauth/react/next";

const project = "retry-fixture";
const origin = "https://fixture.example";
const context = { params: Promise.resolve({ all: ["get-session"] }) };

for (const retryAfter of ["17", "Fri, 30 Oct 2026 04:00:00 GMT"]) {
  test(`the published proxy retains 429 Retry-After ${retryAfter}`, async (testContext) => {
    const body = { error: "Session checks are temporarily rate limited.", code: "ALLAUTH_SESSION_CHECK_RATE_LIMITED" };
    testContext.mock.method(globalThis, "fetch", async () => Response.json(body, {
      status: 429,
      headers: {
        "retry-after": retryAfter,
        authorization: "Bearer private-fixture-upstream",
        "set-cookie": `__Secure-allauth_project_${project}.session_token=; Domain=allauth.co; Path=/api/auth; Secure; HttpOnly; Max-Age=0`,
      },
    }));
    const proxy = createAllAuthProxy({ project, proxySecret: "a".repeat(64), appOrigin: origin });
    const response = await proxy(new Request(`${origin}/api/allauth/get-session`), context);
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("retry-after"), retryAfter);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.has("authorization"), false);
    assert.deepEqual(response.headers.getSetCookie(), [`__Secure-allauth_project_${project}.session_token=; Path=/; Secure; HttpOnly; Max-Age=0`]);
    assert.deepEqual(await response.json(), body);
  });
}

test("the published proxy retains non-JSON Retry-After and leaves ordinary session replies unchanged", async (testContext) => {
  let refused = true;
  testContext.mock.method(globalThis, "fetch", async () => refused
    ? new Response("Try later.", { status: 429, headers: { "retry-after": "2", "content-type": "text/plain" } })
    : Response.json(null));
  const proxy = createAllAuthProxy({ project, proxySecret: "a".repeat(64), appOrigin: origin });
  const limited = await proxy(new Request(`${origin}/api/allauth/get-session`), context);
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "2");
  assert.equal(await limited.text(), "Try later.");
  refused = false;
  const ordinary = await proxy(new Request(`${origin}/api/allauth/get-session`), context);
  assert.equal(ordinary.status, 200);
  assert.equal(ordinary.headers.has("retry-after"), false);
  assert.equal(await ordinary.json(), null);
});

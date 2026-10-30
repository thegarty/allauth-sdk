import assert from "node:assert/strict";

const patterns = [
  ["database credential", /\b(?:DATABASE_URL|REDIS_URL|MONGODB_URI|MYSQL_URL)["']?\s*[:=]\s*["'`]?(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|rediss?):\/\/[^\s\/"'`]+:[^\s@"'`]+@/i],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ["GitHub token", /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/],
  ["AWS access key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ["service credential", /\b(?:sk_live_|rk_live_)[A-Za-z0-9]{20,}\b/],
  ["OpenAI credential", /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{30,}\b/],
  ["literal application secret", /(?:proxySecret|ALLAUTH_PROXY_SECRET|apiKey|clientSecret)\s*[:=]\s*["'][A-Za-z0-9_./+=-]{24,}["']/],
];

export function assertPublicPath(name) {
  assert.ok(!/(^|\/)\.env(?:\.[^/]*)?(?=\/|$)/i.test(name), `Private environment path: ${name}`);
  assert.ok(!/(^|\/)(?:\.secrets|\.local|\.clerk|\.railway|\.npmrc|\.netrc|\.pypirc|\.aws|\.ssh)(?:\/|$)/i.test(name), `Private configuration path: ${name}`);
}
export function assertPublicText(label, bytes) {
  const text = bytes.toString("utf8");
  for (const [kind, pattern] of patterns) assert.ok(!pattern.test(text), `${label}: possible ${kind}; review without printing the value.`);
}

#!/usr/bin/env node
/**
 * prod-probe.mjs
 *
 * Light-weight production health probe. Hits /api/health and (when an
 * admin session cookie is provided) /api/cockpit/jarvis, printing a
 * one-line summary suitable for piping into a deploy-verification step.
 *
 * Usage:
 *
 *   APP_URL=https://staging.example.com node scripts/prod-probe.mjs
 *
 *   APP_URL=https://prod.example.com \
 *     ADMIN_COOKIE="next-auth.session-token=..." \
 *     node scripts/prod-probe.mjs
 *
 * Exits non-zero if /api/health is not 200.
 */

const APP_URL = process.env.APP_URL;
const ADMIN_COOKIE = process.env.ADMIN_COOKIE ?? "";

if (!APP_URL) {
  console.error("APP_URL env var is required.");
  process.exit(2);
}

async function probe(path, { admin = false } = {}) {
  const url = `${APP_URL}${path}`;
  const t0 = Date.now();
  try {
    const headers = { Accept: "application/json" };
    if (admin && ADMIN_COOKIE) headers.Cookie = ADMIN_COOKIE;
    const res = await fetch(url, { headers });
    const ms = Date.now() - t0;
    let bodyHead = "";
    try {
      const text = await res.text();
      bodyHead = text.slice(0, 200);
    } catch {
      // ignore
    }
    return { ok: res.ok, status: res.status, ms, bodyHead };
  } catch (err) {
    return { ok: false, status: 0, ms: Date.now() - t0, bodyHead: String(err) };
  }
}

const results = [];

results.push({ path: "/api/health", ...(await probe("/api/health")) });
if (ADMIN_COOKIE) {
  results.push({ path: "/api/cockpit/jarvis", ...(await probe("/api/cockpit/jarvis", { admin: true })) });
}

console.log(`APP_URL=${APP_URL}`);
for (const r of results) {
  const tag = r.ok ? "OK" : "FAIL";
  console.log(`${tag.padEnd(5)} ${r.path.padEnd(28)} ${String(r.status).padEnd(4)} ${r.ms}ms`);
  if (r.bodyHead && !r.ok) {
    console.log(`  body[0..200]: ${r.bodyHead.replace(/\s+/g, " ")}`);
  }
}

const failHealth = !results[0]?.ok;
if (failHealth) {
  console.error("\n/api/health did not return 200. Deploy verification failed.");
  process.exit(1);
}
console.log("\n/api/health is healthy.");
process.exit(0);

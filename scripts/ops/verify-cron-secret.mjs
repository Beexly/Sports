#!/usr/bin/env node
/**
 * Verify CRON_SECRET wiring against a live base URL.
 * Usage:
 *   CRON_SECRET=… BASE_URL=https://www.galaxysportsedge.com node scripts/ops/verify-cron-secret.mjs
 *
 * Never prints the secret. Exit 0 only if unauth=401/500 and auth=200 on health-alert.
 */
const base = (process.env.BASE_URL || process.env.ORBIT_SMOKE_BASE || "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const secret = process.env.CRON_SECRET?.trim();
const path = "/api/cron/health-alert";

async function hit(headers = {}) {
  const res = await fetch(`${base}${path}`, { headers, redirect: "manual" });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { status: res.status, body };
}

const failures = [];

const unauth = await hit();
if (unauth.status !== 401 && unauth.status !== 500) {
  failures.push(`unauth expected 401 or 500, got ${unauth.status}`);
} else {
  console.log(`[ok] unauth status=${unauth.status} error=${unauth.body?.error ?? "?"}`);
}

if (!secret) {
  console.error("[fail] CRON_SECRET env not set — cannot run positive check");
  process.exit(2);
}

const auth = await hit({ Authorization: `Bearer ${secret}` });
if (auth.status !== 200) {
  failures.push(`auth expected 200, got ${auth.status} body=${JSON.stringify(auth.body).slice(0, 160)}`);
} else {
  console.log(`[ok] auth status=200`);
}

// Optional settle-picks touch (non-fatal if slow)
try {
  const settle = await hit({ Authorization: `Bearer ${secret}` });
  // re-use health; settle is separate
  const settleRes = await fetch(`${base}/api/cron/settle-picks`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  console.log(`[info] settle-picks status=${settleRes.status}`);
} catch (e) {
  console.log(`[info] settle-picks probe skipped: ${e instanceof Error ? e.message : e}`);
}

if (failures.length) {
  console.error("[fail]", failures.join("; "));
  process.exit(1);
}
console.log("[pass] CRON_SECRET verification steps complete");
process.exit(0);

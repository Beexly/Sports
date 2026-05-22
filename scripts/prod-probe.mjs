#!/usr/bin/env node
/**
 * prod-probe.mjs
 *
 * Light-weight production health probe. Hits /api/health, critical
 * public routes, and (when an admin session cookie is provided)
 * /api/cockpit/jarvis, printing a one-line summary suitable for piping
 * into a deploy-verification step or scheduled synthetic monitor.
 *
 * Usage:
 *
 *   APP_URL=https://staging.example.com node scripts/prod-probe.mjs
 *
 *   APP_URL=https://prod.example.com \
 *     ADMIN_COOKIE="next-auth.session-token=..." \
 *     node scripts/prod-probe.mjs
 *
 * Exits non-zero if /api/health is not 200, a critical public route is
 * unavailable, or a public route contains banned positioning language.
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
    let bodyText = "";
    try {
      bodyText = await res.text();
    } catch {
      // ignore
    }
    return { ok: res.ok, status: res.status, ms, bodyText, bodyHead: bodyText.slice(0, 200) };
  } catch (err) {
    return { ok: false, status: 0, ms: Date.now() - t0, bodyText: "", bodyHead: String(err) };
  }
}

const PUBLIC_ROUTE_PROBES = [
  { path: "/", label: "homepage" },
  { path: "/board", label: "board" },
  { path: "/ledger", label: "ledger" },
  { path: "/methodology", label: "methodology" },
  { path: "/pricing", label: "pricing" },
];

const BANNED_PUBLIC_PATTERNS = [
  /AI-powered/i,
  /AI-driven/i,
  /powered by AI/i,
  /multimodal intelligence/i,
  /AI agents/i,
  /machine learning models/i,
  /unlock your/i,
  /level up/i,
  /your edge starts here/i,
  /Mission Control/i,
];

function findBannedPublicPhrase(text) {
  for (const pattern of BANNED_PUBLIC_PATTERNS) {
    if (pattern.test(text)) return String(pattern);
  }
  return "";
}

const results = [];

results.push({ path: "/api/health", ...(await probe("/api/health")) });
for (const route of PUBLIC_ROUTE_PROBES) {
  const result = await probe(route.path);
  const bannedPattern = result.ok ? findBannedPublicPhrase(result.bodyText) : "";
  results.push({
    path: route.path,
    label: route.label,
    ...result,
    ok: result.ok && !bannedPattern,
    bannedPattern,
  });
}
if (ADMIN_COOKIE) {
  results.push({ path: "/api/cockpit/jarvis", ...(await probe("/api/cockpit/jarvis", { admin: true })) });
}

console.log(`APP_URL=${APP_URL}`);
for (const r of results) {
  const statusLabel = r.ok ? "OK".padEnd(5) : "FAIL".padEnd(5);
  console.log(`${statusLabel} ${r.path.padEnd(28)} ${String(r.status).padEnd(4)} ${r.ms}ms`);
  if (r.bannedPattern) {
    console.log(`  banned-pattern: ${r.bannedPattern}`);
  }
  if (r.bodyHead && !r.ok) {
    console.log(`  body[0..200]: ${r.bodyHead.replace(/\s+/g, " ")}`);
  }
}

const failHealth = !results[0]?.ok;
const failPublic = results.some((r) => PUBLIC_ROUTE_PROBES.some((route) => route.path === r.path) && !r.ok);
if (failHealth) {
  console.error("\n/api/health did not return 200. Deploy verification failed.");
  process.exit(1);
}
if (failPublic) {
  console.error("\nOne or more critical public probes failed. Deploy verification failed.");
  process.exit(1);
}
console.log("\nProduction probes passed.");
process.exit(0);

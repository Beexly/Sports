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
const PROD_PROBE_JSON = process.env.PROD_PROBE_JSON === "1";
const generatedAtIso = new Date().toISOString();

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

async function probeJsonShape(path, label, validate) {
  const result = await probe(path);
  let shapeError = "";
  if (result.ok) {
    try {
      const json = JSON.parse(result.bodyText);
      shapeError = validate(json);
    } catch (error) {
      shapeError = error instanceof Error ? error.message : "Response body is not valid JSON.";
    }
  }
  return {
    path,
    label,
    ...result,
    ok: result.ok && !shapeError,
    shapeError,
  };
}

const PUBLIC_ROUTE_PROBES = [
  { path: "/", label: "homepage" },
  { path: "/board", label: "board" },
  { path: "/ledger", label: "ledger" },
  { path: "/methodology", label: "methodology" },
  { path: "/pricing", label: "pricing" },
];

const API_SHAPE_PROBES = [
  { path: "/api/board/state", label: "board state", validate: validateBoardState },
  { path: "/api/calibration", label: "calibration", validate: validateCalibration },
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
for (const route of API_SHAPE_PROBES) {
  results.push(await probeJsonShape(route.path, route.label, route.validate));
}
if (ADMIN_COOKIE) {
  results.push({ path: "/api/cockpit/jarvis", ...(await probe("/api/cockpit/jarvis", { admin: true })) });
}

const failHealth = !results[0]?.ok;
const failPublic = results.some((r) => PUBLIC_ROUTE_PROBES.some((route) => route.path === r.path) && !r.ok);
const failApiShape = results.some((r) => API_SHAPE_PROBES.some((route) => route.path === r.path) && !r.ok);
const payload = {
  appUrl: APP_URL,
  generatedAtIso,
  ok: !failHealth && !failPublic && !failApiShape,
  failed: results.filter((r) => !r.ok).length,
  probes: results.map((r) => ({
    path: r.path,
    label: r.label ?? r.path,
    ok: r.ok,
    status: r.status,
    ms: r.ms,
    bannedPattern: r.bannedPattern ?? "",
    shapeError: r.shapeError ?? "",
    admin: r.path.startsWith("/api/cockpit/"),
  })),
};

if (PROD_PROBE_JSON) {
  console.log(JSON.stringify(payload));
} else {
  console.log(`APP_URL=${APP_URL}`);
  for (const r of results) {
    const statusLabel = r.ok ? "OK".padEnd(5) : "FAIL".padEnd(5);
    console.log(`${statusLabel} ${r.path.padEnd(28)} ${String(r.status).padEnd(4)} ${r.ms}ms`);
    if (r.bannedPattern) {
      console.log(`  banned-pattern: ${r.bannedPattern}`);
    }
    if (r.shapeError) {
      console.log(`  shape-error: ${r.shapeError}`);
    }
    if (r.bodyHead && !r.ok) {
      console.log(`  body[0..200]: ${r.bodyHead.replace(/\s+/g, " ")}`);
    }
  }
}

if (failHealth) {
  if (!PROD_PROBE_JSON) {
    console.error("\n/api/health did not return 200. Deploy verification failed.");
  }
  process.exit(1);
}
if (failPublic) {
  if (!PROD_PROBE_JSON) {
    console.error("\nOne or more critical public probes failed. Deploy verification failed.");
  }
  process.exit(1);
}
if (failApiShape) {
  if (!PROD_PROBE_JSON) {
    console.error("\nOne or more API shape probes failed. Deploy verification failed.");
  }
  process.exit(1);
}
if (!PROD_PROBE_JSON) {
  console.log("\nProduction probes passed.");
}
process.exit(0);

function validateBoardState(json) {
  if (json?.success !== true) return "Missing success=true.";
  if (!json.data || typeof json.data !== "object") return "Missing data object.";
  if (typeof json.data.sportsWatched !== "number") return "Missing data.sportsWatched number.";
  if (typeof json.data.booksPolled !== "number") return "Missing data.booksPolled number.";
  if (!Array.isArray(json.data.scoringNow)) return "Missing data.scoringNow array.";
  if (!Array.isArray(json.data.publishedToday)) return "Missing data.publishedToday array.";
  if (!Array.isArray(json.data.gatedTodayRows)) return "Missing data.gatedTodayRows array.";
  if (!json.meta || typeof json.meta.isSampleData !== "boolean") return "Missing meta.isSampleData boolean.";
  return "";
}

function validateCalibration(json) {
  if (json?.success !== true) return "Missing success=true.";
  if (!json.data || typeof json.data !== "object") return "Missing data object.";
  if (!Array.isArray(json.data.buckets)) return "Missing data.buckets array.";
  if (typeof json.data.sampleSize !== "number") return "Missing data.sampleSize number.";
  if (typeof json.data.updatedAt !== "string") return "Missing data.updatedAt string.";
  if (typeof json.data.isCollecting !== "boolean") return "Missing data.isCollecting boolean.";
  if (!json.meta || typeof json.meta.gated !== "boolean") return "Missing meta.gated boolean.";
  return "";
}

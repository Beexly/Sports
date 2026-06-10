#!/usr/bin/env node
/**
 * prod-probe.mjs
 *
 * Light-weight production health probe. Hits /api/live, /api/health,
 * /api/ready, critical
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
 * Exits non-zero if /api/live or /api/health is not 200, /api/ready is
 * not 200, a critical public route is
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

async function probeJsonShape(path, label, validate, options = {}) {
  const result = await probe(path, options);
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

async function probeStatusJsonShape(path, label, validate, options = {}) {
  const result = await probe(path, options);
  let shapeError = "";
  try {
    const json = JSON.parse(result.bodyText);
    shapeError = validate(result.status, json);
  } catch (error) {
    shapeError = error instanceof Error ? error.message : "Response body is not valid JSON.";
  }
  return {
    path,
    label,
    ...result,
    ok: !shapeError,
    shapeError,
  };
}

async function probeTextShape(path, label, validate, options = {}) {
  const result = await probe(path, options);
  const shapeError = result.ok ? validate(result.bodyText) : "";
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
  {
    path: "/api/ready?check=ingestion-freshness",
    label: "ingestion freshness",
    validate: validateIngestionFreshness,
  },
  { path: "/api/board/state", label: "board state", validate: validateBoardState },
  {
    path: "/api/board/state?check=book-depth",
    label: "book depth",
    validate: validateBookDepth,
  },
  {
    path: "/api/board/state?check=edge-index",
    label: "public Edge Index",
    validate: validateBoardEdgeIndex,
  },
  { path: "/api/calibration", label: "calibration", validate: validateCalibration },
];

const TEXT_SHAPE_PROBES = [
  { path: "/journal/rss.xml", label: "Model Journal RSS", validate: validateJournalRss },
];

const GATE_SHAPE_PROBES = [
  {
    path: "/api/picks?check=public-picks-gate",
    label: "public picks gate",
    validate: validatePublicPicksGate,
  },
  {
    path: "/api/performance?check=performance-gate",
    label: "performance stats gate",
    validate: validatePerformanceGate,
  },
];

const ADMIN_API_SHAPE_PROBES = [
  {
    path: "/api/cockpit/bot-outbox/preview?surface=twitter",
    label: "Twitter/X outbox",
    validate: validateBotOutboxPreview,
  },
  {
    path: "/api/cockpit/bot-outbox/preview?surface=discord",
    label: "Discord outbox",
    validate: validateBotOutboxPreview,
  },
  {
    path: "/api/cockpit/readiness?check=public-blog-gate",
    label: "public blog gate",
    validate: validateReadinessGates,
  },
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

results.push({ path: "/api/live", ...(await probe("/api/live")) });
results.push({ path: "/api/health", ...(await probe("/api/health")) });
results.push({ path: "/api/ready", ...(await probe("/api/ready")) });
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
for (const route of TEXT_SHAPE_PROBES) {
  results.push(await probeTextShape(route.path, route.label, route.validate));
}
for (const route of GATE_SHAPE_PROBES) {
  results.push(await probeStatusJsonShape(route.path, route.label, route.validate));
}
if (ADMIN_COOKIE) {
  results.push({ path: "/api/cockpit/jarvis", ...(await probe("/api/cockpit/jarvis", { admin: true })) });
  for (const route of ADMIN_API_SHAPE_PROBES) {
    const result = await probeJsonShape(route.path, route.label, route.validate, { admin: true });
    results.push(result);
  }
}

const failHealth = results.some((r) => (r.path === "/api/live" || r.path === "/api/health") && !r.ok);
const failReady = results.some((r) => r.path === "/api/ready" && !r.ok);
const failPublic = results.some((r) => PUBLIC_ROUTE_PROBES.some((route) => route.path === r.path) && !r.ok);
const failApiShape = results.some((r) => API_SHAPE_PROBES.some((route) => route.path === r.path) && !r.ok);
const failTextShape = results.some((r) => TEXT_SHAPE_PROBES.some((route) => route.path === r.path) && !r.ok);
const failGateShape = results.some((r) => GATE_SHAPE_PROBES.some((route) => route.path === r.path) && !r.ok);
const failAdminShape = results.some((r) =>
  ADMIN_API_SHAPE_PROBES.some((route) => route.path === r.path) && !r.ok
);
const payload = {
  appUrl: APP_URL,
  generatedAtIso,
  ok: !failHealth && !failReady && !failPublic && !failApiShape && !failTextShape && !failGateShape && !failAdminShape,
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
    console.error("\n/api/live or /api/health did not return 200. Deploy verification failed.");
  }
  process.exit(1);
}
if (failReady) {
  if (!PROD_PROBE_JSON) {
    console.error("\n/api/ready did not return 200. Deploy verification failed.");
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
if (failTextShape) {
  if (!PROD_PROBE_JSON) {
    console.error("\nOne or more content surface probes failed. Deploy verification failed.");
  }
  process.exit(1);
}
if (failGateShape) {
  if (!PROD_PROBE_JSON) {
    console.error("\nOne or more trust gate probes failed. Deploy verification failed.");
  }
  process.exit(1);
}
if (failAdminShape) {
  if (!PROD_PROBE_JSON) {
    console.error("\nOne or more authenticated cockpit probes failed. Deploy verification failed.");
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

function validateBoardEdgeIndex(json) {
  const baseError = validateBoardState(json);
  if (baseError) return baseError;
  if (json.meta?.dataStatus === "degraded") return "";
  const rows = [
    ...json.data.scoringNow,
    ...json.data.publishedToday,
    ...json.data.gatedTodayRows,
  ];
  if (rows.length === 0) return "No tracked slate rows available for Edge Index visibility.";
  const withEdgeIndex = rows.filter((row) => typeof row.edgeIndex === "number");
  if (withEdgeIndex.length === 0) return "No slate rows expose a numeric Edge Index.";
  return "";
}

function validateBookDepth(json) {
  const baseError = validateBoardState(json);
  if (baseError) return baseError;
  if (json.meta?.dataStatus === "degraded") return "";
  if (json.data.booksPolled < 8) {
    return `Expected at least 8 books reporting, got ${json.data.booksPolled}.`;
  }
  return "";
}

function validateIngestionFreshness(json) {
  if (json?.checks?.ingestion?.status !== "ok") return "Ingestion health is not ok.";
  if (typeof json.checks.ingestion.ageMinutes !== "number") {
    return "Missing checks.ingestion.ageMinutes number.";
  }
  if (typeof json.checks.ingestion.lastSuccessAt !== "string") {
    return "Missing checks.ingestion.lastSuccessAt string.";
  }
  if (json.checks.ingestion.ageMinutes > 60) {
    return `Latest successful ingestion is ${json.checks.ingestion.ageMinutes} minutes old.`;
  }
  return "";
}

function validatePublicPicksGate(status, json) {
  if (status === 503 && json?.bootstrapMode === true && typeof json.error === "string") {
    return "";
  }
  if (status === 200 && json?.success === true && Array.isArray(json.data)) {
    if (!json.meta || typeof json.meta.total !== "number") {
      return "Missing meta.total number on public picks payload.";
    }
    return "";
  }
  return `Unexpected public picks gate response: HTTP ${status}.`;
}

function validatePerformanceGate(status, json) {
  if (status === 503 && json?.bootstrapMode === true && typeof json.error === "string") {
    return "";
  }
  if (status === 200 && json?.success === true && json.data?.overall) {
    return "";
  }
  return `Unexpected performance gate response: HTTP ${status}.`;
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

function validateJournalRss(text) {
  if (!text.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
    return "Missing XML declaration.";
  }
  if (!text.includes('<rss version="2.0">')) return "Missing RSS 2.0 root.";
  if (!text.includes("<channel>")) return "Missing RSS channel.";
  if (!text.includes("<title>Galaxy Sports Edge Model Journal</title>")) {
    return "Missing Model Journal channel title.";
  }
  if (!text.includes("<lastBuildDate>")) return "Missing lastBuildDate.";
  return "";
}

function validateBotOutboxPreview(json) {
  if (json?.success !== true) return "Missing success=true.";
  if (!json.policy || json.policy.draftOnly !== true) return "Missing policy.draftOnly=true.";
  if (json.policy.externalDelivery !== false) return "Missing policy.externalDelivery=false.";
  if (json.policy.persistence !== false) return "Missing policy.persistence=false.";
  if (!json.counts || typeof json.counts.outboxItems !== "number") {
    return "Missing counts.outboxItems number.";
  }
  if (!Array.isArray(json.items)) return "Missing items array.";
  return "";
}

function validateReadinessGates(json) {
  if (json?.success !== true) return "Missing success=true.";
  const gates = json.data?.gates;
  if (!gates || typeof gates !== "object") return "Missing data.gates object.";
  if (typeof gates.canPublishContent !== "boolean") {
    return "Missing data.gates.canPublishContent boolean.";
  }
  if (typeof gates.canExposePublicPicks !== "boolean") {
    return "Missing data.gates.canExposePublicPicks boolean.";
  }
  if (typeof gates.canExposePerformanceStats !== "boolean") {
    return "Missing data.gates.canExposePerformanceStats boolean.";
  }
  return "";
}

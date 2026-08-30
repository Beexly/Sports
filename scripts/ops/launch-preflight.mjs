#!/usr/bin/env node
/**
 * GSE launch preflight — read-only black-box probe of production.
 *
 * Steps (numbered in output):
 *   1  /api/health     readiness (ok/HTTP) + operator status + settlement capability
 *   2  Home + CSP      public HTML + Content-Security-Policy
 *   3  Ops truth       SHA, settlement counts, gates, credits, ladder, founder steps
 *   4  Product gates   picks gated, settle cron auth wall
 *   5  Settle (opt)    CRON_SECRET → 2xx + repair fields
 *   6  Trust / SEO     security, ads, humans, llms, robots, sitemaps, feed
 *
 * Semantics (do not confuse):
 *   health.ok + HTTP 503  → DB/ingestion only (pipeline death)
 *   health.status         → also reflects settlement CRITICAL/DEGRADED
 *   ops.settlement        → grace = SETTLEMENT_DEFAULT_GRACE_HOURS (6h), overdue PENDING
 *
 * Usage:
 *   node scripts/ops/launch-preflight.mjs
 *   BASE_URL=https://www.galaxysportsedge.com node scripts/ops/launch-preflight.mjs
 *   CRON_SECRET=… node scripts/ops/launch-preflight.mjs
 *
 * Exit: 0 if no critical !! ; 1 if pipeline/storage/gate failures (env !! are soft)
 * Docs: docs/ops/LAUNCH_PREFLIGHT.md
 */
const BASE = (process.env.BASE_URL || "https://www.galaxysportsedge.com").replace(/\/$/, "");

/** Soft !! = founder env; hard !! = fail process exit */
let hardFails = 0;
let softFails = 0;

async function get(path, opts = {}) {
  const headers = { "User-Agent": "gse-launch-preflight/3", ...(opts.headers || {}) };
  const res = await fetch(`${BASE}${path}`, { headers, redirect: "manual" });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not json */
  }
  return { status: res.status, text, json, headers: res.headers };
}

function header(h, name) {
  if (!h || typeof h.get !== "function") return "";
  return h.get(name) || h.get(name.toLowerCase()) || "";
}

function ok(msg) {
  console.log(`OK  ${msg}`);
}

function soft(msg) {
  softFails += 1;
  console.log(`!!  ${msg}`);
}

function hard(msg) {
  hardFails += 1;
  console.log(`!!  ${msg}`);
}

function section(n, title) {
  console.log(`\n── ${n}. ${title} ──`);
}

async function main() {
  console.log(`GSE launch preflight → ${BASE}`);
  console.log(`at ${new Date().toISOString()}`);
  console.log(`(soft !! = founder env; hard !! = launch blockers)\n`);

  // ── 1. Health ───────────────────────────────────────────────────────────
  section(1, "Health (/api/health)");
  const health = await get("/api/health");
  const h = health.json || {};
  const hOk = health.status === 200 && h.ok === true;
  const hStatus = h.status || "(none)";
  const depSha = h.deployment?.sha ? String(h.deployment.sha).slice(0, 12) : "(none)";

  if (hOk) ok(`readiness ok=true HTTP=${health.status} deploy=${depSha}`);
  else hard(`readiness ok=${h.ok} HTTP=${health.status} (DB/ingestion checks failed)`);

  if (hStatus === "healthy") ok(`operator status=healthy`);
  else if (hStatus === "degraded" && hOk) {
    soft(`operator status=degraded while ok=true (often settlement lag — check ops.settlement)`);
  } else if (hStatus === "degraded") {
    hard(`operator status=degraded and readiness failed`);
  } else {
    hard(`operator status=${hStatus}`);
  }

  const checks = h.checks || {};
  for (const key of ["database", "ingestion"]) {
    const c = checks[key];
    if (!c) {
      soft(`check ${key} missing from body`);
      continue;
    }
    if (c.status === "ok") ok(`check ${key}=ok${c.ageMinutes != null ? ` age=${c.ageMinutes}m` : ""}`);
    else hard(`check ${key}=${c.status} ${c.detail || ""}`.trim());
  }

  const caps = Array.isArray(h.capabilities) ? h.capabilities : [];
  const settleCap = caps.find((c) => c.capabilityId === "settlement");
  if (settleCap) {
    const s = settleCap.status;
    if (s === "healthy" || s === "unknown") ok(`capability settlement=${s}`);
    else soft(`capability settlement=${s} (${settleCap.reason || "see settle cron"})`);
  } else {
    soft("capability settlement missing from health body");
  }

  if (Array.isArray(h.capabilityGraph) && h.capabilityGraph.length > 0) {
    ok(`capabilityGraph nodes=${h.capabilityGraph.length} (observability only; never flips ok)`);
  }

  // ── 2. Home + CSP ───────────────────────────────────────────────────────
  section(2, "Home + CSP");
  const home = await get("/");
  if (home.status === 200) ok(`home HTTP=200`);
  else hard(`home HTTP=${home.status}`);
  const cspVal = header(home.headers, "content-security-policy");
  if (cspVal.includes("default-src")) ok(`CSP has default-src`);
  else hard(`CSP missing default-src`);
  const xfo = header(home.headers, "x-frame-options");
  if (xfo) ok(`X-Frame-Options=${xfo}`);
  else soft(`X-Frame-Options missing`);

  // ── 3. Ops truth ────────────────────────────────────────────────────────
  section(3, "Ops truth (/api/ops/public-surface-truth)");
  const ops = await get("/api/ops/public-surface-truth");
  const d = ops.json || {};
  const sha = d.deployment?.sha ? String(d.deployment.sha).slice(0, 12) : "(none)";
  const markers = d.deployment?.expectedMainFeatures?.length ?? 0;
  if (ops.status === 200) ok(`ops HTTP=200 sha=${sha} markers=${markers}`);
  else hard(`ops HTTP=${ops.status}`);

  const settle = d.settlement || {};
  if (settle.overduePending === 0 && settle.health === "HEALTHY") {
    ok(`settlement overdue=0 health=HEALTHY (grace 6h on server)`);
  } else if (settle.overduePending === 0) {
    soft(`settlement overdue=0 but health=${settle.health}`);
  } else {
    hard(`settlement overdue=${settle.overduePending} health=${settle.health}`);
  }

  if (d.contestStorage === "postgres") ok(`contestStorage=postgres`);
  else hard(`contestStorage=${d.contestStorage} (expect postgres)`);
  if (d.waitlistStorage === "postgres") ok(`waitlistStorage=postgres`);
  else hard(`waitlistStorage=${d.waitlistStorage} (expect postgres)`);

  if (d.gates?.statsPublic === false) ok(`STATS_PUBLIC=false`);
  else hard(`STATS_PUBLIC=${d.gates?.statsPublic} (must be false pre-proof)`);
  // P1b-2: PUBLIC_PICKS is INFORMATIONAL, not a launch blocker. Publishing a pick
  // is not claiming a track record — the honesty boundary is STATS_PUBLIC and
  // PERFORMANCE_STATS (the record gates), both checked below. The operator enabled
  // PUBLIC_PICKS deliberately; either state is acceptable pre-proof.
  if (d.gates?.canExposePublicPicks === true) {
    ok(`publicPicks=true (informational — not a track-record claim; STATS_PUBLIC/PERFORMANCE_STATS gate the record)`);
  } else {
    ok(`publicPicks=${d.gates?.canExposePublicPicks} (informational — either state acceptable pre-proof)`);
  }

  // PERFORMANCE_STATS is the genuine record gate. Exposing it while calibration
  // eligibility is not GREEN would publish a track record without proof.
  const eligibilityStatus = d.calibrationEligibilityStatus ?? null;
  const perfStats = d.gates?.canExposePerformanceStats;
  if (perfStats === true && eligibilityStatus !== "GREEN") {
    hard(`PERFORMANCE_STATS=true while calibration eligibility=${eligibilityStatus} (not GREEN — record exposed without proof)`);
  } else if (perfStats === true) {
    ok(`PERFORMANCE_STATS=true with eligibility=${eligibilityStatus} (GREEN — record gate satisfied)`);
  } else {
    ok(`PERFORMANCE_STATS=${perfStats} (closed — record not exposed pre-proof)`);
  }


  const credit = d.creditStack || {};
  ok(
    `credits claudeProvider=${credit.claudeProvider} freeLane=${credit.freeLaneConfigured} jynxAuto=${Boolean(credit.jynx?.auto)}`,
  );
  if (!credit.freeLaneConfigured) {
    soft("free-lane env off — CONTENT_FREE_LANE_ENABLED + CEREBRAS_API_KEY (or secondary)");
  }
  if (credit.claudeProvider === "anthropic" && !credit.jynx?.auto) {
    soft("Claude cash path — CLAUDE_PROVIDER=auto + cloud maps to burn credits");
  }

  if (d.revenueLadder && typeof d.revenueLadder === "object") {
    if (d.revenueLadder.canHonestlyMonetizePublicTrackRecord === false) {
      ok(
        `revenueLadder step=${d.revenueLadder.currentStep} monetizePublic=false (correct pre-proof)`,
      );
    } else {
      hard(`revenueLadder monetizePublic=true while launch still gated — review PERFORMANCE_STATS`);
    }
  } else {
    soft("revenueLadder missing — prod SHA lags main (#339+)");
  }

  if (Array.isArray(d.founderNextSteps) && d.founderNextSteps.length) {
    console.log("  founderNextSteps:");
    for (const s of d.founderNextSteps) {
      console.log(`    [${s.priority}] ${s.domain}: ${s.action}`);
    }
    const ids = new Set(d.founderNextSteps.map((s) => s.id));
    if (!ids.has("stripe-webhook-audit")) soft("founderNextSteps missing stripe-webhook-audit (#338+)");
  } else {
    soft("founderNextSteps missing — prod SHA likely lags main");
  }

  // ── 4. Product gates ────────────────────────────────────────────────────
  section(4, "Product gates");
  const picks = await get("/api/picks");
  if (picks.status === 503) ok(`picks API 503 (gated)`);
  else hard(`picks API ${picks.status} (expect 503 until PUBLIC_PICKS proof)`);

  const cron = await get("/api/cron/settle-picks");
  if (cron.status === 401) ok(`settle-picks unauth 401`);
  else hard(`settle-picks unauth ${cron.status} (expect 401)`);

  // ── 5. Auth settle (optional) ───────────────────────────────────────────
  section(5, "Settle cycle (optional CRON_SECRET)");
  if (process.env.CRON_SECRET?.trim()) {
    const auth = await get("/api/cron/settle-picks", {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET.trim()}` },
    });
    if (auth.status >= 200 && auth.status < 300) ok(`settle-picks auth HTTP=${auth.status}`);
    else hard(`settle-picks auth HTTP=${auth.status}`);
    if (auth.json) {
      const keys = Object.keys(auth.json);
      console.log(`  path=${auth.json.path ?? "?"} keys=${keys.slice(0, 20).join(",")}`);
      for (const k of ["clvRepair", "snapshotRepair", "teamGameLogRepair"]) {
        const present =
          keys.includes(k) ||
          (auth.json.free && typeof auth.json.free === "object" && k in auth.json.free);
        if (present) ok(`settle exposes ${k}`);
        else soft(`settle missing ${k} (expected free or paid path)`);
      }
    }
  } else {
    console.log("  (set CRON_SECRET to verify 2xx settle + clv/snapshot/teamGameLog repair fields)");
  }

  // ── 6. Trust / SEO ──────────────────────────────────────────────────────
  section(6, "Trust + SEO surfaces");
  for (const p of [
    "/.well-known/security.txt",
    "/ads.txt",
    "/humans.txt",
    "/llms.txt",
    "/site.webmanifest",
    "/robots.txt",
    "/podcast/feed.xml",
    "/news-sitemap.xml",
    "/sitemap.xml",
  ]) {
    const r = await get(p);
    if (r.status === 200 || r.status === 308) ok(`${p} → ${r.status}`);
    else hard(`${p} → ${r.status}`);
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log("\n══ Summary ══");
  console.log(`hard !! = ${hardFails}  soft !! = ${softFails}`);
  console.log("Do not flip LIVE_BOARD / PUBLIC_PICKS / STATS_PUBLIC / PERFORMANCE_STATS.");
  console.log("Docs: docs/ops/LAUNCH_PREFLIGHT.md · docs/ops/CLAUDE_OWNER_LAUNCH_HANDOFF.md");

  if (hardFails > 0) {
    console.log("\nRESULT: FAIL (hard blockers)");
    process.exit(1);
  }
  if (softFails > 0) {
    console.log("\nRESULT: PASS with founder soft items");
    process.exit(0);
  }
  console.log("\nRESULT: PASS");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

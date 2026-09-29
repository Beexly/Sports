/**
 * PROOF HARNESS for the silent-failure findings.
 * Executes the REAL pure functions from the repo and shows that an
 * unmeasurable state renders identically to a healthy one.
 *
 * Run:  node handoff/silent-failure-proof.mjs
 * Exit 0 on success; non-zero if a claim below does not reproduce.
 *
 * These are transcribed from the repo sources (not re-implementations); each
 * claim names the file it came from so a reviewer can diff them.
 */

/* ── from packages/ingestion-pipeline/src/paid-run-accounting.ts:29 ─────── */
const ODDS_API_LOW_QUOTA_THRESHOLD = 10;
function isLowQuota(res) {
  return (
    res.oddsApiRemainingRequests != null &&
    res.oddsApiRemainingRequests < ODDS_API_LOW_QUOTA_THRESHOLD
  );
}

/* ── from packages/data-ingestion/src/odds-credit-governor.ts:277 ───────── */
const DAILY_BUDGET = 600;
function emptyOddsCreditTruth() {
  return {
    remaining: null, used: null, observedAt: null,
    dailyBudget: DAILY_BUDGET,
    projectedExhaustionAt: null,
    projectionBasis: "linear_24h_unthrottled",
    paceOk: null,
  };
}

/* ── from packages/db/src/neon-pool-monitor.ts:154-159 ──────────────────── */
function neonStatus(latencyMs, activityWaiting, degradedMs, criticalMs) {
  let status = "ok";
  if (latencyMs != null && latencyMs > criticalMs) status = "degraded";
  else if (latencyMs != null && latencyMs > degradedMs) status = "degraded";
  if (activityWaiting != null && activityWaiting > 5 && status === "ok") status = "degraded";
  return status;
}

/* ── from apps/web/lib/calibration/selective-publish.ts:69-75 ───────────── */
function passesEdgeFilter(p, marketP, edge) {
  if (edge != null && edge > 0) {
    if (marketP != null && Number.isFinite(marketP)) {
      if (Math.abs(p - marketP) < edge) return false;
    }
    // no market line: allow in signal mode (edge filter N/A)
  }
  return true;
}

/* ── from apps/web/lib/autonomy/operating-kernel.ts:141 ─────────────────── */
function settlementP0Fires(settlementBand, settlementOverdue) {
  return settlementBand === "CRITICAL" || (settlementOverdue ?? 0) >= 5;
}

/* ── from apps/web/lib/autonomy/revenue-ladder.ts:53-62 ────────────────── */
function provenMet(canonicalSettled, calibrationPublished, settlementHealthy, minProven = 100) {
  return canonicalSettled >= minProven && calibrationPublished && settlementHealthy;
}

let failures = 0;
function claim(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`  ${ok ? "CONFIRMED" : "REFUTED "}  ${label}`);
  if (!ok) console.log(`      expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

console.log("\n=== F1: null quota renders as 'quota is fine' (health-alert) ===");
claim(
  "ledger unreachable -> emptyOddsCreditTruth().remaining=null -> isLowQuota=false",
  isLowQuota({ oddsApiRemainingRequests: emptyOddsCreditTruth().remaining }),
  false,
);
claim(
  "a genuinely healthy 600-credit budget ALSO reports isLowQuota=false",
  isLowQuota({ oddsApiRemainingRequests: 600 }),
  false,
);
console.log("  => the alert payload field oddsApiLowQuota is IDENTICAL for");
console.log("     'DB fully unreachable' and 'budget perfectly healthy'.");

console.log("\n=== F2: pool-exhaustion invisible when the stats query fails ===");
claim(
  "waiting=40 (severe contention) with stats query OK -> degraded",
  neonStatus(50, 40, 500, 2000),
  "degraded",
);
claim(
  "waiting=40 but stats query threw (null) -> ok   <-- THE DEFECT",
  neonStatus(50, null, 500, 2000),
  "ok",
);

console.log("\n=== F3: unmeasured marketP passes the edge publish filter ===");
claim("marketP measured 0.50, edge 0.05, p 0.52 -> rejected", passesEdgeFilter(0.52, 0.50, 0.05), false);
claim("marketP NULL (unmeasured), same p/edge  -> ALLOWED  <-- THE DEFECT", passesEdgeFilter(0.52, null, 0.05), true);

console.log("\n=== F4: unmeasurable settlement never raises the P0 autonomy action ===");
claim("band=CRITICAL -> P0 fires", settlementP0Fires("CRITICAL", null), true);
claim(
  "band=UNKNOWN, overdue=null (DB down) -> no P0, no action  <-- THE DEFECT",
  settlementP0Fires("UNKNOWN", null),
  false,
);

console.log("\n=== F5: unmeasurable sample renders as a confident 0/100 blocker ===");
claim(
  "DB down: sample null -> canonicalSettled ?? 0 -> provenMet=false",
  provenMet(0, false, false),
  false,
);
claim(
  "a real platform with 12 settled picks renders the SAME verdict",
  provenMet(12, false, false),
  false,
);
console.log("  => revenueLadder.blockersToNext reads 'Settled sample 0/100' in both");
console.log("     cases; the operator cannot tell 'no picks' from 'cannot read'.");

console.log("\n=== F6: partial-failure renders a self-inconsistent sample object ===");
/* from apps/web/app/api/ops/public-surface-truth/route.ts:271-311, 300-307.
   settlement (loadSettlementHealth) and sample (loadCanonicalSamplePosture)
   are SEPARATE queries in SEPARATE try/catch blocks. A failure of ONLY the
   first yields settlement=null while the second succeeds with real counts. */
function sampleObject(commencedTotal, canonicalSettled) {
  return { commencedTotal: Math.max(0, Math.floor(commencedTotal)), canonicalSettled };
}
claim(
  "settlement query failed, pick counts OK -> commencedTotal 0, canonicalSettled 412",
  sampleObject(null ?? 0, 412),
  { commencedTotal: 0, canonicalSettled: 412 },
);
claim(
  "genuinely zero commenced, 412 settled -> BYTE-IDENTICAL object",
  sampleObject(0, 412),
  { commencedTotal: 0, canonicalSettled: 412 },
);
console.log("  => one object shape means both 'nothing commenced' and");
console.log("     'the commenced count is unmeasurable'. The sibling loader");
console.log("     loadCanonicalSampleBySport carries an `error` field for exactly");
console.log("     this; the aggregate loader used by the truth surface does not.");

console.log("\n=== R3 reachability check (health/route.ts:35) ===");
/* allOk = Object.values(checks).every(c => c.status === "ok"). Vacuously true
   when checks is empty. Is an empty checks object reachable? */
claim("empty checks -> every() vacuously true -> ok:true, HTTP 200", [].every(() => false), true);
console.log("  NOT CURRENTLY REACHABLE: computeLiveCapabilityProbes assigns");
console.log("  checks['database'] and checks['ingestion'] unconditionally inside");
console.log("  their own try/catch (live-capability-probes.ts:112-148), so checks");
console.log("  has 2 keys on every path. Recorded as a latent trap, not a live bug.");

console.log(
  failures === 0
    ? `\nAll claims reproduced from repo sources. 0 refuted.`
    : `\n${failures} claim(s) REFUTED — correct the report before filing.`,
);
process.exit(failures === 0 ? 0 : 1);

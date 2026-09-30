#!/usr/bin/env node
/**
 * FIRST-100 SETTLED BRIER — the metric that decides "calibrated" vs "merely hopeful".
 * ============================================================================
 *
 * WHAT THIS IS
 * ------------
 * Pulls the real settled canonical picks out of the live database and scores
 * them through the REAL calibration code path — `runBacktestHarness`
 * (apps/web/lib/backtest/harness.ts), which itself calls `computeCalibration`
 * and the prediction engine's `brierDecomposition`. Nothing here reimplements
 * Brier, ECE, or the climatology baseline. The number this prints is the number
 * the platform would publish, computed from production rows.
 *
 * WHY IT EXISTS
 * -------------
 * The harness computes a real Brier score, but it has never actually been RUN
 * against live data: `/api/cron/backtest-calibration` is flagged off
 * (`BACKTEST_HARNESS_ENABLED !== "true"`) and absent from vercel.json's `crons`,
 * and `reports/calibration/` does not exist in the repo. So the Brier number
 * that would settle the calibration question has never been produced. This
 * script produces it, on demand, without flipping any gate.
 *
 * WHY "FIRST 100"
 * ---------------
 * 100 settled picks is `MIN_SETTLED_PICKS_FOR_LEARNING`, the platform's own
 * honest-zero floor (platform-config.ts:173). Scoring the first 100 answers the
 * narrowest question that can be answered honestly: on the earliest evidence GSE
 * actually accumulated, does the Brier score beat always-predict-the-base-rate?
 * The default also reports the FULL settled population, because a first-100 read
 * and a full-record read can disagree, and only printing the flattering one would
 * be its own kind of dishonesty.
 *
 * THE RESULT THIS PRODUCED (2026-09-30, project summer-brook-99380762)
 * --------------------------------------------------------------------
 *   first 100 settled picks : Brier 0.2790  vs  climatology 0.2491  -> LOSES by 0.0299
 *   all 2,678 settled picks  : Brier 0.2626  vs  climatology 0.2466  -> LOSES by 0.0161
 *
 * GSE's confidence score is WORSE than a forecaster that ignores the model and
 * always says the base rate. This is a real, computed, reproducible number — and
 * it is a negative finding. The correct response is to fix the probability
 * mapping, not to publish the score as a win. Note this is also consistent with
 * the repo's own pre-existing `CONFIDENCE_PROBABILITY_CAVEAT`: confidence is a
 * weighted factor score, not a calibrated win probability, and scoring it as one
 * measures the score, not the engine.
 *
 * USAGE
 * -----
 *   node scripts/calibration/first-100-settled-brier.mjs
 *   node scripts/calibration/first-100-settled-brier.mjs --limit 250
 *   node scripts/calibration/first-100-settled-brier.mjs --json
 *   DATABASE_URL=... node scripts/calibration/first-100-settled-brier.mjs
 *
 * READ-ONLY. It SELECTs and never writes. It refuses to run against a stub or
 * placeholder DATABASE_URL rather than inventing rows, and it never prints a
 * connection string.
 */

import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_LIMIT = 100;

// ---------------------------------------------------------------------------
// args
// ---------------------------------------------------------------------------
function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : fallback;
}
const LIMIT = Math.max(1, Number(arg("--limit", String(DEFAULT_LIMIT))) || DEFAULT_LIMIT);
const AS_JSON = process.argv.includes("--json");

// ---------------------------------------------------------------------------
// load the REAL harness (TypeScript + `@/` aliases) by bundling it with the
// repo's own esbuild, then importing the bundle. No reimplementation, and no
// second copy of the scoring math that could drift from the shipped one.
// ---------------------------------------------------------------------------
async function loadRealHarness() {
  const esbuildEntry = resolve(ROOT, "node_modules/esbuild/lib/main.js");
  const { build } = await import(pathToFileURL(esbuildEntry).href);
  const entry = resolve(ROOT, "apps/web/lib/backtest/harness.ts");
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    format: "esm",
    platform: "node",
    write: false,
    // node builtins only — this script never touches the network or the fs
    // through the harness, so nothing else needs to stay external.
    external: ["node:crypto"],
    alias: { "@": resolve(ROOT, "apps/web") },
    outfile: "harness-bundle.mjs",
  });
  const code = result.outputFiles[0].text;
  // Import via a data: URL so nothing is written to disk.
  const mod = await import(`data:text/javascript;base64,${Buffer.from(code, "utf8").toString("base64")}`);
  if (typeof mod.runBacktestHarness !== "function") {
    throw new Error("Bundled harness did not export runBacktestHarness — the code path changed shape.");
  }
  return { runBacktestHarness: mod.runBacktestHarness, BACKTEST_HARNESS_VERSION: mod.BACKTEST_HARNESS_VERSION };
}

// ---------------------------------------------------------------------------
// database — READ-ONLY
// ---------------------------------------------------------------------------
function databaseUrl() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url || url === "stub" || url.startsWith("changeme")) return null;
  return url;
}

/**
 * The exact population definition the shipped backtest cron route uses
 * (app/api/cron/backtest-calibration/route.ts), plus the kickoff guard the
 * public calibration report applies (C-302: a pick generated at or after
 * kickoff carries a live price that encodes part of its own outcome). Both are
 * score-integrity rules, not cosmetics — a first-100 that included look-ahead
 * rows would be a different, wrong number.
 */
const PICK_SELECT = `
  SELECT p.id, p.confidence, p.result, p."modelVersion",
         p."generatedAt", g."commenceTime"
  FROM picks p
  JOIN pick_signal_snapshots s ON s."pickId" = p.id
  JOIN games g ON g.id = p."gameId"
  WHERE p."isPublished" = true
    AND p."isBootstrap" = false
    AND p.result IN ('WIN','LOSS','PUSH')
    AND s."eligibleForLearning" = true
    AND p."modelVersion" <> 'v5.0.0-seed'
  ORDER BY p."settledAt" ASC, p.id ASC
  LIMIT $1
`;

async function fetchSettledPicks(prisma, limit) {
  const rows = await prisma.$queryRawUnsafe(PICK_SELECT, limit);
  return rows.map((r) => ({
    id: r.id,
    confidence: Number(r.confidence),
    result: r.result,
    modelVersion: r.modelVersion,
    generatedAt: r.generatedAt ? new Date(r.generatedAt).toISOString() : null,
    commenceTime: r.commenceTime ? new Date(r.commenceTime).toISOString() : null,
  }));
}

/**
 * The FIRST `n` *scored* picks, in settled order.
 *
 * The in-play (look-ahead) guard runs BEFORE the cut, not after. Applying the
 * LIMIT in SQL and dropping in-play rows afterwards silently yields fewer than
 * n picks — the first run of this script reported "first 100" as n=84, which
 * mislabels the sample and quietly changes the number. So over-fetch, filter,
 * then cut: the cohort is the first n picks that are actually scoreable.
 */
async function fetchFirstScoredPicks(prisma, n) {
  const rows = await fetchSettledPicks(prisma, Math.max(n * 3, n + 500));
  const eligible = rows.filter((r) => !isInPlay(r));
  return { picks: eligible.slice(0, n), inPlayDroppedBeforeCut: rows.length - eligible.length, scanned: rows.length };
}

/** C-302 look-ahead guard, mirrored from lib/calibration/in-play-exclusion.ts. */
function isInPlay(row) {
  if (!row.generatedAt || !row.commenceTime) return false;
  return new Date(row.generatedAt).getTime() >= new Date(row.commenceTime).getTime();
}

// ---------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------
function sha256(input) {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function pct(n) {
  return `${(n * 100).toFixed(1)}%`;
}

function line(label, value) {
  return `  ${label.padEnd(34, ".")} ${value}`;
}

const url = databaseUrl();
if (!url) {
  console.error(
    "first-100-settled-brier: DATABASE_URL is missing or a stub — refusing to invent settled picks.\n" +
      "  Set DATABASE_URL to the read-only Neon role and re-run. Nothing was scored.",
  );
  process.exit(2);
}

let prisma;
let runBacktestHarness;
let harnessVersion;
try {
  const { PrismaClient } = await import(
    pathToFileURL(resolve(ROOT, "node_modules/@prisma/client/index.js")).href
  );
  prisma = new PrismaClient({ datasources: { db: { url } } });
} catch (err) {
  console.error(`first-100-settled-brier: cannot open the database — ${err instanceof Error ? err.message : String(err)}`);
  process.exit(3);
}

try {
  ({ runBacktestHarness, BACKTEST_HARNESS_VERSION: harnessVersion } = await loadRealHarness());
} catch (err) {
  console.error(`first-100-settled-brier: cannot load the real harness — ${err instanceof Error ? err.message : String(err)}`);
  process.exit(4);
}

let rows;
let allRows;
let cohortInPlayDropped;
let cohortScanned;
try {
  const cohort = await fetchFirstScoredPicks(prisma, LIMIT);
  rows = cohort.picks;
  cohortInPlayDropped = cohort.inPlayDroppedBeforeCut;
  cohortScanned = cohort.scanned;
  // The full settled population for comparison, so the first-100 read can never
  // be presented without the whole-record context it belongs to.
  allRows = await fetchSettledPicks(prisma, 50_000);
} catch (err) {
  console.error(`first-100-settled-brier: read failed — ${err instanceof Error ? err.message : String(err)}`);
  await prisma.$disconnect().catch(() => {});
  process.exit(5);
}

const scored = (input) => {
  const inPlay = input.filter(isInPlay).length;
  const eligible = input.filter((r) => !isInPlay(r));
  // `season` is deliberately undefined: Pick/Game carry no season column and no
  // cross-sport season model exists, so the harness's season exclusion stays
  // inert rather than guessing a wrong boundary. Same posture as the cron route.
  const report = runBacktestHarness(
    eligible.map((r) => ({
      id: r.id,
      confidence: r.confidence,
      result: r.result,
      modelVersion: r.modelVersion,
      season: undefined,
    })),
    // minSampleSize = 1: this script's whole purpose is to score what exists.
    // The 100-pick floor is a PUBLICATION floor for a scheduled, unattended
    // proof; withholding the arithmetic here would defeat the request. The floor
    // is still respected where it belongs — `sufficientSample` and `status` in
    // the emitted report carry the honest below-floor state.
    { minSampleSize: 1 },
  );
  return { report, inPlay, eligibleCount: eligible.length };
};

const first = scored(rows);
const full = scored(allRows);

const inputsHash = sha256(
  JSON.stringify(rows.map((r) => [r.id, r.confidence, r.result, r.modelVersion])),
);

const payload = {
  generatedAt: new Date().toISOString(),
  harnessVersion: harnessVersion ?? null,
  codePath: "apps/web/lib/backtest/harness.ts :: runBacktestHarness (bundled from source)",
  inputsHash,
  limit: LIMIT,
  first: {
    sampleSize: first.report.coverage.settledSampleSize,
    binarySampleSize: first.report.coverage.binarySampleSize,
    excludedInPlay: first.inPlay,
    /** In-play rows dropped while assembling the cohort, BEFORE the n-cut. */
    cohortInPlayDroppedBeforeCut: cohortInPlayDropped,
    cohortScanned: cohortScanned,
    status: first.report.status,
    modelBrierScore: first.report.climatology.modelBrierScore,
    climatologyBrierScore: first.report.climatology.climatologyBrierScore,
    edgeOverClimatology: first.report.climatology.edgeOverClimatology,
    modelBeatsClimatology: first.report.climatology.modelBeatsClimatology,
    reliabilityDecomposition: first.report.reliabilityDecomposition,
    note: first.report.climatology.note,
  },
  fullPopulation: {
    sampleSize: full.report.coverage.settledSampleSize,
    excludedInPlay: full.inPlay,
    modelBrierScore: full.report.climatology.modelBrierScore,
    climatologyBrierScore: full.report.climatology.climatologyBrierScore,
    edgeOverClimatology: full.report.climatology.edgeOverClimatology,
    modelBeatsClimatology: full.report.climatology.modelBeatsClimatology,
  },
  readOnly: true,
};

if (AS_JSON) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  const f = payload.first;
  const a = payload.fullPopulation;
  console.log("");
  console.log("  GSE BRIER SCORE — computed from live settled picks");
  console.log("  " + "-".repeat(62));
  console.log(line("code path", payload.codePath));
  console.log(line("reads", "read-only SELECT; no writes"));
  console.log("");
  console.log(`  FIRST ${LIMIT} SETTLED PICKS`);
  console.log(line("settled sample (n)", String(f.sampleSize)));
  console.log(line("in-play skipped assembling cohort", String(f.cohortInPlayDroppedBeforeCut)));
  console.log(line("MODEL Brier", f.modelBrierScore === null ? "not computed" : f.modelBrierScore.toFixed(4)));
  console.log(line("CLIMATOLOGY Brier (base rate)", f.climatologyBrierScore === null ? "not computed" : f.climatologyBrierScore.toFixed(4)));
  console.log(line("edge over climatology", f.edgeOverClimatology === null ? "n/a" : f.edgeOverClimatology.toFixed(4)));
  console.log(line("model beats climatology?", String(f.modelBeatsClimatology)));
  if (f.reliabilityDecomposition) {
    console.log(line("base rate (observed)", pct(f.reliabilityDecomposition.baseRate)));
    console.log(line("reliability", f.reliabilityDecomposition.reliability.toFixed(4)));
    console.log(line("resolution", f.reliabilityDecomposition.resolution.toFixed(4)));
    console.log(line("uncertainty", f.reliabilityDecomposition.uncertainty.toFixed(4)));
  }
  console.log("");
  console.log(`  ALL SETTLED PICKS (context, not a substitute)`);
  console.log(line("settled sample (n)", String(a.sampleSize)));
  console.log(line("MODEL Brier", a.modelBrierScore === null ? "not computed" : a.modelBrierScore.toFixed(4)));
  console.log(line("CLIMATOLOGY Brier", a.climatologyBrierScore === null ? "not computed" : a.climatologyBrierScore.toFixed(4)));
  console.log(line("edge over climatology", a.edgeOverClimatology === null ? "n/a" : a.edgeOverClimatology.toFixed(4)));
  console.log(line("model beats climatology?", String(a.modelBeatsClimatology)));
  console.log("");
  console.log(`  VERDICT: ${f.modelBeatsClimatology === false ? "NEGATIVE" : f.modelBeatsClimatology === true ? "POSITIVE" : "NOT COMPUTED"}`);
  console.log(`  ${f.note}`);
  console.log("");
  console.log(line("inputs hash (SHA-256)", inputsHash.slice(0, 32) + "..."));
  console.log("");
}

await prisma.$disconnect().catch(() => {});

#!/usr/bin/env node
/**
 * fit-and-validate.mjs — Workstream A1: offline calibration FIT + held-out VALIDATION harness.
 *
 * This is the offline counterpart to docs/path-to-70.md §7 step 2 ("Fit & validate
 * offline"). It answers exactly one question, honestly: do we yet have enough real,
 * settled, canonical, learning-eligible picks to fit a calibration map that does NOT
 * make calibration worse on data it has never seen?
 *
 * It is ANALYSIS ONLY. It:
 *   - is strictly READ-ONLY on the database (a single SELECT, no writes, ever);
 *   - does NOT mutate any row, never sets `eligibleForLearning`, never relabels picks;
 *   - does NOT bump MODEL_VERSION, does NOT flip CALIBRATION_ADJUSTMENTS_ENABLED or any
 *     other gate, and does NOT touch the live scoring/display path;
 *   - imports the SAME calibration math the engine uses (`buildCalibrator`, ECE, Brier,
 *     reliability/calibration curves) so the numbers it prints match what activation
 *     would actually do.
 *
 * Activating calibration is a SEPARATE, OWNER-GATED step (a reviewed MODEL_VERSION bump
 * + a CalibrationProposal under docs/calibration-proposals/ + the gate flip in
 * readiness.ts/platform-config.ts). This harness produces the evidence that step
 * requires; it never takes that step. See docs/calibration-proposals/README.md.
 *
 * ── How to run ──────────────────────────────────────────────────────────────
 *
 *   DATABASE_URL=postgres://... npx tsx scripts/calibration/fit-and-validate.mjs
 *
 * Optional flags:
 *   --min=<n>      override the calibrator min-sample floor (default: the engine's
 *                  DEFAULT_MIN_CALIBRATION_SAMPLE). Lower it ONLY for local dry-runs;
 *                  the real activation gate is the engine constant.
 *   --folds=<k>    k-fold cross-validation instead of a single time-ordered split
 *                  (default: a single chronological 70/30 holdout).
 *   --bins=<n>     ECE / reliability bin count (default 10, matching the engine).
 *
 * It is run with `npx tsx` (not bare node) because it imports the prediction-engine
 * TypeScript source directly — exactly like scripts/free-ingest-smoke.mjs. `node
 * --check` still parses it for syntax; tsx executes it.
 *
 * If DATABASE_URL is unset or the DB is unreachable, it prints a clear message and
 * exits 0 — accumulation has simply not happened in this environment, which is not an
 * error.
 */

import process from "node:process";

// Calibration math — imported from the engine source so this harness scores picks
// with the IDENTICAL code that activation would use. Relative .ts imports are resolved
// by tsx (see scripts/free-ingest-smoke.mjs for the same pattern).
import {
  buildCalibrator,
  DEFAULT_MIN_CALIBRATION_SAMPLE,
} from "../../packages/prediction-engine/src/calibration-apply.ts";
import {
  expectedCalibrationError,
  brierDecomposition,
  reliabilityCurve,
} from "../../packages/prediction-engine/src/probability-calibration.ts";
import { calibrationCurve } from "../../packages/prediction-engine/src/performance-analytics.ts";

// ── tiny arg parser ──────────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    const m = /^--([\w-]+)=(.*)$/.exec(a);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const MIN_SAMPLE = args.min != null ? Math.max(1, Number(args.min)) : DEFAULT_MIN_CALIBRATION_SAMPLE;
const FOLDS = args.folds != null ? Math.max(2, Math.floor(Number(args.folds))) : null;
const BINS = args.bins != null ? Math.max(2, Math.floor(Number(args.bins))) : 10;

const out = (s = "") => process.stdout.write(s + "\n");

// ── DB read (READ-ONLY) ────────────────────────────────────────────────────────

/**
 * Pull the REAL settled, canonical, learning-eligible picks as (confidence, outcome)
 * pairs. The eligibility predicate mirrors EXACTLY what
 * packages/ingestion-pipeline/src/settle-sport.ts stamps at settlement time:
 *
 *   eligibleForLearning === true   — settlement only sets this when
 *                                    canLearnFromOutcomes && !isBootstrap && decisive,
 *   AND isBootstrap = false         — canonical (re-asserted defensively),
 *   AND settlementResult IN ('WIN','LOSS')
 *                                   — decisive AND binary. PUSH is decisive for
 *                                     settlement but has no binary win/loss outcome,
 *                                     so it is excluded from calibration samples
 *                                     (CalibrationSample.y is strictly 0|1, matching
 *                                     probability-calibration.ts).
 *
 * Ordered by settledAt so a chronological holdout split is honest (train on the past,
 * validate on the future). Returns `null` on any DB unavailability (caller exits 0).
 */
async function loadEligibleSamples() {
  if (!process.env.DATABASE_URL) {
    out("DATABASE_URL is not set — no settled sample to read in this environment.");
    out("This is expected outside production; accumulation happens there. Exiting cleanly.");
    return null;
  }

  let pg;
  try {
    pg = await import("pg");
  } catch {
    out("`pg` is not installed — cannot read the settled sample. Run `npm install pg`.");
    out("Treating as no-sample (not an error). Exiting cleanly.");
    return null;
  }

  const client = new pg.default.Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
  } catch (err) {
    out(`Database unreachable: ${err instanceof Error ? err.message : String(err)}`);
    out("Cannot read the settled sample. Exiting cleanly (this is not a harness failure).");
    try { await client.end(); } catch { /* ignore */ }
    return null;
  }

  try {
    // STRICTLY READ-ONLY. One SELECT. No write of any kind.
    const res = await client.query(
      `SELECT "confidenceAtPrediction" AS confidence,
              "settlementResult"       AS result,
              "settledAt"              AS settled_at
         FROM pick_signal_snapshots
        WHERE "eligibleForLearning" = true
          AND "isBootstrap" = false
          AND "settlementResult" IN ('WIN','LOSS')
          AND "confidenceAtPrediction" IS NOT NULL
        ORDER BY "settledAt" ASC NULLS LAST, "capturedAt" ASC`,
    );

    // Map to engine CalibrationSample shape: p in [0,1], y in {0,1}.
    const samples = [];
    for (const r of res.rows) {
      const c = Number(r.confidence);
      if (!Number.isFinite(c)) continue;
      samples.push({ p: Math.max(0, Math.min(1, c / 100)), y: r.result === "WIN" ? 1 : 0 });
    }
    return samples;
  } catch (err) {
    out(`Query failed: ${err instanceof Error ? err.message : String(err)}`);
    out("Cannot read the settled sample. Exiting cleanly (this is not a harness failure).");
    return null;
  } finally {
    try { await client.end(); } catch { /* ignore */ }
  }
}

// ── validation helpers (use the engine's own math) ──────────────────────────────

/** Apply a fitted isotonic calibrator's map to a held-out sample, returning new samples. */
function applyCalibratorToSamples(calibrator, samples) {
  // calibrator.apply expects a 0–100 confidence; our samples carry p in [0,1].
  return samples.map((s) => ({ p: calibrator.apply(s.p * 100).probability, y: s.y }));
}

/** Convert CalibrationSample[] (p,y) → SettledPickRecord[] for calibrationCurve(). */
function toReliabilityRecords(samples) {
  return samples.map((s) => ({
    sport: "all",
    pickType: "all",
    modelProb: s.p,
    won: s.y === 1,
  }));
}

function fmt(x, d = 4) {
  return Number.isFinite(x) ? x.toFixed(d) : "n/a";
}

/** Print a reliability table from the engine's calibrationCurve(). */
function printReliability(label, samples) {
  out(`  ${label} reliability (predicted bucket → observed win rate):`);
  const curve = calibrationCurve(toReliabilityRecords(samples));
  if (curve.length === 0) {
    out("    (no populated buckets)");
    return;
  }
  for (const b of curve) {
    out(
      `    ${b.label.padStart(8)}  n=${String(b.count).padStart(5)}` +
        `  predMid=${fmt(b.predictedMid, 3)}  observed=${fmt(b.actualWinRate, 3)}`,
    );
  }
}

// ── splits ───────────────────────────────────────────────────────────────────

/** Chronological 70/30 holdout (data already ordered by settledAt). */
function chronoSplit(samples) {
  const cut = Math.floor(samples.length * 0.7);
  return [{ train: samples.slice(0, cut), test: samples.slice(cut) }];
}

/** k-fold: fold i is the test set; the rest is train. Order-preserving partition. */
function kFoldSplits(samples, k) {
  const folds = Array.from({ length: k }, () => []);
  samples.forEach((s, i) => folds[i % k].push(s));
  return folds.map((test, i) => ({
    train: folds.filter((_, j) => j !== i).flat(),
    test,
  }));
}

// ── main ───────────────────────────────────────────────────────────────────────

async function main() {
  out("");
  out("=== Calibration fit + held-out validation (Workstream A1) ===");
  out("READ-ONLY analysis. No model change, no gate flip, no data relabeling.");
  out("");

  const samples = await loadEligibleSamples();
  if (samples === null) {
    // DB unavailable / unreachable / pg missing — already explained. Clean exit.
    process.exit(0);
  }

  const N = samples.length;
  out(`Eligible sample size N = ${N}`);
  out(
    "  (settled + canonical (isBootstrap=false) + learning-eligible " +
      "(eligibleForLearning=true) + decisive WIN/LOSS — same predicate as settle-sport.ts)",
  );
  out(`Calibrator min-sample floor = ${MIN_SAMPLE}` +
      (args.min != null ? "  [overridden via --min]" : "  [engine DEFAULT_MIN_CALIBRATION_SAMPLE]"));
  out("");

  if (N < MIN_SAMPLE) {
    out(
      `calibrator self-suppresses at ${N}/${MIN_SAMPLE} — not enough eligible picks; ` +
        "accumulation required (this is expected and honest).",
    );
    out("");
    out("No fit performed. Re-run once the settled, canonical, learning-eligible sample grows.");
    process.exit(0);
  }

  // ── In-sample (whole dataset) reference numbers ─────────────────────────────
  const fullCal = buildCalibrator(samples, { minSample: MIN_SAMPLE });
  const fullBrier = brierDecomposition(samples, BINS);

  out("── In-sample (fit and scored on the SAME data — optimistic, reference only) ──");
  out(`  isActive          : ${fullCal.isActive}${fullCal.isActive ? "" : `  (reason: ${fullCal.inactiveReason})`}`);
  out(`  rawEce            : ${fmt(fullCal.rawEce)}`);
  out(`  calibratedEce     : ${fmt(fullCal.calibratedEce)}`);
  out(`  Brier (raw)       : ${fmt(fullBrier.brier)}  (reliability=${fmt(fullBrier.reliability)}, resolution=${fmt(fullBrier.resolution)}, base=${fmt(fullBrier.baseRate)})`);
  out("");

  // ── Held-out validation (the number that actually matters) ───────────────────
  const splits = FOLDS ? kFoldSplits(samples, FOLDS) : chronoSplit(samples);
  const splitLabel = FOLDS ? `${FOLDS}-fold cross-validation` : "chronological 70/30 holdout";
  out(`── HELD-OUT validation (${splitLabel}) ──`);

  let aggRawEce = 0;
  let aggCalEce = 0;
  let aggRawBrier = 0;
  let aggCalBrier = 0;
  let aggTestN = 0;
  let usableSplits = 0;

  splits.forEach((split, idx) => {
    const { train, test } = split;
    if (test.length === 0) return;

    // Fit on TRAIN only. minSample:1 here so the held-out map is always produced —
    // the *activation* min-sample gate is enforced separately on full N above. We are
    // measuring generalization of the fitted map, not re-litigating the floor per fold.
    const cal = buildCalibrator(train, { minSample: 1 });

    const rawTestEce = expectedCalibrationError(test, BINS);
    const calTest = applyCalibratorToSamples(cal, test);
    const calTestEce = expectedCalibrationError(calTest, BINS);
    const rawTestBrier = brierDecomposition(test, BINS).brier;
    const calTestBrier = brierDecomposition(calTest, BINS).brier;

    out("");
    out(`  Split ${idx + 1}: train n=${train.length}, test n=${test.length}`);
    out(`    HELD-OUT rawEce        : ${fmt(rawTestEce)}`);
    out(`    HELD-OUT calibratedEce : ${fmt(calTestEce)}`);
    out(`    HELD-OUT Brier (raw)   : ${fmt(rawTestBrier)}`);
    out(`    HELD-OUT Brier (calib) : ${fmt(calTestBrier)}`);

    // sample-weighted aggregation
    aggRawEce += rawTestEce * test.length;
    aggCalEce += calTestEce * test.length;
    aggRawBrier += rawTestBrier * test.length;
    aggCalBrier += calTestBrier * test.length;
    aggTestN += test.length;
    usableSplits += 1;
  });

  out("");
  if (aggTestN === 0 || usableSplits === 0) {
    out("No usable held-out test partition could be formed. Cannot validate.");
    out("VERDICT: INSUFFICIENT — accumulate more eligible picks and re-run.");
    process.exit(0);
  }

  const heldRawEce = aggRawEce / aggTestN;
  const heldCalEce = aggCalEce / aggTestN;
  const heldRawBrier = aggRawBrier / aggTestN;
  const heldCalBrier = aggCalBrier / aggTestN;

  out("── HELD-OUT aggregate (sample-weighted across test partitions) ──");
  out(`  rawEce            : ${fmt(heldRawEce)}`);
  out(`  calibratedEce     : ${fmt(heldCalEce)}`);
  out(`  Brier (raw)       : ${fmt(heldRawBrier)}`);
  out(`  Brier (calibrated): ${fmt(heldCalBrier)}`);
  out("");

  // Reliability curve from the engine, on the full eligible sample (raw forecasts).
  printReliability("Full-sample (raw)", samples);
  out("");

  // ── The verdict line ─────────────────────────────────────────────────────────
  const pass = heldCalEce <= heldRawEce;
  out(
    `HELD-OUT: calibratedEce (${fmt(heldCalEce)}) <= rawEce (${fmt(heldRawEce)}) ? ` +
      `${pass ? "PASS" : "FAIL"}`,
  );
  out("");
  if (pass) {
    out("PASS means the fitted map does NOT worsen calibration on data it never saw.");
    out("This is EVIDENCE FOR — not authorization OF — a calibration activation.");
    out("Activation remains a separate OWNER-GATED step: MODEL_VERSION bump + a");
    out("CalibrationProposal (docs/calibration-proposals/TEMPLATE.md) + the gate flip.");
    out("Nothing was changed by running this script.");
  } else {
    out("FAIL means the fitted map worsens held-out calibration. Do NOT activate.");
    out("Accumulate more eligible picks and/or revisit the model before re-running.");
  }
  out("");

  process.exit(0);
}

main().catch((err) => {
  // Never crash hard on operational issues; surface and exit non-zero only on a true
  // programming error so CI can catch regressions. DB problems are handled above with
  // exit 0.
  process.stderr.write(`Unexpected harness error: ${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});

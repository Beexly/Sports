#!/usr/bin/env node
/**
 * generate-calibration-report — the calibration gate runs itself (B-04).
 *
 * Reads settled, published, non-bootstrap picks from the database and writes
 * `_launch/CALIBRATION_REPORT.md` with:
 *   - Brier score (overall + per sport + trended over time windows)
 *   - bucketed calibration curves (predicted vs actual, per-bucket sample sizes)
 *   - comparison vs closing-line implied probability + CLV-positive rate
 *     (only when ClosingLine/clv data exists — degrades honestly when absent)
 *   - total sample size with a Wilson 95% CI on the hit rate
 *   - the >=150-graded-picks eligibility gate
 *   - a PLAIN-ENGLISH VERDICT: "Good enough to charge money? Yes / Not yet,
 *     because..." — never softened. When the sample is 0 (today) the report
 *     says exactly that and lists what unblocks it (GA-01/GA-02).
 *
 * CALIBRATION MATH — mirrors apps/web/lib/calibration/compute.ts EXACTLY
 * (buckets, expected-from-confidence clamp, PUSH=0.5 outcome, rounding).
 * Importing app TS into a plain-node .mjs script is awkward, so the math is
 * mirrored here and PINNED by a parity test against the lib on a fixture:
 * apps/web/__tests__/calibration-report-generator.test.ts. If you change the
 * lib, that test fails until this mirror is updated (and vice versa).
 *
 * SAMPLE FILTER (mirrors the canonical public-surface query in
 * apps/web/lib/calibration/report.ts): result in WIN/LOSS/PUSH,
 * isPublished=true, isBootstrap=false, seed model (v5.0.0-seed) excluded.
 * Deviation, on purpose: the public surface additionally requires
 * signalSnapshot.eligibleForLearning=true (gated by OUTCOME_LEARNING_ENABLED).
 * The LAUNCH gate counts every honestly graded published canonical pick — a
 * config flag must not be able to inflate or starve the 150-pick gate.
 *
 * SAFETY / HONESTY:
 *   - Stub-safe: no DATABASE_URL → writes the honest zero-sample report, exit 0.
 *   - DB configured but unreachable → writes an honest "cannot measure" report
 *     (it does NOT claim sample=0 as truth), exit 0.
 *   - Never throws into settlement: the data-refresh worker invokes this as an
 *     isolated child process after settleResults(), fully non-fatal.
 *   - Reads picks only. Writes one markdown file. No DB writes, no model
 *     changes, no MODEL_VERSION involvement.
 *
 * Usage (from repo root):
 *   node scripts/generate-calibration-report.mjs
 *   npm run calibration:report
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// ============================================================
// Gate policy constants (exported so tests pin the thresholds)
// ============================================================

/** Launch gate: minimum graded (WIN/LOSS/PUSH) canonical picks before the verdict can be YES. */
export const CALIBRATION_GATE_MIN_SAMPLE = 150;
/** Break-even hit rate at standard -110 vig: 110/210 ≈ 52.38%. */
export const BREAK_EVEN_HIT_RATE = 110 / 210;
/** Brier must be strictly below this. 0.25 = an uninformative coin saying 50% every time. */
export const MAX_ACCEPTABLE_BRIER = 0.25;
/** Mirrors MIN_BUCKET_SAMPLE in apps/web/lib/calibration/compute.ts. */
export const MIN_BUCKET_SAMPLE = 30;
/** Mirrors PROPOSAL_DELTA in apps/web/lib/calibration/compute.ts — material bucket drift. */
export const BUCKET_DRIFT_BLOCK = 0.12;
/** z for the 95% Wilson interval. */
const WILSON_Z = 1.96;
/** Seed-model picks are demo data and must never count toward the gate. */
const SEED_MODEL_VERSION = "v5.0.0-seed";

/** Confidence buckets — mirrors BUCKETS in apps/web/lib/calibration/compute.ts. */
const BUCKETS = [
  { label: "50-59", min: 50, max: 59 },
  { label: "60-69", min: 60, max: 69 },
  { label: "70-79", min: 70, max: 79 },
  { label: "80-89", min: 80, max: 89 },
  { label: "90-100", min: 90, max: 100 },
];

// ============================================================
// Mirrored calibration math (parity-pinned against compute.ts)
// ============================================================

/** Mirrors round() in compute.ts. */
export function round(value, digits = 3) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

/** Mirrors expectedFromConfidence() in compute.ts. */
export function expectedFromConfidence(confidence) {
  return Math.max(0.01, Math.min(0.99, confidence / 100));
}

/** Mirrors resultToOutcome() in compute.ts: WIN=1, LOSS=0, PUSH=0.5, else null. */
export function resultToOutcome(result) {
  if (result === "WIN") return 1;
  if (result === "LOSS") return 0;
  if (result === "PUSH") return 0.5;
  return null;
}

/** Mirrors bucketFor() in compute.ts. */
function bucketFor(confidence) {
  return BUCKETS.find((bucket) => confidence >= bucket.min && confidence <= bucket.max) ?? BUCKETS[0];
}

/**
 * Mirrors computeCalibration() in compute.ts (buckets + overall Brier;
 * proposals are the lib's job and are not duplicated here).
 * @param {Array<{confidence:number, result:string}>} picks
 */
export function computeBuckets(picks) {
  const settled = picks
    .map((pick) => ({ pick, outcome: resultToOutcome(pick.result) }))
    .filter((entry) => entry.outcome !== null);

  const buckets = [];
  for (const bucket of BUCKETS) {
    const rows = settled.filter(({ pick }) => bucketFor(pick.confidence).label === bucket.label);
    if (rows.length === 0) {
      buckets.push({
        label: bucket.label,
        confidenceMin: bucket.min,
        confidenceMax: bucket.max,
        sampleSize: 0,
        observedWinRate: 0,
        expectedWinRate: round((bucket.min + bucket.max) / 200),
        delta: 0,
        brierScore: 0,
      });
      continue;
    }

    const observed = rows.reduce((sum, row) => sum + row.outcome, 0) / rows.length;
    const expected =
      rows.reduce((sum, row) => sum + expectedFromConfidence(row.pick.confidence), 0) / rows.length;
    const brier =
      rows.reduce((sum, row) => {
        const expectedProb = expectedFromConfidence(row.pick.confidence);
        return sum + (expectedProb - row.outcome) ** 2;
      }, 0) / rows.length;

    buckets.push({
      label: bucket.label,
      confidenceMin: bucket.min,
      confidenceMax: bucket.max,
      sampleSize: rows.length,
      observedWinRate: round(observed),
      expectedWinRate: round(expected),
      delta: round(observed - expected),
      brierScore: round(brier),
    });
  }

  const brierScore =
    settled.length > 0
      ? round(
          settled.reduce((sum, row) => {
            const expectedProb = expectedFromConfidence(row.pick.confidence);
            return sum + (expectedProb - row.outcome) ** 2;
          }, 0) / settled.length
        )
      : null;

  return { buckets, sampleSize: settled.length, brierScore };
}

// ============================================================
// Pure statistics helpers
// ============================================================

/**
 * Wilson score interval on a binomial proportion. Returns null when n=0
 * (no data → no interval, never a fabricated one).
 * @returns {{ lower:number, upper:number, point:number } | null}
 */
export function wilsonInterval(successes, trials, z = WILSON_Z) {
  if (!Number.isFinite(trials) || trials <= 0) return null;
  const p = successes / trials;
  const z2 = z * z;
  const denom = 1 + z2 / trials;
  const center = (p + z2 / (2 * trials)) / denom;
  const halfWidth = (z * Math.sqrt(p * (1 - p) / trials + z2 / (4 * trials * trials))) / denom;
  return {
    lower: Math.max(0, center - halfWidth),
    upper: Math.min(1, center + halfWidth),
    point: p,
  };
}

/** American odds → implied probability (vig included; single-side, not de-vigged). */
export function americanToImpliedProb(price) {
  if (price === null || price === undefined || !Number.isFinite(price) || price === 0) return null;
  return price > 0 ? 100 / (price + 100) : -price / (-price + 100);
}

/** Win/loss/push tally + decisive hit rate (pushes excluded, stated in the report). */
export function tallyResults(picks) {
  let wins = 0;
  let losses = 0;
  let pushes = 0;
  for (const pick of picks) {
    if (pick.result === "WIN") wins++;
    else if (pick.result === "LOSS") losses++;
    else if (pick.result === "PUSH") pushes++;
  }
  const decisive = wins + losses;
  return { wins, losses, pushes, decisive, hitRate: decisive > 0 ? wins / decisive : null };
}

/** Overall Brier for a pick subset (null when empty) — same math as computeBuckets. */
function brierFor(picks) {
  const rows = picks
    .map((pick) => ({ pick, outcome: resultToOutcome(pick.result) }))
    .filter((entry) => entry.outcome !== null);
  if (rows.length === 0) return null;
  return round(
    rows.reduce((sum, { pick, outcome }) => sum + (expectedFromConfidence(pick.confidence) - outcome) ** 2, 0) /
      rows.length
  );
}

/** Per-sport Brier/hit-rate breakdown, largest samples first. */
export function sportBreakdown(picks) {
  const bySport = new Map();
  for (const pick of picks) {
    const sport = pick.sport ?? "unknown";
    if (!bySport.has(sport)) bySport.set(sport, []);
    bySport.get(sport).push(pick);
  }
  return [...bySport.entries()]
    .map(([sport, rows]) => {
      const tally = tallyResults(rows);
      return { sport, sampleSize: rows.length, brierScore: brierFor(rows), ...tally };
    })
    .sort((a, b) => b.sampleSize - a.sampleSize);
}

/**
 * Brier trended over trailing windows (by settledAt). Picks without a
 * settledAt timestamp count only in "All time" — noted in the report.
 */
export function windowBreakdown(picks, now) {
  const windows = [
    { label: "All time", days: null },
    { label: "Last 90 days", days: 90 },
    { label: "Last 30 days", days: 30 },
    { label: "Last 14 days", days: 14 },
  ];
  return windows.map(({ label, days }) => {
    const rows =
      days === null
        ? picks
        : picks.filter(
            (pick) =>
              pick.settledAt instanceof Date &&
              now.getTime() - pick.settledAt.getTime() <= days * 24 * 60 * 60 * 1000
          );
    const tally = tallyResults(rows);
    return { label, sampleSize: rows.length, brierScore: brierFor(rows), ...tally };
  });
}

/**
 * Closing-line comparison. Degrades honestly: every field is null when the
 * underlying CLV/closing data does not exist (it does not today — S-01).
 *   - clvPositiveRate: share of picks with computed CLV that beat the close.
 *   - moneyline model-vs-close Brier: on MONEYLINE picks that carry a
 *     closingPrice, compare our confidence Brier against the Brier of the
 *     closing implied probability (vig included, single side) on the SAME picks.
 */
export function clvSummary(picks) {
  const withClv = picks.filter((pick) => pick.clvPositive === true || pick.clvPositive === false);
  const clvPositive = withClv.filter((pick) => pick.clvPositive === true).length;

  const mlRows = picks
    .map((pick) => ({
      outcome: resultToOutcome(pick.result),
      modelProb: expectedFromConfidence(pick.confidence),
      closeProb: pick.pickType === "MONEYLINE" ? americanToImpliedProb(pick.closingPrice) : null,
    }))
    .filter((row) => row.outcome !== null && row.closeProb !== null);

  const mean = (rows, key) => rows.reduce((sum, row) => sum + (row[key] - row.outcome) ** 2, 0) / rows.length;

  return {
    clvSampleSize: withClv.length,
    clvPositiveCount: clvPositive,
    clvPositiveRate: withClv.length > 0 ? clvPositive / withClv.length : null,
    moneylineComparisonSample: mlRows.length,
    moneylineModelBrier: mlRows.length > 0 ? round(mean(mlRows, "modelProb")) : null,
    moneylineCloseBrier: mlRows.length > 0 ? round(mean(mlRows, "closeProb")) : null,
  };
}

// ============================================================
// Verdict — plain English, never softened
// ============================================================

const UNBLOCK_LIST = [
  "**GA-01** — provision the production Postgres (~15 min; migrate-in-build applies the schema automatically).",
  "**GA-02** — fix/pay The Odds API key (~15 min; no live odds = no picks = no sample).",
  `Then ~3-6 weeks of daily generate->settle accumulation to reach the ${CALIBRATION_GATE_MIN_SAMPLE}-graded-pick gate (the one clock nobody can compress).`,
];

function formatPct(value, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

/**
 * The plain-English gate decision. Pure — fully unit-testable.
 * @param {{
 *   dataStatus: "live"|"stub"|"unreachable",
 *   dbErrorMessage?: string|null,
 *   sampleSize: number,
 *   brierScore: number|null,
 *   hitRateCi: { lower:number, upper:number, point:number } | null,
 *   buckets: Array<{label:string, sampleSize:number, delta:number}>,
 * }} model
 * @returns {{ ready: boolean, line: string, unblockedBy: string[] }}
 */
export function buildVerdict(model) {
  const { dataStatus, dbErrorMessage, sampleSize, brierScore, hitRateCi, buckets } = model;

  if (dataStatus === "stub") {
    return {
      ready: false,
      line:
        "**Good enough to charge money? Not yet, because there is no calibration sample at all — 0 graded picks.** " +
        "No database is configured (stub mode), so the pipeline has never settled a published canonical pick. " +
        "Nothing here is a judgment on the model; there is simply nothing to judge yet.",
      unblockedBy: UNBLOCK_LIST,
    };
  }

  if (dataStatus === "unreachable") {
    return {
      ready: false,
      line:
        "**Good enough to charge money? Not yet, because the calibration sample cannot be read.** " +
        `DATABASE_URL is set but the database was unreachable (${dbErrorMessage ?? "unknown error"}). ` +
        "This report refuses to claim a zero sample as truth when it simply could not look.",
      unblockedBy: [
        "Restore database connectivity, then re-run `npm run calibration:report`.",
        ...UNBLOCK_LIST,
      ],
    };
  }

  if (sampleSize === 0) {
    return {
      ready: false,
      line:
        "**Good enough to charge money? Not yet, because there is no calibration sample at all — 0 graded picks.** " +
        "The database is reachable but contains no settled, published, non-bootstrap picks. " +
        "The pipeline has not yet graded a single canonical pick.",
      unblockedBy: UNBLOCK_LIST,
    };
  }

  const reasons = [];

  if (sampleSize < CALIBRATION_GATE_MIN_SAMPLE) {
    reasons.push(
      `the sample is ${sampleSize} of the ${CALIBRATION_GATE_MIN_SAMPLE} graded picks the eligibility gate requires — ` +
        "any hit rate quoted on a sample this small is noise, not evidence"
    );
  }

  if (brierScore === null || !(brierScore < MAX_ACCEPTABLE_BRIER)) {
    reasons.push(
      `the Brier score (${brierScore === null ? "n/a" : brierScore.toFixed(3)}) is not below ${MAX_ACCEPTABLE_BRIER} — ` +
        "the model is not measurably better than an uninformative coin"
    );
  }

  if (hitRateCi === null) {
    reasons.push("no decisive (win/loss) picks exist, so the hit rate has no confidence interval at all");
  } else if (hitRateCi.lower < BREAK_EVEN_HIT_RATE) {
    reasons.push(
      `the 95% lower bound on the hit rate (${formatPct(hitRateCi.lower)}) does not clear the -110 break-even ` +
        `(${formatPct(BREAK_EVEN_HIT_RATE)}) — we cannot rule out that a paying customer loses money`
    );
  }

  const driftingBuckets = buckets.filter(
    (bucket) => bucket.sampleSize >= MIN_BUCKET_SAMPLE && Math.abs(bucket.delta) >= BUCKET_DRIFT_BLOCK
  );
  if (driftingBuckets.length > 0) {
    reasons.push(
      `confidence bucket(s) ${driftingBuckets.map((b) => b.label).join(", ")} drift >=${BUCKET_DRIFT_BLOCK} ` +
        "between predicted and actual — the stated confidence numbers would be misleading customers"
    );
  }

  if (reasons.length === 0) {
    return {
      ready: true,
      line:
        "**Good enough to charge money? Yes.** " +
        `${sampleSize} graded picks clear the ${CALIBRATION_GATE_MIN_SAMPLE}-pick gate; ` +
        `Brier ${brierScore.toFixed(3)} beats the ${MAX_ACCEPTABLE_BRIER} uninformative baseline; ` +
        `the 95% lower bound on the hit rate (${formatPct(hitRateCi.lower)}) clears the -110 break-even ` +
        `(${formatPct(BREAK_EVEN_HIT_RATE)}); and no confidence bucket with >=${MIN_BUCKET_SAMPLE} picks ` +
        `drifts >=${BUCKET_DRIFT_BLOCK} from its stated confidence. The wire-in of any pricing change remains a founder decision.`,
      unblockedBy: [],
    };
  }

  return {
    ready: false,
    line: `**Good enough to charge money? Not yet, because** ${reasons.join("; and ")}.`,
    unblockedBy: sampleSize < CALIBRATION_GATE_MIN_SAMPLE ? UNBLOCK_LIST : [],
  };
}

// ============================================================
// Report rendering
// ============================================================

function fmt(value, digits = 3) {
  return value === null || value === undefined ? "—" : value.toFixed(digits);
}

function fmtPctOrDash(value, digits = 1) {
  return value === null || value === undefined ? "—" : formatPct(value, digits);
}

/**
 * Builds the full markdown report from already-loaded picks. Pure.
 * @param {{
 *   picks: Array<{
 *     confidence:number, result:string, sport?:string|null, pickType?:string|null,
 *     settledAt?:Date|null, clvPositive?:boolean|null, closingPrice?:number|null,
 *   }>,
 *   dataStatus: "live"|"stub"|"unreachable",
 *   dbErrorMessage?: string|null,
 *   now: Date,
 * }} input
 */
export function buildReport({ picks, dataStatus, dbErrorMessage = null, now }) {
  const { buckets, sampleSize, brierScore } = computeBuckets(picks);
  const tally = tallyResults(picks);
  const hitRateCi = tally.decisive > 0 ? wilsonInterval(tally.wins, tally.decisive) : null;
  const verdict = buildVerdict({ dataStatus, dbErrorMessage, sampleSize, brierScore, hitRateCi, buckets });
  const sports = sportBreakdown(picks);
  const windows = windowBreakdown(picks, now);
  const clv = clvSummary(picks);
  const gateMet = sampleSize >= CALIBRATION_GATE_MIN_SAMPLE;
  const missingSettledAt = picks.filter((pick) => !(pick.settledAt instanceof Date)).length;

  const statusLabel =
    dataStatus === "stub"
      ? "STUB — no DATABASE_URL configured; no database was read"
      : dataStatus === "unreachable"
        ? `DB UNREACHABLE — DATABASE_URL set but the read failed (${dbErrorMessage ?? "unknown error"})`
        : "LIVE — read from the configured database";

  const lines = [];
  lines.push("# CALIBRATION REPORT — the gate that decides if GSE can charge money");
  lines.push("");
  lines.push("> AUTO-GENERATED by `scripts/generate-calibration-report.mjs` — do not hand-edit.");
  lines.push("> Regenerates after every settlement cycle (data-refresh worker, non-fatal) and on demand via `npm run calibration:report`.");
  lines.push("> Math mirrors `apps/web/lib/calibration/compute.ts`, parity-pinned by `apps/web/__tests__/calibration-report-generator.test.ts`.");
  lines.push("");
  lines.push(`- **Generated:** ${now.toISOString()}`);
  lines.push(`- **Data status:** ${statusLabel}`);
  lines.push(
    "- **Sample filter:** settled (WIN/LOSS/PUSH), `isPublished=true`, `isBootstrap=false`, seed model excluded " +
      `(\`${SEED_MODEL_VERSION}\`). Pending/void picks and bootstrap-era picks never count.`
  );
  lines.push("");
  lines.push("## Verdict");
  lines.push("");
  lines.push(verdict.line);
  if (verdict.unblockedBy.length > 0) {
    lines.push("");
    lines.push("**What unblocks this, in order:**");
    lines.push("");
    verdict.unblockedBy.forEach((item, i) => lines.push(`${i + 1}. ${item}`));
  }
  lines.push("");
  lines.push("## Eligibility gate");
  lines.push("");
  lines.push("| Gate | Required | Current | Status |");
  lines.push("|---|---|---|---|");
  lines.push(
    `| Graded canonical picks | >= ${CALIBRATION_GATE_MIN_SAMPLE} | ${sampleSize} | ${gateMet ? "MET" : "NOT MET"} |`
  );
  lines.push("");
  lines.push("## Sample size & hit rate");
  lines.push("");
  lines.push(`- **Graded picks:** ${sampleSize} (${tally.wins}W – ${tally.losses}L – ${tally.pushes}P)`);
  lines.push(
    `- **Hit rate (pushes excluded):** ${fmtPctOrDash(tally.hitRate)} on ${tally.decisive} decisive picks`
  );
  lines.push(
    `- **95% CI on hit rate (Wilson):** ${
      hitRateCi ? `[${formatPct(hitRateCi.lower)}, ${formatPct(hitRateCi.upper)}]` : "— (no decisive picks)"
    }`
  );
  lines.push(
    `- **Break-even reference:** ${formatPct(BREAK_EVEN_HIT_RATE)} at standard -110 vig. ` +
      "The verdict requires the CI **lower bound** to clear it, not the point estimate."
  );
  lines.push("");
  lines.push("## Brier score");
  lines.push("");
  lines.push(
    `- **Overall:** ${fmt(brierScore)} (lower is better; 0.25 = uninformative coin; verdict requires < ${MAX_ACCEPTABLE_BRIER})`
  );
  lines.push("");
  lines.push("### Per sport");
  lines.push("");
  if (sports.length === 0) {
    lines.push("No graded picks — no per-sport breakdown exists yet.");
  } else {
    lines.push("| Sport | Sample | Brier | W–L–P | Hit rate |");
    lines.push("|---|---|---|---|---|");
    for (const row of sports) {
      lines.push(
        `| ${row.sport} | ${row.sampleSize} | ${fmt(row.brierScore)} | ${row.wins}–${row.losses}–${row.pushes} | ${fmtPctOrDash(row.hitRate)} |`
      );
    }
  }
  lines.push("");
  lines.push("### Trend over time windows");
  lines.push("");
  if (sampleSize === 0) {
    lines.push("No graded picks — no trend exists yet.");
  } else {
    lines.push("| Window | Sample | Brier | W–L–P | Hit rate |");
    lines.push("|---|---|---|---|---|");
    for (const row of windows) {
      lines.push(
        `| ${row.label} | ${row.sampleSize} | ${fmt(row.brierScore)} | ${row.wins}–${row.losses}–${row.pushes} | ${fmtPctOrDash(row.hitRate)} |`
      );
    }
    if (missingSettledAt > 0) {
      lines.push("");
      lines.push(
        `_${missingSettledAt} graded pick(s) carry no settledAt timestamp and count only in "All time"._`
      );
    }
  }
  lines.push("");
  lines.push("## Calibration curve (predicted vs actual)");
  lines.push("");
  if (sampleSize === 0) {
    lines.push("No graded picks — the curve is empty. Every bucket below is structural, not evidence.");
    lines.push("");
  }
  lines.push("| Confidence bucket | Sample | Predicted win rate | Actual win rate | Delta | Bucket Brier |");
  lines.push("|---|---|---|---|---|---|");
  for (const bucket of buckets) {
    const empty = bucket.sampleSize === 0;
    lines.push(
      `| ${bucket.label} | ${bucket.sampleSize} | ${empty ? "—" : formatPct(bucket.expectedWinRate)} | ${
        empty ? "—" : formatPct(bucket.observedWinRate)
      } | ${empty ? "—" : (bucket.delta >= 0 ? "+" : "") + formatPct(bucket.delta)} | ${empty ? "—" : fmt(bucket.brierScore)} |`
    );
  }
  lines.push("");
  lines.push(
    `_Buckets need >= ${MIN_BUCKET_SAMPLE} picks before drift is judged; drift >= ${BUCKET_DRIFT_BLOCK} blocks the verdict._`
  );
  lines.push("");
  lines.push("## Closing-line comparison (CLV)");
  lines.push("");
  if (clv.clvSampleSize === 0 && clv.moneylineComparisonSample === 0) {
    lines.push(
      "**No closing-line data exists yet.** The CLV capture pipeline is wired (ClosingLine snapshots + " +
        "nullable `pick.clv*` columns, computed non-fatally at settlement), but no settled pick carries a " +
        "computed CLV value. This section will populate on its own once settlement runs against live odds — " +
        "nothing is estimated or backfilled in the meantime."
    );
  } else {
    lines.push(
      `- **CLV-positive rate:** ${fmtPctOrDash(clv.clvPositiveRate)} (${clv.clvPositiveCount} of ${clv.clvSampleSize} picks with computed CLV beat the close)`
    );
    if (clv.moneylineComparisonSample > 0) {
      lines.push(
        `- **Moneyline model vs close (same ${clv.moneylineComparisonSample} picks):** model Brier ${fmt(clv.moneylineModelBrier)} vs closing-implied Brier ${fmt(clv.moneylineCloseBrier)} ` +
          `— ${clv.moneylineModelBrier <= clv.moneylineCloseBrier ? "the model is at least as sharp as the close on this slice" : "the close is sharper than the model on this slice"}. ` +
          "Closing implied probability is single-side and vig-included (not de-vigged)."
      );
    } else {
      lines.push(
        "- **Moneyline model vs close:** no settled MONEYLINE pick carries a closing price yet — comparison honestly absent."
      );
    }
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(
    "_This report is evidence, not a decision. Charging money, changing prices, or bumping MODEL_VERSION " +
      "remain founder-gated human calls (see `_launch/GARRETT_ACTIONS.md`)._"
  );
  lines.push("");

  return { markdown: lines.join("\n"), verdict };
}

// ============================================================
// Data loading + entry point
// ============================================================

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPORT_PATH = path.resolve(SCRIPT_DIR, "..", "_launch", "CALIBRATION_REPORT.md");

/**
 * Loads the gate sample from the DB. Returns a dataStatus + picks; never throws.
 * Stub (no DATABASE_URL) and unreachable DB both degrade to an honest empty load.
 */
async function loadPicks() {
  const url = process.env.DATABASE_URL;
  if (!url || url.trim() === "") {
    return { dataStatus: "stub", picks: [], dbErrorMessage: null };
  }

  let db = null;
  try {
    const require = createRequire(import.meta.url);
    const { PrismaClient } = require("@prisma/client");
    db = new PrismaClient();
    const rows = await db.pick.findMany({
      where: {
        isPublished: true,
        isBootstrap: false,
        result: { in: ["WIN", "LOSS", "PUSH"] },
        NOT: { modelVersion: SEED_MODEL_VERSION },
      },
      include: { game: { include: { sport: { select: { name: true } } } } },
      orderBy: { settledAt: "asc" },
    });
    const picks = rows.map((pick) => ({
      id: pick.id,
      confidence: pick.confidence,
      result: pick.result,
      sport: pick.game?.sport?.name ?? null,
      pickType: pick.pickType,
      settledAt: pick.settledAt,
      clvPositive: pick.clvPositive,
      closingPrice: pick.closingPrice,
    }));
    return { dataStatus: "live", picks, dbErrorMessage: null };
  } catch (err) {
    return {
      dataStatus: "unreachable",
      picks: [],
      dbErrorMessage: err instanceof Error ? err.message.split("\n")[0] : String(err),
    };
  } finally {
    if (db) await db.$disconnect().catch(() => {});
  }
}

export async function generateCalibrationReport(now = new Date()) {
  const { dataStatus, picks, dbErrorMessage } = await loadPicks();
  const { markdown, verdict } = buildReport({ picks, dataStatus, dbErrorMessage, now });
  mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, markdown, "utf8");
  return { reportPath: REPORT_PATH, dataStatus, sampleSize: picks.length, verdict };
}

async function main() {
  const { reportPath, dataStatus, sampleSize, verdict } = await generateCalibrationReport();
  console.log(`[calibration-report] wrote ${reportPath}`);
  console.log(`[calibration-report] dataStatus=${dataStatus} sample=${sampleSize} ready=${verdict.ready}`);
  process.exit(0);
}

// Only run as a CLI — importing this module (tests, tooling) must be side-effect free.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error("[calibration-report] Fatal:", err);
    process.exit(1);
  });
}

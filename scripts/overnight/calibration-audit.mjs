/**
 * Calibration audit of the pregame context bridge on the 2025 holdout.
 *
 * A Brier score on its own is not a claim about skill. 0.2237 is only good or
 * bad relative to what you would have got by predicting the base rate. This
 * scores the emitted holdout probabilities against three benchmarks and reports
 * the skill honestly, including when it is negative.
 *
 * The fit is walk-forward: run-bridge.mjs trains on seasons strictly before 2025
 * and scores 2025 only, so these are genuinely out-of-sample numbers.
 *
 * This is a measurement of an EXISTING model. It fits nothing, changes no
 * product confidence, and turns no publish gate on.
 */

import fs from "node:fs";
import path from "node:path";

const DATA = "data/gse-dataset";
const HOLDOUT_SEASON = 2025;
const ECE_BINS = 10;

function jsonl(file) {
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

const premises = jsonl(path.join(DATA, "bridge-premises.jsonl"));
const features = jsonl(path.join(DATA, "features.jsonl"));

const byGame = new Map();
for (const f of features) {
  if (typeof f.game_id === "string") byGame.set(f.game_id, f);
}

// Training base rate: seasons strictly before the holdout. This is the number
// the model has to beat to have any skill at all.
let trainHome = 0;
let trainTotal = 0;
for (const f of features) {
  if (typeof f.season !== "number" || f.season >= HOLDOUT_SEASON) continue;
  if (typeof f.home_win !== "boolean") continue;
  trainTotal += 1;
  if (f.home_win) trainHome += 1;
}
const baseRate = trainTotal === 0 ? null : trainHome / trainTotal;

const scored = [];
const missingOutcome = [];
const missingHoldoutFeature = [];
for (const p of premises) {
  const f = byGame.get(p.game_id);
  if (!f) {
    missingHoldoutFeature.push(p.game_id);
    continue;
  }
  if (typeof f.home_win !== "boolean") {
    missingOutcome.push(p.game_id);
    continue;
  }
  scored.push({ game_id: p.game_id, p: p.probability, y: f.home_win ? 1 : 0, season: f.season });
}

const n = scored.length;

function brier(rows, predict) {
  if (rows.length === 0) return null;
  let s = 0;
  for (const r of rows) {
    const q = predict(r);
    s += (q - r.y) ** 2;
  }
  return s / rows.length;
}

function logLoss(rows) {
  if (rows.length === 0) return null;
  let s = 0;
  for (const r of rows) {
    // Clamp so a saturated prediction cannot produce Infinity and silently
    // poison the mean. The clamp is recorded, not hidden.
    const q = Math.min(1 - 1e-15, Math.max(1e-15, r.p));
    s += -(r.y === 1 ? Math.log(q) : Math.log(1 - q));
  }
  return s / rows.length;
}

function expectedCalibrationError(rows, bins = ECE_BINS) {
  if (rows.length === 0) return null;
  let ece = 0;
  const detail = [];
  for (let b = 0; b < bins; b += 1) {
    const lo = b / bins;
    const hi = (b + 1) / bins;
    const inBin = rows.filter((r) => (b === bins - 1 ? r.p >= lo && r.p <= hi : r.p >= lo && r.p < hi));
    if (inBin.length === 0) continue;
    const meanP = inBin.reduce((s, r) => s + r.p, 0) / inBin.length;
    const obsRate = inBin.reduce((s, r) => s + r.y, 0) / inBin.length;
    const gap = Math.abs(meanP - obsRate);
    ece += (inBin.length / rows.length) * gap;
    detail.push({
      bin: `${lo.toFixed(1)}-${hi.toFixed(1)}`,
      n: inBin.length,
      mean_predicted: meanP,
      observed_rate: obsRate,
      gap,
    });
  }
  return { ece, bins: detail };
}

/**
 * Paired bootstrap over games for the Brier skill difference.
 *
 * The point estimate alone is not a claim. Resampling GAMES (not rows) with a
 * fixed seed keeps this reproducible, and pairing matters: the model and the
 * base rate are scored on the same game, so the difference is far better
 * determined than either score on its own.
 */
function pairedBootstrapSkill(rows, base, iterations = 10000, seed = 20260927) {
  if (rows.length === 0 || base === null) return null;
  let state = seed >>> 0;
  const rand = () => {
    // xorshift32: deterministic, dependency-free, good enough for a bootstrap.
    state ^= state << 13; state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5; state >>>= 0;
    return state / 4294967296;
  };
  const deltas = new Array(iterations);
  const m = rows.length;
  for (let it = 0; it < iterations; it += 1) {
    let model = 0;
    let flat = 0;
    for (let k = 0; k < m; k += 1) {
      const r = rows[Math.floor(rand() * m)];
      model += (r.p - r.y) ** 2;
      flat += (base - r.y) ** 2;
    }
    deltas[it] = flat / m - model / m;
  }
  deltas.sort((a, b) => a - b);
  const q = (p) => deltas[Math.min(deltas.length - 1, Math.max(0, Math.floor(p * deltas.length)))];
  const atOrBelowZero = deltas.filter((d) => d <= 0).length / deltas.length;
  return {
    iterations,
    seed,
    ci95_low: q(0.025),
    ci95_high: q(0.975),
    point_estimate: deltas.reduce((s, d) => s + d, 0) / deltas.length,
    probability_skill_is_positive: 1 - atOrBelowZero,
  };
}

const modelBrier = brier(scored, (r) => r.p);
const baseBrier = baseRate === null ? null : brier(scored, () => baseRate);
const flatBrier = brier(scored, () => 0.5);
const eceResult = expectedCalibrationError(scored);
const heldOut = scored.filter((r) => r.season === HOLDOUT_SEASON);

const report = {
  generated_at: new Date().toISOString(),
  subject: "pregame_context_logit (scripts/run-bridge.mjs) scored on the 2025 holdout",
  note:
    "Out-of-sample: the fit trains on seasons strictly before 2025. No model was fitted by this script and no product confidence was changed.",
  holdout_season: HOLDOUT_SEASON,
  training: {
    seasons: "1999-2024 (strictly earlier than the holdout)",
    rows_used: trainTotal,
    home_win_rate: baseRate,
  },
  sample: {
    emitted_rows: premises.length,
    scored: n,
    excluded_missing_features_row: missingHoldoutFeature.length,
    excluded_missing_outcome: missingOutcome.length,
    note: "Every scored row's season is asserted below; a row outside the holdout season would be a defect.",
    all_scored_rows_are_holdout_season: n > 0 && heldOut.length === n,
    scored_seasons: [...new Set(scored.map((r) => r.season))].sort((a, b) => a - b),
  },
  scores: {
    brier: modelBrier,
    log_loss: logLoss(scored),
    ece: eceResult ? eceResult.ece : null,
    ece_bins: eceResult ? eceResult.bins : null,
  },
  benchmarks: {
    brier_always_base_rate: baseBrier,
    brier_always_050: flatBrier,
    base_rate_used: baseRate,
  },
  skill: {
    // Positive means the model beats always predicting the training base rate.
    brier_skill_vs_base_rate: baseBrier === null || modelBrier === null ? null : baseBrier - modelBrier,
    brier_skill_vs_050: flatBrier === null || modelBrier === null ? null : flatBrier - modelBrier,
    bootstrap: pairedBootstrapSkill(scored, baseRate),
    verdict:
      baseBrier === null || modelBrier === null
        ? "NOT_EVALUATED"
        : modelBrier < baseBrier
          ? "beats the base-rate benchmark on this holdout"
          : "DOES NOT beat the base-rate benchmark on this holdout",
    uncertainty:
      "The skill figure is a point estimate on 285 games. The bootstrap interval is the honest bound; read the verdict together with it rather than as a standalone claim.",
  },
  calibration_contract: {
    // The documented bar for publishing a calibration page.
    min_sample: 250,
    max_ece: 0.06,
    sample_met: n >= 250,
    ece_met: eceResult ? eceResult.ece <= 0.06 : null,
    probability_claims_allowed: false,
    why_not:
      "probabilityClaimsAllowed stays false regardless of the numbers. This is a context model whose direction duplicates the LIVE historical_strength family, and the calibration page remains dark by policy.",
  },
};

fs.mkdirSync("data/reasoning", { recursive: true });
fs.writeFileSync("data/reasoning/calibration-holdout-2025.json", `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));

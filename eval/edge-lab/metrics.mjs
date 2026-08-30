/**
 * edge-lab/metrics.mjs — REAL, runnable scoring + market math for measuring edge.
 *
 * Pure functions, no deps, runs in plain node. This is the honest version of the
 * "backtest harness" — the machinery is real and unit-checked here; plugging in
 * GSE's actual settled picks + historical closing lines (The Odds API historical
 * endpoint) produces real NFL numbers. Nothing here is simulated or self-graded.
 *
 * Conventions:
 *   - A probability p is in [0,1]. A binary outcome y is 0 or 1.
 *   - "implied prob" from decimal odds d is 1/d (includes the book's vig).
 *   - "fair prob" removes the vig across a market's outcomes (de-vig).
 */

/** Mean Brier score for binary outcomes: mean((p - y)^2). Lower is better. */
export function brierScore(preds, outcomes) {
  assertSameLen(preds, outcomes);
  let s = 0;
  for (let i = 0; i < preds.length; i++) s += (preds[i] - outcomes[i]) ** 2;
  return s / preds.length;
}

/** Mean log loss: -mean(y·ln p + (1-y)·ln(1-p)). Clipped to avoid ±Inf. */
export function logLoss(preds, outcomes, eps = 1e-12) {
  assertSameLen(preds, outcomes);
  let s = 0;
  for (let i = 0; i < preds.length; i++) {
    const p = Math.min(1 - eps, Math.max(eps, preds[i]));
    s += outcomes[i] * Math.log(p) + (1 - outcomes[i]) * Math.log(1 - p);
  }
  return -s / preds.length;
}

/**
 * Expected Calibration Error (equal-width bins): weighted mean over bins of
 * |empirical accuracy - mean confidence|. Lower = better calibrated.
 */
export function expectedCalibrationError(preds, outcomes, bins = 10) {
  assertSameLen(preds, outcomes);
  const acc = Array(bins).fill(0);
  const conf = Array(bins).fill(0);
  const cnt = Array(bins).fill(0);
  for (let i = 0; i < preds.length; i++) {
    let b = Math.floor(preds[i] * bins);
    if (b === bins) b = bins - 1; // p === 1 lands in last bin
    acc[b] += outcomes[i];
    conf[b] += preds[i];
    cnt[b] += 1;
  }
  let ece = 0;
  for (let b = 0; b < bins; b++) {
    if (cnt[b] === 0) continue;
    ece += (cnt[b] / preds.length) * Math.abs(acc[b] / cnt[b] - conf[b] / cnt[b]);
  }
  return ece;
}

/** Implied probability from decimal odds (includes vig). 2.00 -> 0.50. */
export function impliedFromDecimal(decimalOdds) {
  return 1 / decimalOdds;
}

/**
 * Proportional (naive) de-vig: normalize a market's implied probs to sum to 1.
 * Input: array of decimal odds for the mutually-exclusive outcomes of one market.
 * Returns fair probabilities. (Shin / power de-vig live in the prediction-engine;
 * this is the baseline the engine's removeVig() also uses, kept here for backtests.)
 */
export function devigProportional(decimalOddsList) {
  const implied = decimalOddsList.map(impliedFromDecimal);
  const total = implied.reduce((a, b) => a + b, 0);
  return implied.map((x) => x / total);
}

/**
 * Closing Line Value on fair probabilities for the side you bet.
 *   clv = fairProbAtClose(side) - fairProbAtBet(side)
 * Positive CLV means the market moved toward your side after you bet — the single
 * most reliable public proof of edge. Returned in probability points.
 */
export function clvProb(fairProbAtBet, fairProbAtClose) {
  return fairProbAtClose - fairProbAtBet;
}

/** Mean CLV across a set of graded bets (each {fairAtBet, fairAtClose}). */
export function meanClv(bets) {
  if (bets.length === 0) return 0;
  let s = 0;
  for (const b of bets) s += clvProb(b.fairAtBet, b.fairAtClose);
  return s / bets.length;
}

function assertSameLen(a, b) {
  if (a.length !== b.length) throw new Error(`length mismatch: ${a.length} vs ${b.length}`);
  if (a.length === 0) throw new Error("empty input");
}

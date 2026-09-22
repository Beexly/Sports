/**
 * Book-overround bandit: book-behavior instrumentation for line-shopping timing.
 *
 * Treats each book's weekly overround as an arm in a bandit-exploration
 * model (EXP3-style): fit arm-selection weights to each book's margin
 * history to forecast when books will widen or tighten margins (e.g. before
 * high-uncertainty games), as an input to bet-now-vs-wait timing.
 * Scored with the paper's R0–R2 reward axioms (reward = margin-tightness
 * gain from waiting vs betting now, normalized).
 *
 * @see arXiv:1112.0076 — "Bandit Market Makers"
 *
 * ACCEPTANCE GATE: ADAPT confirmed iff the bandit model of book margins
 * predicts next-week per-book overround with ≥ 10% lower MAE than the naive
 * baseline on the 2025 holdout. The gate is a backtest concern; this module
 * is the pure EXP3 kernel, not wired into any live path.
 */

/**
 * EXP3 weight update. `gains[i]` = estimated gain of arm i this round in
 * [0, 1] (higher = tighter margin / better to wait). Returns normalized
 * selection probabilities for the next round.
 */
export function exp3Update(
  weights: readonly number[],
  gains: readonly number[],
  eta: number,
): number[] {
  if (weights.length !== gains.length) {
    throw new Error("exp3Update: weights/gains length mismatch");
  }
  if (weights.length === 0) return [];
  if (!(eta > 0)) throw new Error("exp3Update: eta must be positive");
  const updated = weights.map((w, i) => {
    const g = gains[i] ?? 0;
    if (!Number.isFinite(g)) throw new Error("exp3Update: non-finite gain");
    return w * Math.exp((eta * g) / weights.length);
  });
  const total = updated.reduce((a, b) => a + b, 0);
  if (!Number.isFinite(total) || total <= 0) {
    return weights.map(() => 1 / weights.length);
  }
  return updated.map((w) => w / total);
}

/**
 * Forecast next-week overround per book as the EXP3-weighted mean of each
 * book's trailing margin history.
 */
export function forecastOverround(
  bookMarginHistory: readonly (readonly number[])[],
  weights: readonly number[],
): number {
  if (bookMarginHistory.length !== weights.length) {
    throw new Error("forecastOverround: history/weights length mismatch");
  }
  if (bookMarginHistory.length === 0) throw new Error("forecastOverround: no books");
  const wTotal = weights.reduce((a, b) => a + b, 0);
  if (!(wTotal > 0)) throw new Error("forecastOverround: weights sum to non-positive");
  return bookMarginHistory.reduce((acc, hist, i) => {
    const mean = hist.length === 0 ? 0 : hist.reduce((a, b) => a + b, 0) / hist.length;
    return acc + ((weights[i] ?? 0) / wTotal) * mean;
  }, 0);
}

/**
 * R0-style reward: 1 if waiting beat betting now on this book's margin move,
 * scaled to [0,1]. Positive margin tightening (overround down) rewards waiting.
 */
export function waitReward(overroundNow: number, overroundAtBetTime: number): number {
  const improvement = overroundAtBetTime - overroundNow; // margin tightened
  return 1 / (1 + Math.exp(-50 * improvement)); // logistic squash to [0,1]
}

/** Naive baseline forecast: simple mean of the trailing history. */
export function naiveOverroundForecast(history: readonly number[]): number {
  if (history.length === 0) throw new Error("naiveOverroundForecast: empty history");
  return history.reduce((a, b) => a + b, 0) / history.length;
}

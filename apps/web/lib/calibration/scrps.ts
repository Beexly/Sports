/**
 * Scaled CRPS (SCRPS) — arXiv 1912.05642v4
 * ("Local scale invariance and robustness of proper scoring rules").
 *
 * ADDITIVE utility. Not wired into any ranking surface (that wiring is a
 * NEEDS HUMAN CALL — see WIRING-PLAN.md).
 *
 * CRPS(F, y) = E|X − y| − ½·E|X − X′|  (X, X′ iid draws from forecast F)
 * SCRPS(F, y) = CRPS(F, y) / E|X − X′|
 *
 * SCRPS is scale-invariant: SCRPS(c·F, c·y) = SCRPS(F, y) for c > 0, so a
 * blowout-prone market (totals) cannot dominate a tight market (spreads) in
 * an engine ranking the way mean CRPS lets it.
 * Improvement-ledger gate: ADOPT as a second engine ranking only if, on the
 * last 3 seasons of spread + total backtests, the engine ranking under mean
 * SCRPS differs from the ranking under mean CRPS for ≥ 2 game-target pairs.
 */

function mean(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Mean absolute pairwise spread E|X − X′| of the forecast ensemble. */
export function ensembleSpread(forecast: readonly number[]): number {
  const m = forecast.length;
  if (m < 2) return 0;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < m; i++) {
    for (let j = i + 1; j < m; j++) {
      sum += Math.abs(forecast[i]! - forecast[j]!);
      count++;
    }
  }
  return sum / count;
}

/** CRPS of an ensemble forecast against observation y. NaN on empty forecast. */
export function crpsFromSamples(forecast: readonly number[], y: number): number {
  const m = forecast.length;
  if (m === 0) return NaN;
  const e1 = mean(forecast.map((x) => Math.abs(x - y)));
  return e1 - 0.5 * ensembleSpread(forecast);
}

/**
 * Scaled CRPS of an ensemble forecast against observation y.
 * NaN on empty forecast; +∞ when the forecast is degenerate (zero spread)
 * but misses y (honest: a point-mass forecast that is wrong is infinitely
 * penalized under scale normalization); 0 when a degenerate forecast is exact.
 */
export function scrpsFromSamples(forecast: readonly number[], y: number): number {
  const crps = crpsFromSamples(forecast, y);
  if (Number.isNaN(crps)) return NaN;
  const spread = ensembleSpread(forecast);
  if (spread === 0) return crps === 0 ? 0 : Number.POSITIVE_INFINITY;
  return crps / spread;
}

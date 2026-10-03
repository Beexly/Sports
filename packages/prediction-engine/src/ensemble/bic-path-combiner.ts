/**
 * BIC-weighted averaging across the lasso regularization path.
 *
 * A cheap robustness layer for GSE's regularized models: instead of betting
 * on one selected penalty, combine forecasts across the λ-grid with BIC
 * weights (the paper's §2.3 hedge against parsimony misspecification).
 * Also encodes the replicated horizon rule: lean models for short horizons,
 * cross-entity structure for long horizons — applied to GSE's
 * volatility-of-performance modeling.
 *
 * @see arXiv:1610.02653 — "Lasso-based Forecast Combinations for Forecasting Realized Variances"
 *
 * ACCEPTANCE GATE: ADOPT the BIC-weighted path combination iff it improves
 * walk-forward log-loss/Brier on the 2024 holdout vs the single-penalty
 * model with no added instability; per the paper's own honest evidence,
 * treat non-significant gains as a signal to deprioritize hyperparameter
 * ensembling relative to model diversity and factor-aware weighting. The
 * gate is a backtest concern; this module is the pure combiner kernel, not
 * wired into any live path.
 */

/** BIC weights ∝ exp(−BIC/2), normalized. */
export function bicWeights(bics: readonly number[]): number[] {
  if (bics.length === 0) return [];
  const min = Math.min(...bics);
  const w = bics.map((b) => Math.exp(-(b - min) / 2));
  const total = w.reduce((a, b) => a + b, 0);
  if (!Number.isFinite(total) || total <= 0) return bics.map(() => 1 / bics.length);
  return w.map((x) => x / total);
}

/**
 * Combine per-λ forecasts with BIC weights.
 * @param forecasts rows = λ grid points, values = forecast at that penalty
 */
export function combineLassoPath(forecasts: readonly number[], bics: readonly number[]): number {
  if (forecasts.length === 0) throw new Error("combineLassoPath: empty forecasts");
  if (forecasts.length !== bics.length) throw new Error("combineLassoPath: length mismatch");
  const w = bicWeights(bics);
  return forecasts.reduce((s, f, i) => s + f * (w[i] ?? 0), 0);
}

/**
 * BIC for a Gaussian linear fit: n·log(RSS/n) + k·log(n).
 */
export function bic(rss: number, n: number, k: number): number {
  if (!(rss > 0) || !(n > 0) || !(k >= 0)) throw new Error("bic: invalid inputs");
  return n * Math.log(rss / n) + k * Math.log(n);
}

/**
 * Horizon rule: short horizons → the leanest (highest-λ) model on the path;
 * long horizons → the BIC-weighted path combination (cross-entity structure).
 */
export function horizonForecast(
  forecasts: readonly number[],
  bics: readonly number[],
  horizon: "short" | "long",
): number {
  if (horizon === "short") {
    // leanest model = last grid point (highest λ by convention)
    return forecasts[forecasts.length - 1] ?? 0;
  }
  return combineLassoPath(forecasts, bics);
}

/**
 * Quantile regression for NFL totals (GEFCom2017-style decomposition).
 *
 * Research source: arXiv:1809.03561v1 — "Quantile Regression for Qualifying
 * Match of GEFCom2017 Probabilistic Load Forecasting".
 *
 * Ports the competition-winning template to NFL totals and score
 * differentials: decompose log(total) = trend_t + Y_t, where trend_t is the
 * scoring-environment trend (annual moving average of residuals — the
 * paper's trend_t, capturing rule changes) and Y_t comes from quantile
 * regressions on a deterministic matchup basis (week-of-season effects,
 * rest-differential dummies, weather-band interactions, divisional flags),
 * fitted by pinball-loss minimization at quantiles 0.1-0.9, with
 * trend-quantile uncertainty added before exponentiating back. Produces full
 * predictive distributions (not point estimates) — exactly what calibrated
 * totals betting and Kelly sizing need.
 *
 * ACCEPTANCE GATE: ADOPT iff the quantile model beats the current totals
 * approach on pinball loss and produces positive backtest ROI. REJECT if the
 * decomposition adds nothing — i.e. if NFL totals are sufficiently
 * stationary that a single quantile regression without the trend component
 * matches performance (simpler wins).
 *
 * Additive research module — not wired into any live prediction path.
 */

export interface TotalsGame {
  /** Final combined score. */
  total: number;
  /** Deterministic matchup basis (week effects, rest dummies, etc.). */
  features: number[];
}

export interface QuantileModel {
  /** One coefficient vector (intercept-first) per quantile level. */
  betas: number[][];
  /** Quantile levels, ascending. */
  levels: number[];
  /** Log-scale trend component. */
  trend: number;
  /** Trend uncertainty (SD of log residuals) added at the tails. */
  trendSd: number;
}

/** Pinball loss: the strictly proper scoring rule for quantiles. */
export function pinballLoss(y: number, q: number, tau: number): number {
  if (tau <= 0 || tau >= 1) throw new Error("pinballLoss: tau must be in (0,1)");
  const e = y - q;
  return e >= 0 ? tau * e : (tau - 1) * e;
}

export function meanPinballLoss(
  actuals: readonly number[],
  quants: readonly number[],
  tau: number,
): number {
  if (actuals.length !== quants.length) throw new Error("meanPinballLoss: length mismatch");
  if (actuals.length === 0) throw new Error("meanPinballLoss: no data");
  let s = 0;
  for (let i = 0; i < actuals.length; i++) s += pinballLoss(actuals[i] ?? 0, quants[i] ?? 0, tau);
  return s / actuals.length;
}

/**
 * Fit a linear quantile regression by subgradient descent on the pinball
 * loss with L2 regularization. Deterministic; returns null on empty input.
 */
export function fitQuantileRegression(
  X: ReadonlyArray<readonly number[]>,
  y: readonly number[],
  tau: number,
  opts: { iters?: number; lr?: number; l2?: number } = {},
): number[] | null {
  if (tau <= 0 || tau >= 1) throw new Error("fitQuantileRegression: tau must be in (0,1)");
  if (X.length === 0) return null;
  if (X.length !== y.length) throw new Error("fitQuantileRegression: length mismatch");
  const d = (X[0] as readonly number[]).length;
  if (X.some((row) => row.length !== d)) throw new Error("fitQuantileRegression: ragged X");
  const iters = opts.iters ?? 2000;
  const l2 = opts.l2 ?? 1e-6;
  const n = X.length;
  // beta[0] = intercept.
  let beta = new Array<number>(d + 1).fill(0);
  // Deterministic decreasing step size.
  for (let it = 1; it <= iters; it++) {
    const lr = (opts.lr ?? 0.5) / Math.sqrt(it);
    const grad = new Array<number>(d + 1).fill(0);
    for (let i = 0; i < n; i++) {
      const Xi = X[i] as readonly number[];
      let q = beta[0] ?? 0;
      for (let j = 0; j < d; j++) q += (beta[j + 1] ?? 0) * (Xi[j] ?? 0);
      const w = (y[i] ?? 0) < q ? 1 - tau : -tau; // subgradient of pinball w.r.t. q
      grad[0] = (grad[0] ?? 0) + w;
      for (let j = 0; j < d; j++) grad[j + 1] = (grad[j + 1] ?? 0) + w * (Xi[j] ?? 0);
    }
    for (let j = 0; j <= d; j++) {
      beta[j] = (beta[j] ?? 0) - lr * ((grad[j] ?? 0) / n + l2 * (beta[j] ?? 0));
    }
  }
  return beta;
}

/**
 * Fit the full GEFCom-style model: log(total) = trend + Y, quantile
 * regressions of Y on the matchup basis at each requested level.
 */
export function fitTotalsQuantiles(
  games: readonly TotalsGame[],
  levels: readonly number[] = [0.1, 0.25, 0.5, 0.75, 0.9],
  opts: { iters?: number; lr?: number; l2?: number } = {},
): QuantileModel | null {
  if (games.length === 0) return null;
  if (levels.some((t) => t <= 0 || t >= 1)) throw new Error("fitTotalsQuantiles: bad level");
  const sorted = [...levels].sort((a, b) => a - b);
  const logTotals = games.map((g) => {
    if (g.total <= 0) throw new Error("fitTotalsQuantiles: total must be positive");
    return Math.log(g.total);
  });
  const trend = logTotals.reduce((a, b) => a + b, 0) / logTotals.length;
  const resid = logTotals.map((lt) => lt - trend);
  const trendSd = Math.sqrt(resid.reduce((a, r) => a + r * r, 0) / Math.max(1, resid.length));
  const X = games.map((g) => g.features);
  const betas = sorted.map(
    (tau) =>
      fitQuantileRegression(X, resid, tau, opts) ??
      new Array<number>((X[0] as readonly number[]).length + 1).fill(0),
  );
  return { betas, levels: sorted, trend, trendSd };
}

/**
 * Predictive quantile of the total at a level: exp(trend + q_tau(Y)) with
 * a small trend-uncertainty widening at the tails (|tau - 0.5| scaled).
 */
export function predictTotalQuantile(
  model: QuantileModel,
  features: readonly number[],
  tau: number,
): number {
  const idx = model.levels.indexOf(tau);
  if (idx < 0) throw new Error("predictTotalQuantile: level not fitted");
  const beta = model.betas[idx] as number[];
  let q = beta[0] ?? 0;
  for (let j = 0; j < features.length; j++) q += (beta[j + 1] ?? 0) * (features[j] ?? 0);
  const widen = 1 + model.trendSd * Math.abs(tau - 0.5) * 2;
  return Math.exp(model.trend + q * widen);
}

/** Fraction of actuals falling at or below the fitted quantile (should ~= tau). */
export function quantileCoverage(
  model: QuantileModel,
  games: readonly TotalsGame[],
  tau: number,
): number {
  if (games.length === 0) throw new Error("quantileCoverage: no games");
  let hit = 0;
  for (const g of games) {
    if (g.total <= predictTotalQuantile(model, g.features, tau)) hit++;
  }
  return hit / games.length;
}

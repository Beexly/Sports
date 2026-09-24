/**
 * arXiv 2207.12147v1: Sparse Bayesian State-Space and Time-Varying Parameter Models
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Build sparse-TVP team ratings: non-centered TVP regression of margin on team dummies + situational features (nflverse 2015-2025 weekly), triple-gamma or horseshoe prior on sqrt(theta_j) (prototype in shrinkTVP, port to Stan/PyMC), read off P(dynamic) per team -- dynamic teams get time-varying ratings, others static; refit weekly with warm-started MCMC/Laplace -- then add a Markov-switching (break) component to the state equation for coaching/QB-change weeks so P(dynamic) concentrates on true regime changes rather than smooth drift.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Build sparse-TVP team ratings: non-centered TVP regression of margin on team dummies + situational features (nflverse 2015-2025 weekly), triple-gamma or horseshoe prior on sqrt(theta_j) (prototype in shrinkTVP, port to Stan/PyMC), read off P(dynamic) per team — dynamic teams get time-varying ratings, others static; refit weekly with warm-started MCMC/Laplace — then add a Markov-switching (break) component to the state equation for coaching/QB-change weeks so P(dynamic) concentrates on true regime changes rather than smooth drift.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT iff rolling 2022-2024 RMSE beats the Elo baseline by >=3% AND the posterior classifies at least 20% of team coefficients as dynamic (the model actually uses its flexibility); reject if classification collapses to all-fixed or MCMC makes weekly refits unreliable.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Mimo | bucket: MODEL | lane: mixed | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Soft thresholding operator. */
export function softThreshold(x: number, lam: number): number {
  if (x > lam) return x - lam;
  if (x < -lam) return x + lam;
  return 0;
}

/** Iterative soft-thresholding (ISTA) for Lasso: min ||y - Xb||^2/2n + lam||b||_1. */
export function istaLasso(
  X: number[][],
  y: number[],
  lam: number,
  iters: number,
): number[] {
  const n = X.length;
  const p = X[0]!.length;
  let b = new Array<number>(p).fill(0);
  // Lipschitz constant via power iteration
  let v = Array.from({ length: p }, () => 1 / Math.sqrt(p));
  let L = 1;
  for (let it = 0; it < 30; it++) {
    const Xv = X.map((row) => row.reduce((s, x, j) => s + x * v[j]!, 0));
    const XtXv = new Array<number>(p).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < p; j++) XtXv[j]! += X[i]![j]! * Xv[i]!;
    L = Math.sqrt(XtXv.reduce((s, x) => s + x * x, 0)) / n;
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    v = XtXv.map((x) => x / Math.max(1e-12, norm));
  }
  const step = 1 / Math.max(1e-9, L);
  for (let it = 0; it < iters; it++) {
    const r = X.map((row, i) => row.reduce((s, x, j) => s + x * b[j]!, 0) - y[i]!);
    const grad = new Array<number>(p).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < p; j++) grad[j]! += X[i]![j]! * r[i]!;
    b = b.map((bj, j) => softThreshold(bj - (step / n) * grad[j]!, step * lam));
  }
  return b;
}

/** TV-denoising (taut string / fused lasso path via pool adjacent violators, L1 trend). */
export function tvDenoise1d(y: number[], lam: number): number[] {
  // proximal point via subgradient descent (simple, robust)
  let x = y.slice();
  const step = 0.05;
  for (let it = 0; it < 2000; it++) {
    const g = x.map((xi, i) => {
      let gg = 2 * (xi - y[i]!);
      if (i > 0) gg += lam * Math.sign(xi - x[i - 1]!);
      if (i < x.length - 1) gg += lam * Math.sign(xi - x[i + 1]!);
      return gg;
    });
    x = x.map((xi, i) => xi - step * g[i]!);
  }
  return x;
}

export interface AR1State {
  level: number;
  variance: number;
}

/** Scalar Kalman filter for AR(1) strength: x_t = phi x_{t-1} + w, y_t = x_t + v. */
export function ar1Update(
  s: AR1State,
  obs: number,
  phi: number,
  stateVar: number,
  obsVar: number,
): AR1State {
  const predLevel = phi * s.level;
  const predVar = phi * phi * s.variance + stateVar;
  const gain = predVar / (predVar + obsVar);
  return {
    level: predLevel + gain * (obs - predLevel),
    variance: (1 - gain) * predVar,
  };
}

/** One-step-ahead AR(1) forecast. */
export function ar1Forecast(s: AR1State, phi: number, stateVar: number): { mean: number; variance: number } {
  return { mean: phi * s.level, variance: phi * phi * s.variance + stateVar };
}

/** Ornstein-Uhlenbeck forecast: mean-reverting continuous-time dynamics. */
export function ouForecast(
  x: number,
  theta: number,
  mu: number,
  sigma: number,
  dt: number,
): { mean: number; variance: number } {
  const e = Math.exp(-theta * dt);
  return {
    mean: mu + (x - mu) * e,
    variance: (sigma * sigma * (1 - Math.exp(-2 * theta * dt))) / (2 * theta),
  };
}

/** Closed-form in-play win probability from an OU score-differential process. */
export function ouWinProb(lead: number, theta: number, sigma: number, tRemain: number): number {
  const f = ouForecast(lead, theta, 0, sigma, tRemain);
  const sd = Math.sqrt(Math.max(1e-12, f.variance));
  return normalCdfOU(f.mean / sd);
}

function normalCdfOU(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-x * x / 2);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x > 0 ? 1 - p : p;
}

/** Brownian-motion win probability (theta -> 0 limit intuition, drift mu). */
export function brownianWinProb(lead: number, drift: number, sigma: number, tRemain: number): number {
  const sd = sigma * Math.sqrt(Math.max(1e-12, tRemain));
  return normalCdfOU((lead + drift * tRemain) / sd);
}

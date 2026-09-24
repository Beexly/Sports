/**
 * arXiv 2210.11010: Efficient variational approximations for state space models
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Port Efficient-VB as the production inference engine for GSE's dynamic state-space ratings: dynamic bivariate-Poisson team-strength model (attack/defense random walks, Poisson score likelihood) on nflverse 2000-2024 -- train 2000-2019, test 2020-2024 on predictive log-likelihood vs the static-strength model and GSE's current score model, runtime vs MCMC on one season, and the calibration check (Efficient-VB posterior SDs vs MCMC SDs -- median underestimation ratio reported).
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Port Efficient-VB as the production inference engine for GSE's dynamic state-space ratings: dynamic bivariate-Poisson team-strength model (attack/defense random walks, Poisson score likelihood) on nflverse 2000-2024 — train 2000-2019, test 2020-2024 on predictive log-likelihood vs the static-strength model and GSE's current score model, runtime vs MCMC on one season, and the calibration check (Efficient-VB posterior SDs vs MCMC SDs — median underestimation ratio reported).
 *
 * ACCEPTANCE GATE (verbatim):
 * Gate (ADAPT->keep): predictive log-likelihood beats static-strength baseline by >= 0.01 nats/game on 2020-2024 AND runtime <= 5% of MCMC per season AND median posterior-SD underestimation <= 20% (ratio >= 0.8); fail any -> REJECT for production (keep as research prototype).
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: bayesian | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

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

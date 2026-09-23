/**
 * arXiv 2104.07537: Variational Inference for the Smoothing Distribution in Dynamic Probit Models
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Build gse.statespace.PFMVBProbit: dynamic probit with Kalman-smoother-exact conditional and factorized truncated-normal updates, hyperparameter learning for W via M-step (empirical Bayes) or a hierarchical prior; use cases: in-play binary event probabilities (next-play success, drive TD) with time-varying coefficients, player availability/injury-status dynamics, momentum-style binary regime indicators; serve posterior means +/- SDs at play cadence; monitor ELBO convergence.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Build gse.statespace.PFMVBProbit: dynamic probit with Kalman-smoother-exact conditional and factorized truncated-normal updates, hyperparameter learning for W via M-step (empirical Bayes) or a hierarchical prior; use cases: (a) in-play binary event probabilities (next-play success, drive TD) with time-varying coefficients; (b) player availability/injury-status dynamics; (c) momentum-style binary regime indicators; serve posterior means +/- SDs at play cadence; monitor ELBO convergence.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADAPT->keep if PFM-VB posterior means within 0.01 MAE of exact MCMC on NFL drive data AND predictive log-loss beats static probit by >= 0.003 on 2022-2024 holdout. Fail -> REJECT (fall back to the EP backend).
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

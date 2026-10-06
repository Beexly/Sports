/**
 * arXiv 2308.02414v3: A State-Space Perspective on Modelling and Inference for Online Skill Rating
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Build an NFL team-rating module ('abile-for-NFL'): bivariate attack/defence SSM -- per-team skill x^i = (x^{att,i}, x^{def,i}) with Brownian dynamics; emission = bivariate Poisson with lambda_1 = exp(alpha^h + x^{att,h} - x^{def,a}), lambda_2 = exp(alpha^a + x^{att,a} - x^{def,h}), lambda_3 = exp(beta); two parallel inference engines -- (i) Extended Kalman (O(1) per game) for live ratings, (ii) discrete fHMM with S=200-500 states for robustness; EM calibration with closed-form sigma_0, tau M-steps -- with an NFL-specific emission: correlated Gaussian margin-of-victory emission instead of low-count Poisson, team-specific rate tau^i with separate tau_off-season vs tau_in-season (single Brownian tau cannot capture within-season stability and off-season churn), and OU mean-reverting dynamics tested against Brownian via marginal likelihood comparison.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Build an NFL team-rating module ('abile-for-NFL'): bivariate attack/defence SSM - per-team skill x^i = (x^{att,i}, x^{def,i}) with Brownian dynamics; emission = bivariate Poisson with lambda_1 = exp(alpha^h + x^{att,h} - x^{def,a}), lambda_2 = exp(alpha^a + x^{att,a} - x^{def,h}), lambda_3 = exp(beta); two parallel inference engines - (i) Extended Kalman (O(1) per game) for live ratings, (ii) discrete fHMM with S=200-500 states for robustness; EM calibration with closed-form sigma_0, tau M-steps - with an NFL-specific emission: correlated Gaussian margin-of-victory emission instead of low-count Poisson, team-specific rate tau^i with separate tau_off-season vs tau_in-season (single Brownian tau cannot capture within-season stability and off-season churn), and OU mean-reverting dynamics tested against Brownian via marginal likelihood comparison.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT if: on the rolling 3-train/1-test nflverse protocol, the bivariate attack/defence SSM achieves mean test average-NLL improvement >= 0.01 over the Elo-Davidson baseline across all three test windows AND no window shows degradation; REJECT if: the SSM fails to beat Elo-Davidson on >=2 of 3 test windows, or the attack/defence decomposition adds no interpretable signal beyond the single-skill SSM.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Mimo | bucket: MODEL | lane: experimental | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
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

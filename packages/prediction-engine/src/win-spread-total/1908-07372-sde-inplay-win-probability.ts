/**
 * arXiv 1908.07372: Stochastic Differential Theory of Cricket: Closed-Form In-Play Win Probability via Brownian and Ornstein–Uhlenbeck Models
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * NFL in-play SDE model: X(t) = score differential minus required pace differential, with team-pair Ornstein-Uhlenbeck/Brownian parameters fit from 2010-2024 play-by-play and closed-form P(win|t); a discrete-shock layer perturbs drift on turnovers/injuries with relaxation; implied sigma doubles as a totals-modeling volatility feature.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Add an NFL in-play SDE model (X(t) = score differential minus required pace differential, team-pair OU parameters fit from 2010-2024 play-by-play, closed-form P(win|t)) with a discrete-shock layer that perturbs drift on turnovers/injuries with relaxation, as a physics-based alternative to the ML in-play model; use implied sigma as a totals-modeling volatility feature.
 *
 * ACCEPTANCE GATE (verbatim):
 * Adopt the SDE in-play model if its 2023-2024 in-play Brier beats the naive score-and-time baseline by >=0.005 and matches or beats GSE's current ML in-play model on log-loss; adopt only the shock-perturbation layer if the full model ties but the turnover-shock response improves probability calibration in the 5 minutes after turnovers.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Hermes | bucket: MODEL | lane: win_spread_total | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
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

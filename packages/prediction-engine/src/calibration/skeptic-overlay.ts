/**
 * Skeptic overlay on the bookmaker's Forecaster (Bayesian logistic betting).
 *
 * Corrects market-implied probabilities with engine features:
 *   log(p̂/(1−p̂)) = log(p/(1−p)) + θ′c_n
 * where p is the de-vigged market price, c_n the feature vector (model edge,
 * line movement, steam indicators, rest/situational flags) and θ the online
 * Bayesian-logistic fit. Stakes the capped Kelly fraction
 *   ν_n = (p̂_n − p_n) / (p_n(1 − p_n))
 * only when |ν_n| clears a threshold (abstention built in); θ updates online
 * as picks settle.
 *
 * @see arXiv:1204.3496v1 — "Bayesian logistic betting strategy against probability forecasting"
 *
 * ACCEPTANCE GATE: ADAPT iff on the 2024→2025 walk-forward the Skeptic overlay
 * (a) achieves higher log-bankroll growth than flat-stakes engine picks AND
 * (b) the fitted θ on log(p/(1−p)) is significantly ≠ 0, with max drawdown no
 * worse than 1.25× flat stakes. The gate is a backtest concern; this module is
 * the pure correction kernel, not wired into any live path.
 */

/** Logit with clamping to avoid infinities. */
export function logit(p: number): number {
  const c = Math.min(Math.max(p, 1e-9), 1 - 1e-9);
  return Math.log(c / (1 - c));
}

/** Inverse logit (sigmoid). */
export function invLogit(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Skeptic-corrected probability: market log-odds shifted by θ′c.
 * Returns the market price unchanged when there are no features/θ.
 */
export function skepticProb(
  marketP: number,
  features: readonly number[],
  theta: readonly number[],
): number {
  if (marketP <= 0 || marketP >= 1) throw new Error("skepticProb: marketP out of (0,1)");
  if (features.length !== theta.length) {
    throw new Error("skepticProb: features/theta length mismatch");
  }
  const shift = features.reduce((acc, c, i) => acc + c * (theta[i] ?? 0), 0);
  return invLogit(logit(marketP) + shift);
}

/**
 * Capped Kelly-style stake fraction ν = (p̂ − p) / (p(1−p)).
 * Returns 0 (abstain) when |ν| is below the threshold; caps at ±cap.
 */
export function skepticStakeFraction(
  pHat: number,
  marketP: number,
  threshold = 0.05,
  cap = 0.25,
): number {
  if (marketP <= 0 || marketP >= 1) throw new Error("skepticStakeFraction: marketP out of (0,1)");
  const nu = (pHat - marketP) / (marketP * (1 - marketP));
  if (!Number.isFinite(nu) || Math.abs(nu) < threshold) return 0;
  return Math.max(-cap, Math.min(cap, nu));
}

/**
 * One online gradient step on θ for the Bayesian-logistic loss
 * (Bernoulli NLL on the corrected probability).
 */
export function skepticThetaStep(
  theta: readonly number[],
  features: readonly number[],
  marketP: number,
  outcome: 0 | 1,
  stepSize = 0.1,
): number[] {
  const pHat = skepticProb(marketP, features, theta);
  const err = outcome - pHat; // dNLL/d(logit) = p̂ − y
  return theta.map((t, i) => t + stepSize * err * (features[i] ?? 0));
}

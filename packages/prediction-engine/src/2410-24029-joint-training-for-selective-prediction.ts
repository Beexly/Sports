/**
 * arXiv:2410.24029 — Joint Training for Selective Prediction
 *
 * Joint training for selective prediction (JTSP): the deferral head is stake-aware, emitting a continuous
 * stake fraction (0 = abstain) with a policy-gradient term on risk-adjusted units (Sharpe of weekly P&L).
 *
 * Improvement: Jointly train the predictor and the abstention gate with a policy-gradient term (JTSP) and make the deferral head stake-aware — outputting a continuous stake fraction (0 = abstain) with the policy gradient on risk-adjusted units (Sharpe of weekly P&L) — since sports abstention is really a sizing decision, not a binary one.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADAPT accepted if JTSP beats the separate-gate Policy baseline by ≥ 2 points of posted-pick hit-rate at matched deferral rate on walk-forward seasons AND the JTSP-vs-JTSP-CE ablation shows the policy-gradient term (not just shared representations) contributes.
 */

/** Numerically stable logistic. */
export function logistic(x: number): number {
  if (x >= 0) {
    const e = Math.exp(-x);
    return 1 / (1 + e);
  }
  const e = Math.exp(x);
  return e / (1 + e);
}

/** Deferral head output for one pick. */
export interface DeferralDecision {
  /** Stake fraction in [0,1]; 0 = abstain. */
  stake: number;
  /** Model win probability. */
  p: number;
  /** Estimated edge (model prob - market prob). */
  edge: number;
}

/**
 * Stake-aware deferral: stake = sigmoid((edge - tau) / temp), i.e. a smooth
 * abstain gate whose sharpness is learned. tau = abstention threshold.
 */
export function deferralStake(edge: number, tau: number, temp: number): number {
  if (temp <= 0) throw new Error("deferralStake: temp > 0");
  return logistic((edge - tau) / temp);
}

/**
 * Policy-gradient surrogate on risk-adjusted units: Sharpe of weekly P&L.
 * grad ~ (sharpe - baseline) * d log pi / d tau approximated by finite diff.
 */
export function sharpeOfPnl(weeklyPnl: readonly number[]): number {
  if (weeklyPnl.length < 2) throw new Error("sharpeOfPnl: need >= 2 weeks");
  const m = weeklyPnl.reduce((a, b) => a + b, 0) / weeklyPnl.length;
  const v = weeklyPnl.reduce((a, b) => a + (b - m) ** 2, 0) / (weeklyPnl.length - 1);
  if (v <= 0) return 0;
  return m / Math.sqrt(v);
}

/**
 * Finite-difference policy-gradient step for tau on the Sharpe objective.
 * Returns the improved tau (hill-climb on risk-adjusted units).
 */
export function policyGradientTauStep(
  edges: readonly number[],
  outcomes: readonly (0 | 1)[],
  tau: number,
  temp: number,
  lr: number,
): number {
  const pnl = (t: number): number[] =>
    edges.map((e, i) => deferralStake(e, t, temp) * ((outcomes[i] ?? 0) === 1 ? 1 : -1));
  const h = 1e-3;
  const g = (sharpeOfPnl(pnl(tau + h)) - sharpeOfPnl(pnl(tau - h))) / (2 * h);
  return tau + lr * g;
}

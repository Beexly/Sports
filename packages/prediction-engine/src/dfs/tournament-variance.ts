/**
 * Tournament-variance theorem as a GPP construction constraint.
 *
 * From the Independent Chip Model (ICM) risk-aversion paper: in top-heavy
 * payout structures, variance is costly. Any lineup decision that increases
 * variance (e.g. a boom/bust WR3) must raise expected score enough to overcome
 * the payout-ladder concavity penalty:
 *
 *   ΔEV ≥ λ · ΔVar
 *
 * with λ calibrated from ladder concavity. Also computes each high-variance
 * lineup's bystander-equity donation, separating good contrarian plays
 * (positive-EV differentiation) from bad variance.
 *
 * @see arXiv:0911.3100 — "The Independent Chip Model and Risk Aversion"
 *
 * ACCEPTANCE GATE: adopt the variance-budget rule iff on 2024 GPP backtests,
 * lineups violating the rule underperform compliant lineups on realized prize
 * by ≥ 20% (validating the concavity penalty in DFS); reject if the effect is
 * undetectable. The gate is a backtest concern; this module is the pure
 * constraint kernel, not wired into any live path.
 */

/**
 * Calibrate λ from ladder concavity: λ ≈ (marginal prize loss per unit of
 * score variance), estimated as the second derivative of the payout function
 * over the score range, scaled by entry fee. Pure helper — the real λ comes
 * from a contest's actual payout ladder.
 */
export function calibrateLambdaFromLadder(
  payoutAtScore: (score: number) => number,
  centerScore: number,
  delta = 1,
): number {
  const f0 = payoutAtScore(centerScore);
  const fPlus = payoutAtScore(centerScore + delta);
  const fMinus = payoutAtScore(centerScore - delta);
  // -f''(x): concavity penalty per unit variance (Taylor: E[f] ≈ f(μ) + f''σ²/2)
  const concavePenalty = -(fPlus - 2 * f0 + fMinus) / (delta * delta);
  return Math.max(0, concavePenalty / 2);
}

/**
 * Variance-budget rule: a high-variance construction is admissible only if
 * its expected-score gain covers the concavity penalty.
 */
export function varianceBudgetPass(deltaEV: number, deltaVar: number, lambda: number): boolean {
  if (lambda < 0) throw new Error("varianceBudgetPass: lambda must be non-negative");
  if (deltaVar <= 0) return deltaEV >= 0;
  return deltaEV >= lambda * deltaVar;
}

/**
 * Bystander-equity donation of a high-variance lineup: the expected prize
 * equity the lineup "donates" to the field by adding variance without
 * commensurate EV. Positive = bad variance (donates equity); negative = good
 * contrarian differentiation (extracts equity).
 */
export function bystanderEquityDonation(
  expectedPrize: number,
  expectedPrizeAtMeanVariance: number,
): number {
  return expectedPrizeAtMeanVariance - expectedPrize;
}

/**
 * Required ΔEV for a proposed variance increase to stay budget-neutral.
 */
export function requiredDeltaEV(deltaVar: number, lambda: number): number {
  if (lambda < 0) throw new Error("requiredDeltaEV: lambda must be non-negative");
  return Math.max(0, lambda * deltaVar);
}

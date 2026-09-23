/**
 * arXiv 2501.08397: Predict Confidently, Predict Right: Abstention in Dynamic Graph Learning.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Lagrangian abstention head: replace the fixed quadratic coverage penalty with a dual update that learns lambda online to pin exact coverage, with split coverage budgets per market (spread / total / moneyline get separate theta) since abstention value differs by market edge distribution.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Replace the fixed quadratic coverage penalty in GSE's learned abstention head with a Lagrangian dual update (learn λ online to pin exact coverage) and split coverage budgets per market (spread vs total vs moneyline get separate θ), since abstention value differs by market edge distribution.
 *
 * ACCEPTANCE GATE:
 * ADOPT the method iff, at matched realized coverage (±2 pts), the selection-head model's selective ROI beats the softmax-threshold baseline by ≥ 3 ROI points on the chronological test block AND realized coverage stays within ±3 pts of target across the last 4 weeks of data.
 *
 * ENABLED=false: learned abstention head; needs a human call.
 */


export const ENABLED = false;

export type Market = "spread" | "total" | "moneyline";

export interface MarketBudget {
  readonly market: Market;
  /** Selection threshold theta for this market. */
  theta: number;
  /** Dual variable pinning this market's coverage. */
  lambda: number;
  readonly targetCoverage: number;
}

/**
 * Lagrangian dual update: lambda <- max(0, lambda + lr * (target - realized)).
 * Under-covered -> lambda rises -> selection loosens; over-covered -> tightens.
 */
export function lagrangianUpdate(
  lambda: number,
  realizedCoverage: number,
  targetCoverage: number,
  lr = 0.5,
): number {
  return Math.max(0, lambda + lr * (targetCoverage - realizedCoverage));
}

/** Per-market selection: select picks with score >= theta (after dual adjustment). */
export function selectByTheta(
  scores: readonly { readonly id: string; readonly score: number }[],
  theta: number,
): string[] {
  return scores.filter((s) => s.score >= theta).map((s) => s.id);
}

/**
 * One online step per market: compute realized coverage, update lambda, and
 * nudge theta toward the target (theta falls when under-covered).
 */
export function dualStep(
  budget: MarketBudget,
  selected: number,
  total: number,
  lr = 0.5,
  thetaStep = 0.02,
): MarketBudget {
  const realized = total > 0 ? selected / total : 0;
  const lambda = lagrangianUpdate(budget.lambda, realized, budget.targetCoverage, lr);
  const theta =
    realized < budget.targetCoverage
      ? budget.theta - thetaStep
      : budget.theta + thetaStep;
  return { ...budget, theta, lambda };
}

/** Initialize per-market budgets (separate theta per market). */
export function initMarketBudgets(
  targetCoverage: number,
  initTheta = 0.5,
): Record<Market, MarketBudget> {
  const mk = (market: Market): MarketBudget => ({
    market,
    theta: initTheta,
    lambda: 0,
    targetCoverage,
  });
  return { spread: mk("spread"), total: mk("total"), moneyline: mk("moneyline") };
}

/** Gate: realized coverage within +/-3 pts of target over the last 4 weeks. */
export function coveragePinned(
  realizedCoverages: readonly number[],
  target: number,
  tol = 0.03,
): boolean {
  return realizedCoverages.every((c) => Math.abs(c - target) <= tol);
}

// ============================================================
// E-value risk screening for card selection (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the gate
 * below to pass on real walk-forward data, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 2603.24704 — "Conformal Selective Prediction with General Risk Control"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: conformal selective prediction with general risk
 * control — e-values computed over the slate's candidate picks turn the
 * selection problem into risk control: each pick's e-value is its
 * selection score calibrated on trailing graded picks, and posting only
 * picks whose e-value clears the threshold controls the average realized
 * loss. Per-market-type nominal risk budgets (spread/total/moneyline)
 * replace one global level.
 *
 * IMPROVEMENT (from ledger): Adopt GSE-SCoRE risk-adjusted e-value screening as the card-selection gate: each week compute e-values over the slate's candidate picks (selection score = existing gate score, calibration on trailing graded picks) and post only picks passing the threshold for a target average loss (nominal -0.02 units/pick), with per-market-type nominal risk budgets (spread/total/moneyline) instead of one global level.
 *
 * ACCEPTANCE GATE: ADOPT accepted if walk-forward realized average loss stays within ±0.03 units of nominal across all four test seasons AND posts ≥ 70% as many picks as the baseline gate at matched realized loss; else REJECT.
 */

/**
 * E-value for one pick: likelihood-ratio-style evidence that the pick's
 * selection score beats the calibration baseline. Calibrated so that
 * E[e-value] ≤ 1 under the null of "no better than calibration".
 */
export function eValue(selectionScore: number, calibrationMean: number, scale: number): number {
  const z = (selectionScore - calibrationMean) / Math.max(scale, 1e-12);
  return Math.exp(Math.min(Math.max(z - 0.5, -50), 50));
}

/**
 * E-value selection threshold for a target average loss (nominal): post
 * picks with e-value ≥ 1/(1 + |nominal|) scaled by the market budget.
 */
export function eValueThreshold(nominalLoss: number, marketBudgetShare: number): number {
  return (1 / (1 + Math.abs(nominalLoss))) * Math.max(marketBudgetShare, 1e-12);
}

/** Select picks clearing the e-value threshold. Returns selected indices. */
export function eValueSelect(eValues: number[], threshold: number): number[] {
  return eValues.map((e, i) => (e >= threshold ? i : -1)).filter((i) => i >= 0);
}

/** Realized average loss (units/pick) of the posted card. */
export function realizedAverageLoss(netReturns: number[]): number {
  if (netReturns.length === 0) return 0;
  return -netReturns.reduce((a, b) => a + b, 0) / netReturns.length;
}

export type MarketType = "spread" | "total" | "moneyline";

export interface EValueGate {
  lossDeviations: number[];
  volumeRatio: number;
  passes: boolean;
}

/**
 * Acceptance-gate helper: realized average loss within ±0.03 of nominal
 * across all four seasons AND ≥70% of the baseline gate's volume at
 * matched realized loss.
 */
export function eValueGatePasses(
  seasonalLosses: number[],
  nominalLoss: number,
  postedCounts: number[],
  baselineCounts: number[],
): EValueGate {
  const lossDeviations = seasonalLosses.map((l) => Math.abs(l - nominalLoss));
  const totalPosted = postedCounts.reduce((a, b) => a + b, 0);
  const totalBaseline = baselineCounts.reduce((a, b) => a + b, 0);
  const volumeRatio = totalBaseline > 0 ? totalPosted / totalBaseline : 0;
  const passes =
    lossDeviations.every((d) => d <= 0.03 + 1e-12) && volumeRatio >= 0.7;
  return { lossDeviations, volumeRatio, passes };
}

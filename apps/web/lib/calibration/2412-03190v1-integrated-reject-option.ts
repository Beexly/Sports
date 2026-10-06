// @ts-nocheck
/**
 * arXiv 2412.03190v1: Node Classification with Integrated Reject Option.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Integrated (trained-in) reject option replacing the post-hoc fixed-threshold abstention gate: a slate-adaptive coverage target from a meta-model predicting how many +EV opportunities each slate contains (soft slates -> more picks, sharp slates -> fewer) instead of wasting abstention budget at fixed coverage.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Replace the post-hoc fixed-threshold abstention gate with an integrated (trained-in) reject option and make the coverage target slate-adaptive — a meta-model predicting how many +EV opportunities each slate contains, posting more picks on soft slates and fewer on sharp ones instead of wasting abstention budget at fixed coverage.
 *
 * ACCEPTANCE GATE:
 * ADOPT integrated abstention only if: (a) it beats the fixed-threshold baseline on ROI at the business-chosen coverage, (b) realized coverage stays within ±5 points of target out-of-sample for 4+ consecutive weeks, and (c) the cost-based and coverage-based variants agree on ≥75% of abstain decisions.
 *
 * ENABLED=false: replaces the abstention gate; needs a human call.
 */


export const ENABLED = false;

export interface SlateFeatures {
  readonly nGames: number;
  /** Mean absolute engine-vs-market edge on the slate. */
  readonly meanAbsEdge: number;
  /** Market sharpness proxy (e.g. steam frequency), higher = sharper. */
  readonly sharpness: number;
}

export interface PickScore {
  readonly id: string;
  readonly market: "spread" | "total" | "moneyline";
  /** +EV score (higher = more attractive). */
  readonly score: number;
}

/**
 * Meta-model: predicted count of +EV opportunities on the slate.
 * Soft slates (high edge, low sharpness) -> more picks; sharp slates -> fewer.
 */
export function predictedOpportunities(f: SlateFeatures): number {
  const raw =
    f.nGames * (0.35 + 2.2 * f.meanAbsEdge) * (1 - 0.6 * Math.min(f.sharpness, 1));
  return Math.max(0, Math.round(raw));
}

/** Slate-adaptive coverage target = predicted opportunities / slate size. */
export function adaptiveCoverageTarget(
  f: SlateFeatures,
  slateSize: number,
): number {
  if (slateSize <= 0) return 0;
  return Math.min(Math.max(predictedOpportunities(f) / slateSize, 0), 1);
}

/**
 * Integrated selection: post exactly round(target * n) picks by score
 * (the trained-in reject option is approximated by the score order; the
 * learned head itself is training-time).
 */
export function selectPicks(
  picks: readonly PickScore[],
  targetCoverage: number,
): PickScore[] {
  const k = Math.round(targetCoverage * picks.length);
  return [...picks].sort((a, b) => b.score - a.score).slice(0, k);
}

/** Cost-based variant: abstain on picks whose expected cost exceeds the budget. */
export function costBasedSelect(
  picks: readonly PickScore[],
  costBudget: number,
  costOf: (p: PickScore) => number,
): PickScore[] {
  return picks
    .filter((p) => costOf(p) <= costBudget)
    .sort((a, b) => b.score - a.score);
}

/**
 * Agreement between the cost-based and coverage-based variants on abstain
 * decisions (gate: >= 75%).
 */
export function variantAgreement(
  picks: readonly PickScore[],
  coverageSelected: readonly PickScore[],
  costSelected: readonly PickScore[],
): number {
  const covSet = new Set(coverageSelected.map((p) => p.id));
  const costSet = new Set(costSelected.map((p) => p.id));
  let agree = 0;
  for (const p of picks) {
    if (covSet.has(p.id) === costSet.has(p.id)) agree++;
  }
  return picks.length > 0 ? agree / picks.length : 1;
}

/** Gate (b): realized coverage within +/-5 points of target. */
export function coverageOnTarget(
  realized: number,
  target: number,
  tol = 0.05,
): boolean {
  return Math.abs(realized - target) <= tol;
}

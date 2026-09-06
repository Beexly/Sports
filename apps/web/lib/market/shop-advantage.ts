import { americanToImpliedProbability } from "@sports/prediction-engine";

/**
 * Shop-vs-edge — how much of a pick's total price advantage came from the model
 * being right vs. from which book you'd click through to.
 *
 * Surfaced by a Round 7 repo-leverage deep dive (docs/ai/airwave/
 * GSE_GSN_REPO_LEVERAGE_AUDIT_2026-09.md): GSE's Edge Score is computed against
 * the book-AVERAGE price (packages/prediction-engine/src/scoring.ts's
 * `computeEdgeScore`, `pickedSideAvgPrice`) specifically so line-shopping never
 * gets counted as model edge — deliberately more rigorous than a naive
 * best-price comparison. best-line.ts's own header comment makes the same
 * distinction from the other direction: "this is transparency, not an
 * arbitrage tool... consensus says what the market thinks; the line shop says
 * where to get the best of it."
 *
 * Today those two honest numbers never appear together for one pick — the Edge
 * Score lives on the pick card, the Line Shop Board lives on a separate page
 * with no per-pick linkage. This module is the missing pure computation: given
 * the same average price the Edge Score already used and the best price
 * available across books for the same side, it returns the additional
 * probability-point advantage available purely by shopping — never negative,
 * since the best price is by definition at least as good as the average.
 *
 * Deliberately NOT expressed on the Edge Score's own 0-100 scale:
 * `computeEdgeScore`'s normalization constants are private to scoring.ts, and
 * duplicating them here would risk silently drifting out of sync with the
 * official score if the engine's weights ever change. This returns a plain
 * probability-point delta; a caller (UI copy, a future scoring change) decides
 * how to present it.
 *
 * Pure, no I/O. Where and how to surface this (which tier, what wording, pick
 * card vs. a dedicated widget) is a product decision, not made here — see the
 * audit doc for the proposed UI shape.
 */

export interface ShopAdvantageInput {
  /** The American price the official Edge Score was computed against (book average). */
  readonly avgPrice: number;
  /** The best American price currently available across books for the same side. */
  readonly bestPrice: number;
}

export interface ShopAdvantageResult {
  readonly avgImpliedProb: number;
  readonly bestImpliedProb: number;
  /**
   * Probability-point advantage from taking the best price instead of the
   * average price the Edge Score used. Never negative — clamped at zero rather
   * than allowed to go negative, since "best" is defined as the best across
   * books and can only be as good as, or better than, the average.
   */
  readonly shopAdvantageProb: number;
}

export function computeShopAdvantage(input: ShopAdvantageInput): ShopAdvantageResult {
  const avgImpliedProb = americanToImpliedProbability(input.avgPrice);
  const bestImpliedProb = americanToImpliedProbability(input.bestPrice);
  const shopAdvantageProb = Math.max(0, avgImpliedProb - bestImpliedProb);

  return { avgImpliedProb, bestImpliedProb, shopAdvantageProb };
}

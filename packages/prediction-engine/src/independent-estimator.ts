/**
 * Independent (non-market) probability + EV estimator — WIN-03, shadow-only.
 *
 * THE PROBLEM IT ADDRESSES: the live `confidence`/edge is partly circular — the
 * "edge" compares a fair probability de-vigged from the books' own prices against
 * those same books' offered price, so it largely re-expresses the vig rather than
 * a genuine, independent read. `trueEvScore`/`fairProbability` were therefore left
 * `null`.
 *
 * THIS estimator produces a probability for the picked side from FUNDAMENTALS ONLY
 * — rest, historical form, head-to-head, venue form, schedule stress — and is
 * deliberately INDEPENDENT of the offered price and the bookmaker consensus. That
 * independence is the whole point: it gives the engine a second opinion to measure
 * against the closing line (CLV) instead of a number derived from the line.
 *
 * SAFETY: this is SHADOW. It does NOT feed the published `confidence`, the tier,
 * the pick grade, or MODEL_VERSION. It only fills the two otherwise-null
 * diagnostic fields, and only when `SHADOW_INDEPENDENT_ESTIMATOR_ENABLED` is set.
 * The probability is intentionally a conservative v1 — small, bounded, honest —
 * not a claim of a proven edge.
 */

function clampLocal(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export interface IndependentEstimateInput {
  /** Non-market fundamental signals (in confidence-points), from game context. */
  readonly restAdvantageScore: number;
  readonly historicalFormScore: number;
  readonly headToHeadScore: number;
  readonly venueFormScore: number;
  readonly scheduleStressScore: number;
  /** Offered American price for the picked side — used ONLY for EV, never for the probability. */
  readonly offeredAmericanPrice: number;
}

export interface IndependentEstimate {
  /** Independent estimate of the picked side's win/cover probability (0..1). */
  readonly fairProbability: number;
  /** Expected value (% of stake) at the offered price given fairProbability, 1 decimal, clamped. */
  readonly trueEvScore: number;
}

/**
 * Maps net fundamental points to a probability delta off the 0.5 anchor. A spread
 * or total is engineered to be ~a coin flip at the fair line, so fundamentals tilt
 * it modestly. Conservative on purpose: ~+10 net points => +5% cover probability.
 */
const PROB_PER_POINT = 0.005;

/** Probability bounds — never claim near-certainty from a thin fundamental signal. */
const PROB_FLOOR = 0.05;
const PROB_CEIL = 0.95;

export function estimateIndependentProbability(
  input: IndependentEstimateInput
): IndependentEstimate {
  const fundamentalPoints =
    input.restAdvantageScore +
    input.historicalFormScore +
    input.headToHeadScore +
    input.venueFormScore +
    input.scheduleStressScore;

  // Probability uses ONLY fundamentals + the 0.5 anchor — never the price/consensus.
  const fairProbability = clampLocal(
    0.5 + fundamentalPoints * PROB_PER_POINT,
    PROB_FLOOR,
    PROB_CEIL
  );

  // EV at the offered price: profit-per-unit on a win, minus the stake on a loss.
  const price = input.offeredAmericanPrice || -110;
  const decimalProfit = price > 0 ? price / 100 : 100 / Math.abs(price);
  const ev = fairProbability * decimalProfit - (1 - fairProbability);
  const trueEvScore = clampLocal(Math.round(ev * 1000) / 10, -100, 100);

  return { fairProbability, trueEvScore };
}

/**
 * Multiplicative devig for DK decimal trueOdds (pre-seal only).
 *
 * DK's trueOdds are decimal prices that still contain the hold. For a two-way
 * market the raw implied probabilities are
 *
 *   q_i = 1 / d_i,   i in {1, 2}
 *
 * and their sum is greater than 1:
 *
 *   sum(q_i) = 1.045795   (the measured 4.58% hold)
 *
 * Multiplicative devig removes the hold by normalizing:
 *
 *   p_i = q_i / sum_j(q_j)
 *
 * After that step sum(p_i) = 1, but the favorite remains overpriced by
 * approximately +0.0537 relative to fair. The residual correction is
 *
 *   p_i_corr = p_i - 0.0537  if p_i > 0.5
 *              p_i + 0.0537  if p_i < 0.5
 *
 * followed by a final re-normalization so the pair sums to exactly 1.
 *
 * Pure function. No I/O. No seal() call. No tau mutation. No baseline write.
 */

/** Measured favorite residual from the 45-market sample (implied sum 1.045795). */
export const FAVORITE_RESIDUAL = 0.0537;

/** Measured raw implied sum across the 45-market sample. */
export const SAMPLE_IMPLIED_SUM = 1.045795;

/**
 * Convert a pair of decimal odds into a devigged, bias-corrected probability
 * pair. The pair is ordered: index 0 and index 1 are the two sides of the
 * market (e.g. over/under or home/away). The favorite is whichever side's
 * normalized probability exceeds 0.5.
 *
 * Throws when either decimal price is not greater than 1 (not a valid decimal
 * odds quote) or when the implied sum is not finite/positive.
 */
export function multiplicativeDevig(decimalOdds: [number, number]): [number, number] {
  const [d0, d1] = decimalOdds;
  if (!Number.isFinite(d0) || !Number.isFinite(d1) || d0 <= 1 || d1 <= 1) {
    throw new Error(`decimal odds must be finite and > 1, got [${d0}, ${d1}]`);
  }

  const q0 = 1 / d0;
  const q1 = 1 / d1;
  const rawSum = q0 + q1;
  if (!(rawSum > 0) || !Number.isFinite(rawSum)) {
    throw new Error(`implied sum must be finite and positive, got ${rawSum}`);
  }

  let p0 = q0 / rawSum;
  let p1 = q1 / rawSum;

  // Subtract the measured favorite residual from whichever side is the
  // favorite, and add the same mass to the underdog.
  if (p0 > 0.5) {
    p0 -= FAVORITE_RESIDUAL;
    p1 += FAVORITE_RESIDUAL;
  } else if (p1 > 0.5) {
    p1 -= FAVORITE_RESIDUAL;
    p0 += FAVORITE_RESIDUAL;
  }

  // Floor at zero before the final normalization. A favorite whose devigged
  // probability is below the residual would otherwise go negative.
  p0 = Math.max(0, p0);
  p1 = Math.max(0, p1);

  const total = p0 + p1;
  if (!(total > 0)) {
    // Degenerate input (both sides floored). Fall back to the fair coin.
    return [0.5, 0.5];
  }

  return [p0 / total, p1 / total];
}

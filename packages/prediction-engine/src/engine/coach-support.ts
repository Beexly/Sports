/**
 * coachSupport — the numeric contribution of the coach trail.
 *
 * Sums the weights of L0/L1/L2 factors so the confidence composite can read
 * them. Empty trail contributes 0. This keeps books out of Class A.
 */
import type { FactorDetail } from "@sports/types";

export function coachSupport(factors: readonly FactorDetail[]): number {
  return factors.reduce((sum, f) => sum + (f.weight ?? 0), 0);
}

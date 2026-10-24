/**
 * 2x2 difference in differences.
 *
 * Source opened: causalpy/experiments/diff_in_diff.py (Apache-2.0).
 * That class stores the group-by-post interaction as causal_impact.
 * In an additive model that coefficient is this contrast. Their fitter
 * was not copied.
 */

export function differenceInDifferences(
  treatedPre: number,
  treatedPost: number,
  controlPre: number,
  controlPost: number,
): number {
  const values = [treatedPre, treatedPost, controlPre, controlPost];
  if (values.some((v) => !Number.isFinite(v))) {
    throw new Error("difference-in-differences inputs must be finite");
  }
  return treatedPost - treatedPre - (controlPost - controlPre);
}

/**
 * Baseline joint under contemporaneous conditional independence printed in arXiv:2002.01193 (eq 1):
 *   f(y_mt | s_mt) = prod_k f(y_mtk | s_mt)
 * Fail closed when inputs are not valid probability masses in [0,1] or product is not usable.
 * Picks settled stay 0; this does not score picks.
 */
export function momentumHmmBaselineJoint(pmf1, pmf2) {
  if (typeof pmf1 !== "number" || !Number.isFinite(pmf1) || pmf1 < 0 || pmf1 > 1) {
    return { ok: false, reason: "pmf1_invalid" };
  }
  if (typeof pmf2 !== "number" || !Number.isFinite(pmf2) || pmf2 < 0 || pmf2 > 1) {
    return { ok: false, reason: "pmf2_invalid" };
  }
  const joint = pmf1 * pmf2;
  if (!Number.isFinite(joint) || joint < 0 || joint > 1) {
    return { ok: false, reason: "joint_outside_unit" };
  }
  return { ok: true, joint, eq: "1" };
}

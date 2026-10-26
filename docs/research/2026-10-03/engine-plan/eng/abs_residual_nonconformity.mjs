/**
 * Absolute residual non-conformity score from Messoudi, Destercke, Rousseau (arXiv:2101.12002v1).
 * Printed page https://arxiv.org/html/2101.12002 lines around eq (2):
 *   α_i = |y_i - ŷ_i|
 * Fail closed: non-finite inputs or missing values return not-ok. Picks settled stay 0.
 */
export function absoluteResidualNonconformity(y, yhat) {
  if (typeof y !== "number" || !Number.isFinite(y)) {
    return { ok: false, reason: "non_finite_y" };
  }
  if (typeof yhat !== "number" || !Number.isFinite(yhat)) {
    return { ok: false, reason: "non_finite_yhat" };
  }
  return { ok: true, alpha: Math.abs(y - yhat) };
}

/**
 * CovNav binary conformal prediction set from Wu et al. (arXiv:2610.27677v1).
 * Printed page https://arxiv.org/html/2610.27677v1 eq (2):
 *   C(x_test) = { y in Y | P-hat(y | x_test) >= 1 - q-hat }
 * where Y = {'Yes', 'No'}, nonconformity s = 1 - P-hat(y|x).
 * Fail closed: no set is returned when inputs are unusable.
 * Picks settled stay 0; this does not score picks.
 */
export function covnavBinaryConformalSet(pYes, pNo, qHat) {
  if (typeof pYes !== "number" || !Number.isFinite(pYes) || pYes < 0 || pYes > 1) {
    return { ok: false, reason: "invalid_p_yes" };
  }
  if (typeof pNo !== "number" || !Number.isFinite(pNo) || pNo < 0 || pNo > 1) {
    return { ok: false, reason: "invalid_p_no" };
  }
  if (typeof qHat !== "number" || !Number.isFinite(qHat) || qHat < 0 || qHat > 1) {
    return { ok: false, reason: "invalid_q_hat" };
  }
  const threshold = 1 - qHat;
  const set = [];
  if (pYes >= threshold) set.push("Yes");
  if (pNo >= threshold) set.push("No");
  return { ok: true, set, size: set.length, threshold, pYes, pNo, qHat };
}

/**
 * Minimum-Volume OTCP Euclidean ground cost from Zhang et al. (arXiv:2610.14907v1).
 * Printed page https://arxiv.org/html/2610.14907v1 eq (1):
 *   T_I ∈ arg min_{T#P=Q} ∫ ||s - T(s)||² dP(s)
 * Fail closed: no cost is invented when vectors are missing, non-finite, or mismatched dimension.
 * Picks settled stay 0; this does not score picks.
 */
export function mvOtcpEuclideanCost(s, t) {
  if (!Array.isArray(s) || !Array.isArray(t) || s.length === 0 || t.length === 0) {
    return { ok: false, reason: "empty_or_non_array_vectors" };
  }
  if (s.length !== t.length) {
    return { ok: false, reason: "dimension_mismatch", dim_s: s.length, dim_t: t.length };
  }
  let sum = 0;
  for (let i = 0; i < s.length; i++) {
    if (typeof s[i] !== "number" || !Number.isFinite(s[i]) || typeof t[i] !== "number" || !Number.isFinite(t[i])) {
      return { ok: false, reason: "non_finite_coordinate" };
    }
    const d = s[i] - t[i];
    sum += d * d;
  }
  return { ok: true, cost: sum, dim: s.length };
}

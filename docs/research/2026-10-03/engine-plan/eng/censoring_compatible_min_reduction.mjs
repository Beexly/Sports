/**
 * Censoring-compatible reduction map printed as eq (4) in arXiv:2610.24911v1
 * page https://arxiv.org/html/2610.24911v1 (Theorem 1):
 *   s(x) = min_{1 <= j <= d} psi_j (x^{(j)})
 * For the identity case psi_j(t) = t, which yields upper orthants.
 * Fail closed when the vector is empty, non-numeric, or contains non-finite values.
 * Picks settled stay 0; this does not score picks.
 */
export function censoringCompatibleMinReduction(x) {
  if (!Array.isArray(x) || x.length === 0) {
    return { ok: false, reason: "empty_or_non_array" };
  }
  for (const v of x) {
    if (typeof v !== "number" || !Number.isFinite(v)) {
      return { ok: false, reason: "non_finite_coordinate" };
    }
  }
  const s = Math.min(...x);
  if (!Number.isFinite(s)) {
    return { ok: false, reason: "min_not_finite" };
  }
  return { ok: true, s, eq: "4", d: x.length };
}

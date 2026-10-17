/**
 * Pairwise Markov property via copula densities, printed in arXiv:2610.19135 eq (2):
 *   X_i ⊥ X_j | X_{V\{i,j}}  ⇔  c(u) * c_{-{i,j}}(u_{-{i,j}}) = c_{-{i}}(u_{-{i}}) * c_{-{j}}(u_{-{j}})
 * Domain: density values positive and finite.
 * Fail closed when arguments are invalid or the equality does not hold within tolerance.
 * Picks settled stay 0; this does not score picks.
 */
export function studentCopulaPairwiseMarkov(c, c_ij, c_i, c_j, tol = 1e-9) {
  const vals = [c, c_ij, c_i, c_j];
  for (const v of vals) {
    if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) {
      return { ok: false, reason: "invalid_density" };
    }
  }
  if (typeof tol !== "number" || !Number.isFinite(tol) || tol < 0) {
    return { ok: false, reason: "invalid_tol" };
  }
  const left = c * c_ij;
  const right = c_i * c_j;
  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return { ok: false, reason: "product_overflow" };
  }
  const equal = Math.abs(left - right) <= tol * Math.max(1, Math.abs(left), Math.abs(right));
  return { ok: true, equal, left, right, eq: "(2)" };
}

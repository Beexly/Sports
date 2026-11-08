/**
 * TV-adjusted conformal coverage lower bound from Stiller et al. (arXiv:2611.08409).
 * Printed page https://arxiv.org/html/2611.08409v1 equation (2):
 *   P(y_test in C(x_test)) >= 1 - alpha - sum_{i=1}^n w_tilde_i * d_TV(z, z^i)
 *   where w_tilde_i = w_i / (sum w + 1), w_i in [0,1]
 * Fail closed on invalid alpha, weights, TV distances.
 * Picks settled stay 0.
 */
export function pdeTvAdjustedCoverage(alpha, weights, tvDistances) {
  if (typeof alpha !== "number" || !Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    return { ok: false, reason: "bad_alpha" };
  }
  if (!Array.isArray(weights) || !Array.isArray(tvDistances) || weights.length !== tvDistances.length || weights.length < 1) {
    return { ok: false, reason: "bad_arrays" };
  }
  const n = weights.length;
  let sumW = 0;
  for (let i = 0; i < n; i++) {
    const w = weights[i];
    if (typeof w !== "number" || !Number.isFinite(w) || w < 0 || w > 1) {
      return { ok: false, reason: "bad_weight" };
    }
    sumW += w;
    const tv = tvDistances[i];
    if (typeof tv !== "number" || !Number.isFinite(tv) || tv < 0 || tv > 1) {
      return { ok: false, reason: "bad_tv" };
    }
  }
  const denom = sumW + 1;
  let sumTerm = 0;
  for (let i = 0; i < n; i++) {
    const wTilde = weights[i] / denom;
    sumTerm += wTilde * tvDistances[i];
  }
  const lower = 1 - alpha - sumTerm;
  return { ok: true, lowerBound: lower, sumTerm: sumTerm, n: n };
}

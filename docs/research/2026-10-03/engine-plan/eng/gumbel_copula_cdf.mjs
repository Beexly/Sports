/**
 * Gumbel copula CDF printed as eq (20) in arXiv:2311.10900v4
 * page https://arxiv.org/html/2311.10900v4 (Appendix D.2):
 *   C_Gumbel(u) = exp{ - sum_k (-ln u_k)^theta }^{1/theta}
 * Printed domain: u in (0, 1]^m. theta is the single positive copula parameter;
 * fail closed unless theta >= 1 (Gumbel lower bound on that page's parametric form).
 * The exponent 1/theta is outside the exp, as printed; do not rewrite to the textbook nesting.
 * Picks settled stay 0; this does not score picks.
 */
export function gumbelCopulaCdf(u, theta) {
  if (!Array.isArray(u) || u.length < 1) {
    return { ok: false, reason: "u_not_nonempty_vector" };
  }
  for (let i = 0; i < u.length; i += 1) {
    const uk = u[i];
    if (typeof uk !== "number" || !Number.isFinite(uk) || uk <= 0 || uk > 1) {
      return { ok: false, reason: "u_outside_unit_interval", index: i };
    }
  }
  if (typeof theta !== "number" || !Number.isFinite(theta) || theta < 1) {
    return { ok: false, reason: "theta_below_gumbel_bound" };
  }
  let sum = 0;
  for (let i = 0; i < u.length; i += 1) {
    const term = (-Math.log(u[i])) ** theta;
    if (!Number.isFinite(term)) {
      return { ok: false, reason: "non_finite_generator_term", index: i };
    }
    sum += term;
  }
  if (!Number.isFinite(sum)) {
    return { ok: false, reason: "non_finite_generator_sum" };
  }
  const c = Math.exp(-sum) ** (1 / theta);
  if (!Number.isFinite(c) || c < 0 || c > 1) {
    return { ok: false, reason: "cdf_outside_unit_interval" };
  }
  return { ok: true, c, theta, m: u.length, eq: "20" };
}

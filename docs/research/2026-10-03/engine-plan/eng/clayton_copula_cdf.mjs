/**
 * Clayton copula CDF printed as eq (35) in arXiv:2602.15319v1
 * page https://arxiv.org/html/2602.15319v1 (Section 3.6.1):
 *   C_theta(u, v) = (u^{-theta} + v^{-theta} - 1)^{-1/theta}
 * theta > 0 and (u, v) in (0, 1] are the printed domain.
 * Fail closed when the arguments are outside that domain or the power is not usable.
 * Picks settled stay 0; this does not score picks.
 */
export function claytonCopulaCdf(u, v, theta) {
  if (typeof u !== "number" || !Number.isFinite(u) || u <= 0 || u > 1) {
    return { ok: false, reason: "u_outside_unit_interval" };
  }
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0 || v > 1) {
    return { ok: false, reason: "v_outside_unit_interval" };
  }
  if (typeof theta !== "number" || !Number.isFinite(theta) || theta <= 0) {
    return { ok: false, reason: "theta_not_positive" };
  }
  const inside = u ** -theta + v ** -theta - 1;
  if (!Number.isFinite(inside) || inside <= 0) {
    return { ok: false, reason: "non_positive_generator_sum" };
  }
  const c = inside ** (-1 / theta);
  if (!Number.isFinite(c) || c < 0 || c > 1) {
    return { ok: false, reason: "cdf_outside_unit_interval" };
  }
  return { ok: true, c, theta, eq: "35" };
}

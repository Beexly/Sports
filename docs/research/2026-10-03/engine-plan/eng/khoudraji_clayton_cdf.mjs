/**
 * Khoudraji-transformed Clayton copula CDF from arXiv:2610.28260v1
 * page https://arxiv.org/html/2610.28260v1 eq (2):
 *   C_{theta,alpha}(u) = psi^{-1}{ psi(u1^{alpha1}) + ... + psi(ud^{alphad}) } * prod uj^{1-alphaj}
 * Specialized to bivariate Clayton generator psi(t) = t^{-theta}-1, psi^{-1}(s)=(1+s)^{-1/theta}.
 * Fail closed when domain violated or result not a valid CDF value.
 * Picks settled stay 0; this does not score picks.
 */
export function khoudrajiClaytonCdf(u, v, alpha, beta, theta) {
  if (typeof u !== "number" || !Number.isFinite(u) || u <= 0 || u > 1) {
    return { ok: false, reason: "u_outside_unit_interval" };
  }
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0 || v > 1) {
    return { ok: false, reason: "v_outside_unit_interval" };
  }
  if (typeof alpha !== "number" || !Number.isFinite(alpha) || alpha < 0 || alpha > 1) {
    return { ok: false, reason: "alpha_outside_unit_interval" };
  }
  if (typeof beta !== "number" || !Number.isFinite(beta) || beta < 0 || beta > 1) {
    return { ok: false, reason: "beta_outside_unit_interval" };
  }
  if (typeof theta !== "number" || !Number.isFinite(theta) || theta <= 0) {
    return { ok: false, reason: "theta_not_positive" };
  }
  const ua = u ** alpha;
  const vb = v ** beta;
  if (!Number.isFinite(ua) || !Number.isFinite(vb) || ua <= 0 || vb <= 0) {
    return { ok: false, reason: "power_not_usable" };
  }
  const psiUa = ua ** -theta - 1;
  const psiVb = vb ** -theta - 1;
  const sum = psiUa + psiVb;
  if (!Number.isFinite(sum) || sum < -1) {
    return { ok: false, reason: "generator_sum_invalid" };
  }
  const inv = (1 + sum) ** (-1 / theta);
  if (!Number.isFinite(inv) || inv < 0 || inv > 1) {
    return { ok: false, reason: "inverse_generator_invalid" };
  }
  const indep = (u ** (1 - alpha)) * (v ** (1 - beta));
  if (!Number.isFinite(indep) || indep < 0 || indep > 1) {
    return { ok: false, reason: "independence_factor_invalid" };
  }
  const c = inv * indep;
  if (!Number.isFinite(c) || c < 0 || c > 1) {
    return { ok: false, reason: "cdf_outside_unit_interval" };
  }
  return { ok: true, c, theta, alpha, beta, eq: "2" };
}

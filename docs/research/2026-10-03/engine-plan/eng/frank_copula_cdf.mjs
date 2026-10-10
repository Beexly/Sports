/**
 * Frank copula CDF printed in Definition 1 of arXiv:2406.14814v1
 * page https://arxiv.org/html/2406.14814v1 :
 *   C_theta^Frank(u, v) = - (1/theta) * ln( 1 + (exp(-theta*u) - 1)*(exp(-theta*v) - 1) / (exp(-theta) - 1) )
 * for theta != 0, (u, v) in (0, 1].
 * Fail closed when arguments are outside the printed domain or the expression is not usable.
 * Picks settled stay 0; this does not score picks.
 */
export function frankCopulaCdf(u, v, theta) {
  if (typeof u !== "number" || !Number.isFinite(u) || u <= 0 || u > 1) {
    return { ok: false, reason: "u_outside_unit_interval" };
  }
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0 || v > 1) {
    return { ok: false, reason: "v_outside_unit_interval" };
  }
  if (typeof theta !== "number" || !Number.isFinite(theta) || theta === 0) {
    return { ok: false, reason: "theta_zero_or_nonfinite" };
  }
  const expThetaU = Math.exp(-theta * u);
  const expThetaV = Math.exp(-theta * v);
  const expTheta = Math.exp(-theta);
  const num = (expThetaU - 1) * (expThetaV - 1);
  const den = expTheta - 1;
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
    return { ok: false, reason: "generator_terms_unusable" };
  }
  const inside = 1 + num / den;
  if (!Number.isFinite(inside) || inside <= 0) {
    return { ok: false, reason: "non_positive_log_argument" };
  }
  const c = - (1 / theta) * Math.log(inside);
  if (!Number.isFinite(c) || c < 0 || c > 1) {
    return { ok: false, reason: "cdf_outside_unit_interval" };
  }
  return { ok: true, c, theta, eq: "Definition1" };
}

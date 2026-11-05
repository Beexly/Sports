/**
 * Nelsen2 copula CDF printed in arXiv:2310.17307v2
 * page https://arxiv.org/html/2310.17307v2 (Table of Dependence properties):
 *   C_theta^{N2}(u, v) = (1 - [(1-u)^theta + (1-v)^theta]^{1/theta})_+ 
 * theta >= 1 and (u, v) in [0, 1] are the printed domain.
 * Fail closed when the arguments are outside that domain or the expression is not usable.
 * Picks settled stay 0; this does not score picks.
 */
export function nelsen2CopulaCdf(u, v, theta) {
  if (typeof u !== "number" || !Number.isFinite(u) || u < 0 || u > 1) {
    return { ok: false, reason: "u_outside_unit_interval" };
  }
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1) {
    return { ok: false, reason: "v_outside_unit_interval" };
  }
  if (typeof theta !== "number" || !Number.isFinite(theta) || theta < 1) {
    return { ok: false, reason: "theta_less_than_one" };
  }
  const term = Math.pow(1 - u, theta) + Math.pow(1 - v, theta);
  if (!Number.isFinite(term) || term < 0) {
    return { ok: false, reason: "non_finite_generator_sum" };
  }
  const root = Math.pow(term, 1 / theta);
  if (!Number.isFinite(root)) {
    return { ok: false, reason: "non_finite_root" };
  }
  let c = 1 - root;
  if (c < 0) c = 0; // the + operator
  if (!Number.isFinite(c) || c > 1) {
    return { ok: false, reason: "cdf_outside_unit_interval" };
  }
  return { ok: true, c, theta, eq: "N2" };
}

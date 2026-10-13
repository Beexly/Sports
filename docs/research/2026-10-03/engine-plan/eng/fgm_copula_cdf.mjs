/**
 * Farlie-Gumbel-Morgenstern (FGM) copula CDF printed as eq (10) in arXiv:2207.14692
 * page https://ar5iv.labs.arxiv.org/html/2207.14692 :
 *   C(u1, u2) = u1*u2 + theta12*u1*u2*(1-u1)*(1-u2)
 * theta12 in [-1, 1] and (u, v) in (0, 1] are the printed domain.
 * Fail closed when the arguments are outside that domain or the result is unusable.
 * Picks settled stay 0; this does not score picks.
 */
export function fgmCopulaCdf(u, v, theta) {
  if (typeof u !== "number" || !Number.isFinite(u) || u <= 0 || u > 1) {
    return { ok: false, reason: "u_outside_unit_interval" };
  }
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0 || v > 1) {
    return { ok: false, reason: "v_outside_unit_interval" };
  }
  if (typeof theta !== "number" || !Number.isFinite(theta) || theta < -1 || theta > 1) {
    return { ok: false, reason: "theta_outside_fgm_domain" };
  }
  const c = u * v * (1 + theta * (1 - u) * (1 - v));
  if (!Number.isFinite(c) || c < 0 || c > 1) {
    return { ok: false, reason: "cdf_outside_unit_interval" };
  }
  return { ok: true, c, theta, eq: "10" };
}

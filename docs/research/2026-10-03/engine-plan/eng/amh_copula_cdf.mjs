/**
 * Ali-Mikhail-Haq (AMH) copula CDF printed as eq (2.19) in arXiv:0812.1316
 * page https://ar5iv.labs.arxiv.org/html/0812.1316 (construction via Sklar):
 *   C(u, v) = u*v / (1 - theta*(1-u)*(1-v))
 * theta in [-1, 1) and (u, v) in (0, 1] are the printed domain.
 * Fail closed when the arguments are outside that domain or the denominator is not usable.
 * Picks settled stay 0; this does not score picks.
 */
export function amhCopulaCdf(u, v, theta) {
  if (typeof u !== "number" || !Number.isFinite(u) || u <= 0 || u > 1) {
    return { ok: false, reason: "u_outside_unit_interval" };
  }
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0 || v > 1) {
    return { ok: false, reason: "v_outside_unit_interval" };
  }
  if (typeof theta !== "number" || !Number.isFinite(theta) || theta < -1 || theta >= 1) {
    return { ok: false, reason: "theta_outside_amh_domain" };
  }
  const denom = 1 - theta * (1 - u) * (1 - v);
  if (!Number.isFinite(denom) || denom <= 0) {
    return { ok: false, reason: "non_positive_denominator" };
  }
  const c = (u * v) / denom;
  if (!Number.isFinite(c) || c < 0 || c > 1) {
    return { ok: false, reason: "cdf_outside_unit_interval" };
  }
  return { ok: true, c, theta, eq: "2.19" };
}

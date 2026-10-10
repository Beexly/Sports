/**
 * Joe copula CDF printed in arXiv:1603.01871 (section 6.4):
 *   Q_alpha(v1, v2) = 1 - ((1-v1)^alpha + (1-v2)^alpha - (1-v1)^alpha*(1-v2)^alpha)^{1/alpha}
 * alpha >= 1 and (v1, v2) in [0, 1] are the printed domain.
 * Fail closed when the arguments are outside that domain or the expression is not usable.
 * Picks settled stay 0; this does not score picks.
 */
export function joeCopulaCdf(u, v, alpha) {
  if (typeof u !== "number" || !Number.isFinite(u) || u < 0 || u > 1) {
    return { ok: false, reason: "u_outside_unit_interval" };
  }
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1) {
    return { ok: false, reason: "v_outside_unit_interval" };
  }
  if (typeof alpha !== "number" || !Number.isFinite(alpha) || alpha < 1) {
    return { ok: false, reason: "alpha_less_than_one" };
  }
  const a = (1 - u) ** alpha;
  const b = (1 - v) ** alpha;
  const inside = a + b - a * b;
  if (!Number.isFinite(inside) || inside < 0) {
    return { ok: false, reason: "non_positive_inside" };
  }
  const root = inside ** (1 / alpha);
  if (!Number.isFinite(root)) {
    return { ok: false, reason: "root_not_finite" };
  }
  const c = 1 - root;
  if (!Number.isFinite(c) || c < 0 || c > 1) {
    return { ok: false, reason: "cdf_outside_unit_interval" };
  }
  return { ok: true, c, alpha, eq: "6.4" };
}

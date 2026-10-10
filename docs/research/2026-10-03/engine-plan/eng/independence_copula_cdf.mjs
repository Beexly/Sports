/**
 * Independence (product) copula CDF printed in arXiv:0912.2816 (eq 2.4):
 *   C(u, v; 0) = u · v =: Π(u, v)
 * Domain (u, v) in [0, 1].
 * Fail closed when the arguments are outside that domain or the expression is not usable.
 * Picks settled stay 0; this does not score picks.
 */
export function independenceCopulaCdf(u, v) {
  if (typeof u !== "number" || !Number.isFinite(u) || u < 0 || u > 1) {
    return { ok: false, reason: "u_outside_unit_interval" };
  }
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1) {
    return { ok: false, reason: "v_outside_unit_interval" };
  }
  const c = u * v;
  if (!Number.isFinite(c) || c < 0 || c > 1) {
    return { ok: false, reason: "cdf_outside_unit_interval" };
  }
  return { ok: true, c, eq: "2.4" };
}

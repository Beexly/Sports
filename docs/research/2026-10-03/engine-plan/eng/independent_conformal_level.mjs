/**
 * Independent conformal marginal level printed in arXiv:2411.02114v2
 * page https://arxiv.org/html/2411.02114v2 (around L64):
 *   1 - α_j = (1 - α)^{1/d}
 * for equal treatment of d targets so product of marginals equals 1-α.
 * Fail closed outside α in [0,1), d positive integer.
 * Picks settled stay 0; this does not score picks.
 */
export function independentConformalLevel(alpha, d) {
  if (typeof alpha !== "number" || !Number.isFinite(alpha) || alpha < 0 || alpha >= 1) {
    return { ok: false, reason: "alpha_outside_[0,1)" };
  }
  if (typeof d !== "number" || !Number.isInteger(d) || d < 1) {
    return { ok: false, reason: "d_not_positive_integer" };
  }
  const level = (1 - alpha) ** (1 / d);
  if (!Number.isFinite(level) || level < 0 || level > 1) {
    return { ok: false, reason: "level_outside_unit_interval" };
  }
  return { ok: true, level, alpha, d, eq: "independent_marginal" };
}

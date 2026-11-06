/**
 * Mask-adaptive conformal coverage from Fan et al. (arXiv:2611.01724v1).
 * Printed page https://arxiv.org/html/2611.01724v1 eq (1):
 *   P(Y^{n+1} in C_alpha(X^{n+1}) | Cond) >= 1 - alpha - epsilon(Cond)
 * Fail closed: non-finite or out-of-range inputs return not-ok. Picks settled stay 0.
 */
export function maskAdaptiveCoverage(coverage, alpha, epsilon = 0) {
  if (typeof coverage !== "number" || !Number.isFinite(coverage) || coverage < 0 || coverage > 1) {
    return { ok: false, reason: "non_finite_or_invalid_coverage" };
  }
  if (typeof alpha !== "number" || !Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    return { ok: false, reason: "non_finite_or_invalid_alpha" };
  }
  if (typeof epsilon !== "number" || !Number.isFinite(epsilon) || epsilon < 0) {
    return { ok: false, reason: "non_finite_or_invalid_epsilon" };
  }
  const target = 1 - alpha - epsilon;
  return { ok: true, valid: coverage >= target, target };
}

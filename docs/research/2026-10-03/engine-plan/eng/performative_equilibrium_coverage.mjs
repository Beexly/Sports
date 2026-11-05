/**
 * Equilibrium-valid coverage from Mahrous and Di Pietro (arXiv:2611.05277v1).
 * Printed page https://arxiv.org/html/2611.05277v1 eq (1):
 *   P_{(X,Y)~D(f*)}(Y in C_{f*}(X)) >= 1 - alpha
 * Fail closed: non-finite or out-of-range inputs return not-ok. Picks settled stay 0.
 */
export function performativeEquilibriumCoverage(coverage, alpha) {
  if (typeof coverage !== "number" || !Number.isFinite(coverage) || coverage < 0 || coverage > 1) {
    return { ok: false, reason: "non_finite_or_invalid_coverage" };
  }
  if (typeof alpha !== "number" || !Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    return { ok: false, reason: "non_finite_or_invalid_alpha" };
  }
  const target = 1 - alpha;
  return { ok: true, valid: coverage >= target, target };
}

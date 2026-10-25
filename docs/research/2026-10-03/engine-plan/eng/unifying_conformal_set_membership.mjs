/**
 * Full conformal set membership check from Barber, Tibshirani (arXiv:2504.02292v1).
 * Printed page https://arxiv.org/html/2504.02292v1 eq (3):
 *   C(X_{n+1}) = { y : S_{n+1}^y <= Quantile_{1-alpha}(S_1^y, ..., S_{n+1}^y) }
 * Fail closed: no membership decision when scores/alpha are not usable.
 * Picks settled stay 0; this does not score picks.
 */
export function unifyingConformalSetMembership(scores, alpha) {
  if (!Array.isArray(scores) || scores.length < 1) {
    return { ok: false, reason: "empty_or_short_scores" };
  }
  if (typeof alpha !== "number" || !(alpha > 0) || !(alpha < 1)) {
    return { ok: false, reason: "alpha_out_of_unit_interval" };
  }
  const nPlus1 = scores.length;
  for (let i = 0; i < nPlus1; i++) {
    if (typeof scores[i] !== "number" || !Number.isFinite(scores[i])) {
      return { ok: false, reason: "non_finite_score" };
    }
  }
  const ordered = scores.slice().sort((a, b) => a - b);
  const tau = 1 - alpha;
  const k = Math.ceil(tau * nPlus1);
  if (!Number.isInteger(k) || k < 1 || k > nPlus1) {
    return { ok: false, reason: "quantile_index_invalid", nPlus1, k };
  }
  const q = ordered[k - 1];
  const testScore = scores[nPlus1 - 1];
  const inSet = testScore <= q;
  return { ok: true, inSet, quantile: q, nPlus1, k, level: k / nPlus1 };
}

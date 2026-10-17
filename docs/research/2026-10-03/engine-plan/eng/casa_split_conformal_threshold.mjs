/**
 * Split conformal threshold from Zheng, Zhu (arXiv:2610.11349v1).
 * Printed page https://arxiv.org/html/2610.11349v1 eq (1):
 *   C_hat_alpha(x) = { y in Y : S(x, y) <= q_hat }
 *   q_hat = Q(S_1:n ; ceil((n+1)*(1-alpha))/n )
 * Fail closed: no finite threshold when inflated index exceeds n, empty scores, or bad alpha.
 * Picks settled stay 0; this does not score picks.
 */
export function casaSplitConformalThreshold(scores, alpha) {
  if (!Array.isArray(scores) || scores.length === 0) {
    return { ok: false, reason: "empty_calibration" };
  }
  if (typeof alpha !== "number" || !(alpha > 0) || !(alpha < 1)) {
    return { ok: false, reason: "alpha_out_of_unit_interval" };
  }
  const n = scores.length;
  for (let i = 0; i < n; i++) {
    if (typeof scores[i] !== "number" || !Number.isFinite(scores[i])) {
      return { ok: false, reason: "non_finite_score" };
    }
  }
  const k = Math.ceil((n + 1) * (1 - alpha));
  if (!Number.isInteger(k) || k < 1 || k > n) {
    return { ok: false, reason: "inflated_quantile_exceeds_n", n, k };
  }
  const ordered = scores.slice().sort((a, b) => a - b);
  return { ok: true, threshold: ordered[k - 1], n, k, level: k / n };
}

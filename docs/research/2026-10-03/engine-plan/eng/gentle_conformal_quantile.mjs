/**
 * Gentle conformal quantile from Angelopoulos, Bates (arXiv:2107.07511v6).
 * Printed page https://arxiv.org/html/2107.07511v6 lines 61-63:
 *   q_level = ceil((n+1)*(1-alpha))/n
 *   qhat = higher-quantile of calibration scores at q_level
 * Fail closed: no finite threshold is invented when the inflated index exceeds n,
 * or when scores/alpha are not usable. Picks settled stay 0; this does not score picks.
 */
export function gentleConformalQuantile(scores, alpha) {
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

/**
 * Split conformal threshold from Gibbs, Cherian, Candes (arXiv:2305.12616v3).
 * Printed page https://arxiv.org/html/2305.12616v3 lines 125-130, eq (2.1):
 *   S* = (ceil((n+1)*(1-alpha))/n)-quantile of calibration scores
 *   C_split(X) = { y : S(X, y) <= S* }
 * Fail closed: no finite threshold is invented when the inflated index exceeds n,
 * or when scores/alpha are not usable. Picks settled stay 0; this does not score picks.
 */
export function splitConformalThreshold(scores, alpha) {
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

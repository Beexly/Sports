/**
 * Split conformal quantile for Distribution-to-Distribution Regression from Tran et al. (arXiv:2611.06320v1).
 * Printed page https://arxiv.org/html/2611.06320v1 :
 *   q̂ ≔ the ⌈(d0 + 1)(1 − γ)⌉ / d0 quantile of {s_i}_{i=1}^{d0}
 *   equivalently the ⌈(d0 + 1)(1 − γ)⌉-th order statistic of the nonconformity scores.
 * Fail closed: scores finite array length >=1, gamma in (0,1); returns no q if invalid.
 * Picks settled stay 0; this does not score picks.
 */
export function d2dSplitConformalQuantile(scores, gamma) {
  if (!Array.isArray(scores) || scores.length < 1) {
    return { ok: false, reason: "bad_scores" };
  }
  const n = scores.length;
  if (typeof gamma !== "number" || !Number.isFinite(gamma) || gamma <= 0 || gamma >= 1) {
    return { ok: false, reason: "bad_gamma" };
  }
  for (let i = 0; i < n; i++) {
    const s = scores[i];
    if (typeof s !== "number" || !Number.isFinite(s)) {
      return { ok: false, reason: "non_finite_score" };
    }
  }
  const sorted = [...scores].sort((a, b) => a - b);
  const k = Math.ceil((n + 1) * (1 - gamma));
  if (k < 1 || k > n) {
    return { ok: false, reason: "quantile_index_out_of_range" };
  }
  const q = sorted[k - 1]; // 1-based order statistic
  return { ok: true, q, k, n, gamma };
}

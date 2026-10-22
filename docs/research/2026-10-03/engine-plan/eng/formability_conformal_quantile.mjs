/**
 * Inflated conformal quantile from Zargarbashi et al. (arXiv:2610.24510).
 * Printed page https://arxiv.org/html/2610.24510 eq (1):
 *   q_θ = Q_{α,n}(r_{1:n}) := Q_α ( sum_{i=1}^n 1/(n+1) δ_{r_i^θ} + 1/(n+1) δ_∞ )
 * Fail closed: no finite threshold is invented when the inflated index exceeds n,
 * or when scores/alpha are not usable. Picks settled stay 0; this does not score picks.
 */
export function formabilityConformalQuantile(scores, alpha) {
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

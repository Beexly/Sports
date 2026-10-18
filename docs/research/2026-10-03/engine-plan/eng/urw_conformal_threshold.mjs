/**
 * URW split-conformal threshold from Pan et al. (arXiv:2610.21214v1).
 * Printed page https://arxiv.org/html/2610.21214v1 eq (2):
 *   τ_α = Quantile({s_i}, ⌈(1-α)(N_cal+1)⌉ / N_cal )
 * Fail closed: no finite threshold when inputs unusable or index exceeds.
 * Picks settled stay 0; this does not score picks.
 */
export function urwConformalThreshold(scores, alpha) {
  if (!Array.isArray(scores) || scores.length === 0) {
    return { ok: false, reason: "empty_scores" };
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
  const level = Math.ceil((1 - alpha) * (n + 1)) / n;
  if (!Number.isFinite(level) || level < 0 || level > 1) {
    return { ok: false, reason: "quantile_level_out_of_range", n, level };
  }
  const ordered = scores.slice().sort((a, b) => a - b);
  const idx = Math.ceil(level * n) - 1;
  if (idx < 0 || idx >= n) {
    return { ok: false, reason: "order_statistic_index_exceeds_n", n, idx };
  }
  return { ok: true, threshold: ordered[idx], n, level, idx };
}

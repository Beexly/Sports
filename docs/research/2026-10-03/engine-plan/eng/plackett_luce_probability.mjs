/**
 * Plackett-Luce probability printed as eq (1) in Yeung et al., arXiv:2501.16565v1
 * page https://arxiv.org/html/2501.16565v1 (Methods, Plackett-Luce model):
 *   P(\omega | \pi) = \prod_{r=1}^{K-1} \pi_{\omega_r} / \sum_{q=r}^K \pi_{\omega_q}
 * Fail closed when scores, order, or K are not usable.
 * Picks settled stay 0; this does not score picks.
 */
export function plackettLuceProbability(scores, order) {
  if (!Array.isArray(scores) || scores.length === 0) {
    return { ok: false, reason: "scores_not_array" };
  }
  if (!Array.isArray(order) || order.length < 2) {
    return { ok: false, reason: "order_too_short" };
  }
  const K = order.length;
  for (let i = 0; i < K; i++) {
    const idx = order[i];
    if (!Number.isInteger(idx) || idx < 0 || idx >= scores.length) {
      return { ok: false, reason: "order_index_out_of_range" };
    }
    if (typeof scores[idx] !== "number" || !Number.isFinite(scores[idx]) || scores[idx] <= 0) {
      return { ok: false, reason: "non_positive_or_non_finite_score" };
    }
  }
  let p = 1;
  for (let r = 0; r < K - 1; r++) {
    const num = scores[order[r]];
    let den = 0;
    for (let q = r; q < K; q++) {
      den += scores[order[q]];
    }
    if (!Number.isFinite(den) || den <= 0) {
      return { ok: false, reason: "non_positive_denominator" };
    }
    const term = num / den;
    if (!Number.isFinite(term) || term <= 0 || term > 1) {
      return { ok: false, reason: "invalid_term" };
    }
    p *= term;
  }
  if (!Number.isFinite(p) || p <= 0 || p > 1) {
    return { ok: false, reason: "non_finite_or_invalid_probability" };
  }
  return { ok: true, probability: p, k: K };
}

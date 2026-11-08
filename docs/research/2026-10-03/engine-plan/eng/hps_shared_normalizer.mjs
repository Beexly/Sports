/**
 * Shared normalizer for HPS scores from Sharma & Tapadiya (arXiv:2611.07502v1).
 * Printed page https://arxiv.org/html/2611.07502v1 eq (1):
 *   g_t(z) = T * log[ (1/K_t) * sum_{j in V_t} exp( <z, e_j> / T ) ]
 * Fail closed: no finite normalizer is invented when inputs are unusable.
 * Picks settled stay 0; this does not score picks.
 */
export function hpsSharedNormalizer(similarities, T) {
  if (!Array.isArray(similarities) || similarities.length === 0) {
    return { ok: false, reason: "empty_similarities" };
  }
  if (typeof T !== "number" || !(T > 0) || !Number.isFinite(T)) {
    return { ok: false, reason: "invalid_temperature" };
  }
  const K = similarities.length;
  let sum = 0;
  for (let i = 0; i < K; i++) {
    const s = similarities[i];
    if (typeof s !== "number" || !Number.isFinite(s)) {
      return { ok: false, reason: "non_finite_similarity" };
    }
    sum += Math.exp(s / T);
  }
  if (!Number.isFinite(sum) || sum <= 0) {
    return { ok: false, reason: "invalid_sum" };
  }
  const g = T * Math.log(sum / K);
  if (!Number.isFinite(g)) {
    return { ok: false, reason: "non_finite_normalizer" };
  }
  return { ok: true, normalizer: g, K, T };
}

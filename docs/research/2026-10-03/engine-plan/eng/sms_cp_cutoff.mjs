/**
 * SMSCP conformal cutoff from Han & Lin (arXiv:2610.19484v1).
 * Printed page https://arxiv.org/html/2610.19484v1 eq (8):
 *   q̂_t = R_{(m_t)}^{N_t(ρ)},   m_t = ⌈(k_t(ρ) + 1)(1 − α)⌉
 * where R_{(m)} is the m-th order statistic of the matched reference scores.
 * Fail closed: no finite cutoff when m exceeds k, or inputs unusable.
 * Picks settled stay 0; this does not score picks.
 */
export function smsCpCutoff(matchedScores, alpha) {
  if (!Array.isArray(matchedScores) || matchedScores.length === 0) {
    return { ok: false, reason: "empty_matched_set" };
  }
  if (typeof alpha !== "number" || !(alpha > 0) || !(alpha < 1)) {
    return { ok: false, reason: "alpha_out_of_unit_interval" };
  }
  const k = matchedScores.length;
  for (let i = 0; i < k; i++) {
    if (typeof matchedScores[i] !== "number" || !Number.isFinite(matchedScores[i])) {
      return { ok: false, reason: "non_finite_score" };
    }
  }
  const m = Math.ceil((k + 1) * (1 - alpha));
  if (!Number.isInteger(m) || m < 1 || m > k) {
    return { ok: false, reason: "order_statistic_index_exceeds_k", k, m };
  }
  const ordered = matchedScores.slice().sort((a, b) => a - b);
  return { ok: true, cutoff: ordered[m - 1], k, m, level: m / k };
}

/**
 * Per-parameter nonconformity score from Moslemi, Liang, Shahbaba (arXiv:2610.17146v1).
 * Printed page https://arxiv.org/html/2610.17146v1 :
 *   ρ_θ(x, y) = -log p_θ(y | x)
 * Fail closed: no finite score when density is non-positive, non-finite, or missing.
 * Picks settled stay 0; this does not score picks.
 */
export function scopeNonconformityScore(density) {
  if (typeof density !== "number" || !Number.isFinite(density)) {
    return { ok: false, reason: "non_finite_density" };
  }
  if (!(density > 0)) {
    return { ok: false, reason: "non_positive_density" };
  }
  const score = -Math.log(density);
  if (!Number.isFinite(score)) {
    return { ok: false, reason: "score_not_finite" };
  }
  return { ok: true, score };
}

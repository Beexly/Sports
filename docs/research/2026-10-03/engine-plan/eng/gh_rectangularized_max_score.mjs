/**
 * Rectangularized max nonconformity score for generalized hyperrectangles
 * from Alami & Ben Taieb (arXiv:2611.05543v1).
 * Printed page https://arxiv.org/pdf/2611.05543v1 equation (5):
 *   s_H(x, y) := max_{j∈[d]} s_H^j (x, y_j)
 * Fail closed: scores finite array length >=1; returns no max if invalid.
 * Picks settled stay 0; this does not score picks.
 */
export function ghRectangularizedMaxScore(coordScores) {
  if (!Array.isArray(coordScores) || coordScores.length < 1) {
    return { ok: false, reason: "bad_scores" };
  }
  let max = -Infinity;
  for (let i = 0; i < coordScores.length; i++) {
    const s = coordScores[i];
    if (typeof s !== "number" || !Number.isFinite(s)) {
      return { ok: false, reason: "non_finite_score" };
    }
    if (s > max) max = s;
  }
  if (!Number.isFinite(max)) {
    return { ok: false, reason: "no_finite_max" };
  }
  return { ok: true, max, d: coordScores.length };
}

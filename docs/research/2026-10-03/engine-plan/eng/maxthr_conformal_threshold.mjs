/**
 * Max-threshold conformal predictor under inference-time model shift.
 * Printed page https://arxiv.org/html/2610.28937v1 Section 4.1:
 *   \hat{q}_{\max} := \max_{c \in \mathcal{C}} \hat{q}_c
 *   \hat{S}_{\max}(x) = \{ y : A(\pi, y) \leq \hat{q}_{\max} \}
 * Fail closed: no max is invented from empty, non-finite, or out-of-range per-config thresholds.
 * Picks settled stay 0; this does not score picks.
 */
export function maxThrConformalThreshold(thresholds) {
  if (!Array.isArray(thresholds) || thresholds.length === 0) {
    return { ok: false, reason: "empty_thresholds" };
  }
  let maxQ = -Infinity;
  for (let i = 0; i < thresholds.length; i++) {
    const q = thresholds[i];
    if (typeof q !== "number" || !Number.isFinite(q)) {
      return { ok: false, reason: "non_finite_threshold" };
    }
    if (q < 0) {
      return { ok: false, reason: "negative_threshold" };
    }
    if (q > maxQ) maxQ = q;
  }
  if (!Number.isFinite(maxQ)) {
    return { ok: false, reason: "no_finite_max" };
  }
  return { ok: true, threshold: maxQ, n: thresholds.length };
}

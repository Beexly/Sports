/**
 * Split CQR interval width ordering from Srivastava, Kassetty (arXiv:2611.01512v1).
 * Printed page https://arxiv.org/html/2611.01512v1 Remark 1:
 *   |C(x)| = (q̂_hi(x) − q̂_lo(x)) + 2 Q̂
 *   Q̂ does not depend on x, so ranking by |C(x)| equals ranking by uncalibrated quantile width.
 * Fail closed: no width when inputs invalid.
 * Picks settled stay 0; this does not score picks.
 */
export function splitCqrWidthOrdering(qLo, qHi, qHat) {
  if (typeof qLo !== "number" || !Number.isFinite(qLo)) {
    return { ok: false, reason: "non_finite_q_lo" };
  }
  if (typeof qHi !== "number" || !Number.isFinite(qHi)) {
    return { ok: false, reason: "non_finite_q_hi" };
  }
  if (typeof qHat !== "number" || !Number.isFinite(qHat) || qHat < 0) {
    return { ok: false, reason: "non_finite_or_negative_q_hat" };
  }
  if (qHi < qLo) {
    return { ok: false, reason: "q_hi_below_q_lo" };
  }
  const baseWidth = qHi - qLo;
  const width = baseWidth + 2 * qHat;
  return { ok: true, width, baseWidth, qHat, delta: 2 * qHat };
}

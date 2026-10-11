/**
 * Conformal Elo interval from Kargi, Salinas (arXiv:2606.13221v2).
 * Printed page https://arxiv.org/html/2606.13221v2 eq (4):
 *   C = [Elo - q̂ * SE, Elo + q̂ * SE]
 *   where q̂ is the ceil((1-α)(n+1))-th smallest of calibration nonconformity scores S_i
 * Fail closed: no interval when inputs invalid or quantile exceeds n.
 * Picks settled stay 0; this does not score picks.
 */
export function conformalEloInterval(calibrationS, alpha, newElo, newSE) {
  if (!Array.isArray(calibrationS) || calibrationS.length === 0) {
    return { ok: false, reason: "empty_calibration" };
  }
  if (typeof alpha !== "number" || !(alpha > 0) || !(alpha < 1)) {
    return { ok: false, reason: "alpha_out_of_unit_interval" };
  }
  if (typeof newElo !== "number" || !Number.isFinite(newElo)) {
    return { ok: false, reason: "non_finite_elo" };
  }
  if (typeof newSE !== "number" || !Number.isFinite(newSE) || newSE <= 0) {
    return { ok: false, reason: "non_positive_se" };
  }
  const n = calibrationS.length;
  for (let i = 0; i < n; i++) {
    if (typeof calibrationS[i] !== "number" || !Number.isFinite(calibrationS[i]) || calibrationS[i] < 0) {
      return { ok: false, reason: "non_finite_or_negative_score" };
    }
  }
  const k = Math.ceil((n + 1) * (1 - alpha));
  if (!Number.isInteger(k) || k < 1 || k > n) {
    return { ok: false, reason: "inflated_quantile_exceeds_n", n, k };
  }
  const ordered = calibrationS.slice().sort((a, b) => a - b);
  const q = ordered[k - 1];
  const half = q * newSE;
  return { ok: true, lower: newElo - half, upper: newElo + half, q, n, k, level: k / n };
}

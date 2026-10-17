/**
 * Weighted backward conformal e-value from Meghrazi, Li (arXiv:2610.16048v1).
 * Printed page https://arxiv.org/html/2610.16048v1 Definition 2:
 *   E^(w)(y) := W * S(X_{n+1}, y) / (sum_{i=1}^n w_i S_i + w_{n+1} S(X_{n+1}, y))
 *   where W := sum_{j=1}^{n+1} w_j
 * Fail closed: requires non-negative finite scores, positive finite weights; returns no E when denom is zero or inputs unusable.
 * Picks settled stay 0; this does not score picks.
 */
export function weightedBcpEValue(calScores, calWeights, testScore, testWeight) {
  if (!Array.isArray(calScores) || !Array.isArray(calWeights)) {
    return { ok: false, reason: "cal_not_array" };
  }
  const n = calScores.length;
  if (calWeights.length !== n) {
    return { ok: false, reason: "len_mismatch" };
  }
  if (typeof testScore !== "number" || !Number.isFinite(testScore) || testScore < 0) {
    return { ok: false, reason: "bad_test_score" };
  }
  if (typeof testWeight !== "number" || !Number.isFinite(testWeight) || testWeight <= 0) {
    return { ok: false, reason: "bad_test_weight" };
  }
  let sumWeighted = 0;
  let sumW = testWeight;
  for (let i = 0; i < n; i++) {
    const s = calScores[i];
    const w = calWeights[i];
    if (typeof s !== "number" || !Number.isFinite(s) || s < 0) {
      return { ok: false, reason: "bad_cal_score" };
    }
    if (typeof w !== "number" || !Number.isFinite(w) || w <= 0) {
      return { ok: false, reason: "bad_cal_weight" };
    }
    sumWeighted += w * s;
    sumW += w;
  }
  const denom = sumWeighted + testWeight * testScore;
  if (!(denom > 0)) {
    return { ok: false, reason: "zero_denom" };
  }
  const E = (sumW * testScore) / denom;
  return { ok: true, eValue: E, n, sumW };
}

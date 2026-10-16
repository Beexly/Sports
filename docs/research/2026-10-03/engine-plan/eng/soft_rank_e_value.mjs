/**
 * Soft-rank e-variable from Gauthier, Bach, Jordan (arXiv:2510.04318v2).
 * Printed page https://arxiv.org/html/2510.04318v2 equation (2):
 *   E = S(X_test, Y_test) / [ (1/(n+1)) * (sum_{i=1}^n S(X_i, Y_i) + S(X_test, Y_test)) ]
 * Fail closed: requires non-negative finite scores; returns no E when denom is zero or inputs unusable.
 * Picks settled stay 0; this does not score picks.
 */
export function softRankEValue(calScores, testScore) {
  if (!Array.isArray(calScores)) {
    return { ok: false, reason: "cal_not_array" };
  }
  const n = calScores.length;
  if (typeof testScore !== "number" || !Number.isFinite(testScore) || testScore < 0) {
    return { ok: false, reason: "bad_test_score" };
  }
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const s = calScores[i];
    if (typeof s !== "number" || !Number.isFinite(s) || s < 0) {
      return { ok: false, reason: "bad_cal_score" };
    }
    sum += s;
  }
  const denom = (sum + testScore) / (n + 1);
  if (!(denom > 0)) {
    return { ok: false, reason: "zero_denom" };
  }
  const E = testScore / denom;
  return { ok: true, eValue: E, n, sumCal: sum };
}

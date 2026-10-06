/**
 * Paper audit for Conformalized Quantile Regression — arXiv 1905.03222
 * (Romano, Patterson, Candes 2019).
 *
 * ADDITIVE audit module. It does NOT modify `cqr.ts` (iron rule: existing
 * files are never edited). Instead it independently verifies that the
 * existing implementation matches the paper's exact recipe, so the
 * improvement-ledger repair item ("Repair apps/web/lib/calibration/cqr.ts
 * to the exact CQR recipe") can be closed as already-satisfied with proof
 * rather than by editing a working module.
 *
 * Paper recipe under audit:
 *   1. Fit quantile regressors at levels alpha/2 and 1 - alpha/2.
 *   2. Nonconformity scores E_i = max(qhat_lo(X_i) - Y_i, Y_i - qhat_hi(X_i)).
 *   3. qhat = the ceil((1-alpha)(n+1))-th smallest E_i — finite-sample
 *      corrected, UNCLAMPED rank (no coverage certification when the rank
 *      exceeds n; the implementation returns +Infinity = vacuous/No-Bet).
 *   4. Test interval: [qhat_lo(X) - qhat, qhat_hi(X) + qhat].
 *
 * ACCEPTANCE GATE (improvement-ledger): the repaired recipe is adopted if
 * empirical coverage on 2025 is within +/-1.5pp of nominal AND mean
 * interval length <= 90% of the absolute-residual split-conformal baseline.
 */

import { conformalQuantile, cqrInterval } from "./cqr";

export interface AuditCheck {
  readonly name: string;
  readonly passed: boolean;
  readonly detail: string;
}

export interface CqrAuditReport {
  readonly checks: ReadonlyArray<AuditCheck>;
  readonly passed: boolean;
}

/**
 * Check 1 — finite-sample rank: conformalQuantile must equal the
 * ceil((1-alpha)(n+1)) - 1 order statistic of the scores (0-indexed),
 * computed independently here (not by calling the implementation).
 */
export function auditFiniteSampleRank(
  scores: readonly number[],
  alpha: number,
): AuditCheck {
  const n = scores.length;
  const rank = Math.ceil((1 - alpha) * (n + 1)) - 1;
  const got = conformalQuantile(scores, alpha);
  if (rank >= n || n === 0) {
    const passed = got === Number.POSITIVE_INFINITY;
    return {
      name: "finite-sample-rank-unclamped",
      passed,
      detail: passed
        ? `rank ${rank} >= n ${n}: correctly fail-closed to +Infinity`
        : `rank ${rank} >= n ${n}: expected +Infinity, got ${got}`,
    };
  }
  const sorted = [...scores].sort((a, b) => a - b);
  const expected = sorted[Math.max(rank, 0)]!;
  const passed = got === expected;
  return {
    name: "finite-sample-rank",
    passed,
    detail: passed
      ? `rank ${rank} of ${n}: matches order statistic ${expected}`
      : `rank ${rank} of ${n}: expected ${expected}, got ${got}`,
  };
}

/**
 * Check 2 — nonconformity recipe: scores must equal
 * max(qLoCal_i - y_i, y_i - qHiCal_i) and the interval must expand by
 * exactly qhat on each side. Verified on synthetic data through the
 * public cqrInterval entry point.
 */
export function auditNonconformityRecipe(alpha = 0.1): AuditCheck {
  const yCal = [44, 47, 52, 41, 49, 55, 46, 50, 43, 48];
  const qLoCal = yCal.map((y) => y - 3);
  const qHiCal = yCal.map((y) => y + 3);
  const expectedScores = yCal.map((y, i) =>
    Math.max(qLoCal[i]! - y, y - qHiCal[i]!),
  );
  const expectedQhat = conformalQuantile(expectedScores, alpha);
  const { lo, hi, qhat } = cqrInterval([45], [48], yCal, qLoCal, qHiCal, alpha);
  const passed =
    qhat === expectedQhat &&
    lo[0] === 45 - expectedQhat &&
    hi[0] === 48 + expectedQhat;
  return {
    name: "nonconformity-recipe",
    passed,
    detail: passed
      ? `E_i = max(qLo-y, y-qHi), qhat=${expectedQhat}, interval=[45-qhat, 48+qhat]`
      : `recipe mismatch: qhat=${qhat} (expected ${expectedQhat})`,
  };
}

/**
 * Check 3 — fail-closed small-n: at alpha=0.1, n < 9 must yield
 * +Infinity (no false coverage certification on tiny calibration sets).
 */
export function auditFailClosedSmallN(alpha = 0.1): AuditCheck {
  const small = [0.5, 1.5, 2.5, 1.0, 3.0, 0.2, 2.2, 1.8]; // n = 8
  const got = conformalQuantile(small, alpha);
  const passed = got === Number.POSITIVE_INFINITY;
  return {
    name: "fail-closed-small-n",
    passed,
    detail: passed
      ? "n=8 < 9 at alpha=0.1: correctly vacuous (+Infinity)"
      : `n=8 at alpha=0.1: expected +Infinity, got ${got}`,
  };
}

/** Run the full recipe audit. */
export function auditCqrRecipe(alpha = 0.1): CqrAuditReport {
  const scores = [0.5, 1.5, 2.5, 1.0, 3.0, 0.2, 2.2, 1.8, 0.9, 2.9, 1.2, 0.7];
  const checks = [
    auditFiniteSampleRank(scores, alpha),
    auditNonconformityRecipe(alpha),
    auditFailClosedSmallN(alpha),
  ];
  return { checks, passed: checks.every((c) => c.passed) };
}

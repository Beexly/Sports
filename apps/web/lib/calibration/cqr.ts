/**
 * Conformalized Quantile Regression (CQR) — numeric lines only (props/margins).
 * Default OFF for product paths. Does NOT unlock PROVEN (binary Brier/ECE only).
 *
 * Binary sides stay: Raw → Temp | Platt | PAVA/CIR | EB-τ → eligibility.
 *
 * FAIL-CLOSED QUANTILE (research corpus + Barber/Angelopoulos mandate):
 * rank k = ceil((1-α)(n+1)) 1-indexed; if k > n the empirical quantile is
 * +Infinity (or abstain). Clamping k to n delivers n/(n+1) coverage while
 * labeling 1-α — fake tightness. REPLACEMENT: Infinity + qhatInfinite flag;
 * callers must No-Bet / refuse, never ship a finite band from a clamped rank.
 */

/** Split-conformal quantile. Finite only when the rank is representable. */
export function conformalQuantile(scores: readonly number[], alpha: number): number {
  const n = scores.length;
  if (n === 0) return Number.POSITIVE_INFINITY;
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) return Number.POSITIVE_INFINITY;
  const s = [...scores].sort((a, b) => a - b);
  const k = Math.ceil((1 - alpha) * (n + 1));
  if (k > n || k < 1) return Number.POSITIVE_INFINITY;
  return s[k - 1]!;
}

/** True when the quantile refused (sample cannot certify nominal coverage). */
export function conformalQuantileRefused(qhat: number): boolean {
  return !Number.isFinite(qhat);
}

/**
 * CQR interval expansion:
 * nonconformity s_i = max(q_lo_cal_i - y_i, y_i - q_hi_cal_i)
 * qhat = conformal quantile; test: [q_lo - qhat, q_hi + qhat]
 * When qhat is infinite, lo/hi are infinite (fail-closed; do not clamp).
 */
export function cqrInterval(
  qLo: readonly number[],
  qHi: readonly number[],
  yCal: readonly number[],
  qLoCal: readonly number[],
  qHiCal: readonly number[],
  alpha = 0.1,
): {
  readonly lo: readonly number[];
  readonly hi: readonly number[];
  readonly qhat: number;
  readonly qhatInfinite: boolean;
  readonly nCal: number;
  readonly status: "ok" | "fail_closed_insufficient_n";
} {
  if (yCal.length === 0 || qLoCal.length !== yCal.length || qHiCal.length !== yCal.length) {
    return {
      lo: qLo.map(() => Number.POSITIVE_INFINITY),
      hi: qHi.map(() => Number.POSITIVE_INFINITY),
      qhat: Number.POSITIVE_INFINITY,
      qhatInfinite: true,
      nCal: yCal.length,
      status: "fail_closed_insufficient_n",
    };
  }
  const s = yCal.map((y, i) => Math.max(qLoCal[i]! - y, y - qHiCal[i]!));
  const qhat = conformalQuantile(s, alpha);
  const infinite = !Number.isFinite(qhat);
  if (infinite) {
    return {
      lo: qLo.map(() => Number.POSITIVE_INFINITY),
      hi: qHi.map(() => Number.POSITIVE_INFINITY),
      qhat,
      qhatInfinite: true,
      nCal: yCal.length,
      status: "fail_closed_insufficient_n",
    };
  }
  return {
    lo: qLo.map((v) => v - qhat),
    hi: qHi.map((v) => v + qhat),
    qhat,
    qhatInfinite: false,
    nCal: yCal.length,
    status: "ok",
  };
}

/**
 * Jackknife+ coverage THEOREM floor (Barber et al. 2019):
 * at miscoverage α the guarantee is at least 1-2α, NOT 1-α.
 * Report both; never label J+ intervals as 1-α bands.
 */
export function jackknifePlusTheoremCoverage(alpha: number): number {
  return Math.max(0, 1 - 2 * alpha);
}

export const CQR_PRODUCT_NOTES = {
  defaultOff: true,
  unlocksProven: false,
  useFor: "spreads / totals / prop numeric intervals",
  skipFor: "binary side probability calibration",
  failClosed: true,
  banned: "quantile clamping / fake tightness",
  jackknifePlusGuarantee: "1-2α finite-sample under exchangeability",
} as const;

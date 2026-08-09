/**
 * Conformalized Quantile Regression (CQR) — numeric lines only (props/margins).
 * Default OFF for product paths. Does NOT unlock PROVEN (binary Brier/ECE only).
 *
 * Binary sides stay: Raw → Temp | Platt | PAVA/CIR | EB-τ → eligibility.
 */

/** Split-conformal quantile with finite-sample correction. */
export function conformalQuantile(scores: readonly number[], alpha: number): number {
  const n = scores.length;
  if (n === 0) return Number.POSITIVE_INFINITY;
  const s = [...scores].sort((a, b) => a - b);
  let rank = Math.ceil((1 - alpha) * (n + 1)) - 1;
  rank = Math.min(Math.max(rank, 0), n - 1);
  return s[rank]!;
}

/**
 * CQR interval expansion:
 * nonconformity s_i = max(q_lo_cal_i - y_i, y_i - q_hi_cal_i)
 * qhat = conformal quantile; test: [q_lo - qhat, q_hi + qhat]
 */
export function cqrInterval(
  qLo: readonly number[],
  qHi: readonly number[],
  yCal: readonly number[],
  qLoCal: readonly number[],
  qHiCal: readonly number[],
  alpha = 0.1,
): { readonly lo: readonly number[]; readonly hi: readonly number[]; readonly qhat: number } {
  if (yCal.length === 0 || qLoCal.length !== yCal.length || qHiCal.length !== yCal.length) {
    return { lo: [...qLo], hi: [...qHi], qhat: 0 };
  }
  const s = yCal.map((y, i) =>
    Math.max(qLoCal[i]! - y, y - qHiCal[i]!),
  );
  const qhat = conformalQuantile(s, alpha);
  const lo = qLo.map((v) => v - qhat);
  const hi = qHi.map((v) => v + qhat);
  return { lo, hi, qhat };
}

export const CQR_PRODUCT_NOTES = {
  defaultOff: true,
  unlocksProven: false,
  useFor: "spreads / totals / prop numeric intervals",
  skipFor: "binary side probability calibration",
} as const;

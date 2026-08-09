/**
 * Conformal ideas for *calibration maps* — explore only, flag OFF.
 *
 * Distinct from ACI show/abstain (CONFORMAL_ABSTAIN_ENABLED):
 * - Map CI: stationary bootstrap or block Wilson on PAVA (uncertainty on p_cal)
 * - Split-conformal on residual |y - p_cal| gives prediction sets for outcomes,
 *   not a CI on the map itself (coverage ≠ map CI)
 *
 * Binary side calibration stays Temp/Platt/PAVA/EB-τ.
 * Numeric y (margins/props) → QRF + optional CQR — separate track, not PROVEN eligibility.
 */

export const CONFORMAL_CALIBRATION_NOTES = {
  mapUncertainty: "stationary-bootstrap or Wilson-on-blocks (internal)",
  outcomeSets: "split-conformal residual sets — coverage on y, not map CI",
  aciAbstain: "CONFORMAL_ABSTAIN_ENABLED — show/abstain only; never publish",
  provenEligibility: "still frequentist Brier · ECE · Murphy R on shown p",
  qrfNumeric: "QRF/CQR for spreads/totals/props only — skip for binary side cal",
} as const;

/** Nonconformity for binary: |y - p|. Higher = more surprising. */
export function residualNonconformity(p: number, y: 0 | 1): number {
  return Math.abs(y - Math.min(1, Math.max(0, p)));
}

/**
 * Split-conformal absolute residual threshold (internal).
 * Returns qhat such that P(|Y-p| <= qhat) ≳ 1-alpha on exchangeable data.
 */
export function splitConformalResidualThreshold(
  residuals: readonly number[],
  alpha = 0.1,
): number {
  if (residuals.length === 0) return 1;
  const sorted = [...residuals].sort((a, b) => a - b);
  const level = Math.ceil((1 - alpha) * (sorted.length + 1)) / sorted.length;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(level * sorted.length) - 1));
  return sorted[idx]!;
}

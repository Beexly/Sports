/**
 * arXiv:2508.05891v1 — Bayesian weighted discrete-time dynamic models for association football prediction
 *
 * Commensurate-precision time-weighting for team-strength dynamics: older seasons enter through a
 * commensurate prior that borrows aggressively when consistent with current data and discounts when the
 * game evolves.
 *
 * Improvement: GSE ports commensurate-precision time-weighting into its team-strength dynamics: older seasons' information enters through a commensurate prior that borrows aggressively when consistent and discounts when the game evolves.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Adopt if on the 2025 walk-forward test the weighted-dynamic model's RPS beats both baselines (current + constant-variance RW) by >=0.003 absolute AND mean |edge vs de-vigged close| improves CLV hit-rate by >=1.0pp.
 */

/** Commensurate prior weight for one historical season. */
export interface CommensurateWeight {
  season: number;
  /** Weight in [0,1] on the historical information. */
  weight: number;
}

/**
 * Commensurate weight: w = 1 / (1 + tau * D), where D is the discrepancy
 * between the historical estimate and the current-data estimate, and tau is
 * the commensurability precision. Consistent history -> w ~ 1.
 */
export function commensurateWeight(
  histEstimate: number,
  currentEstimate: number,
  histSe: number,
  tau: number,
): number {
  if (histSe <= 0 || tau < 0) throw new Error("commensurateWeight: histSe > 0, tau >= 0");
  const D = ((histEstimate - currentEstimate) / histSe) ** 2;
  return 1 / (1 + tau * D);
}

/** Precision-weighted blend of historical and current estimates. */
export function commensurateBlend(
  histEstimate: number,
  histSe: number,
  currentEstimate: number,
  currentSe: number,
  tau: number,
): { blended: number; weight: number } {
  const w = commensurateWeight(histEstimate, currentEstimate, histSe, tau);
  const pH = w / (histSe * histSe);
  const pC = 1 / (currentSe * currentSe);
  return { blended: (pH * histEstimate + pC * currentEstimate) / (pH + pC), weight: w };
}

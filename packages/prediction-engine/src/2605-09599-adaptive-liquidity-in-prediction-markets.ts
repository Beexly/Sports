/**
 * arXiv:2605.09599 — Adaptive Liquidity in Prediction Markets via Online Learning
 *
 * Hybrid signal Gamma^hyb (slippage-analog + liability-analog) computed weekly on the pick/stake log as a
 * state-dependent exposure framework: slate stakes scale inversely with the liability component, with the
 * mixture construction's (1/beta)log M overhead bounding adaptivity cost.
 *
 * Improvement: Compute the hybrid signal Gamma^hyb (slippage-analog + liability-analog) weekly on GSE's pick/stake log as a state-dependent exposure framework: scale slate stakes inversely with the liability component so GSE's exposure adapts to correlated-slate risk, with the mixture construction's (1/beta)log M overhead guarantee bounding the cost of adaptivity.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Adapt the mixture construction and the hybrid signal as GSE's state-dependent exposure framework if the liability component correlates with realized drawdowns on GSE's log.
 */

/** Weekly log summary for the hybrid signal. */
export interface WeekLog {
  /** Realized slippage vs model price (per unit stake). */
  slippage: number;
  /** Correlated-slate liability: max single-slate drawdown exposure. */
  liability: number;
}

/**
 * Gamma^hyb = (1/beta) * log(1 + exp(beta*slip)) + liability — smooth-max of
 * the slippage-analog plus the liability-analog. beta controls sharpness.
 */
export function gammaHybrid(log: WeekLog, beta: number): number {
  if (beta <= 0) throw new Error("gammaHybrid: beta > 0");
  const slip = Math.max(0, log.slippage);
  return (1 / beta) * Math.log(1 + Math.exp(beta * slip)) + Math.max(0, log.liability);
}

/** State-dependent exposure: base stake scaled inversely with liability. */
export function exposureScale(liability: number, sensitivity: number): number {
  if (sensitivity < 0) throw new Error("exposureScale: sensitivity >= 0");
  return 1 / (1 + sensitivity * Math.max(0, liability));
}

/** Mixture overhead bound: (1/beta) log M for M experts. */
export function mixtureOverheadBound(beta: number, experts: number): number {
  if (beta <= 0 || experts < 1) throw new Error("mixtureOverheadBound: invalid inputs");
  return (1 / beta) * Math.log(experts);
}

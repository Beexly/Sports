/**
 * Adaptive Conformal Inference (online coverage controller) — arXiv 2106.00170
 * ("Adaptive Conformal Inference Under Distribution Shift").
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published
 * intervals and is a NEEDS HUMAN CALL — see tracking report). Does not touch
 * the existing aci-durable.ts / aci-state.ts; this is the paper-exact online
 * controller the ledger asks to audit them against.
 *
 * Paper mechanism: alpha_{t+1} = alpha_t + gamma * (alpha - err_t), where
 * err_t is computed on the interval the engine actually PUBLISHED
 * (err_t = 1 on miscoverage). Decreasing alpha_t widens the next interval
 * (level 1 - alpha_t rises). Per-market (spread/total/moneyline) alpha_t,
 * updated in a weekly online loop after each slate resolves. Regime-aware
 * two-gamma controller: gamma_small in calm weeks, gamma_large for 3 weeks
 * after a detected changepoint.
 *
 * ACCEPTANCE GATE (improvement-ledger): ADAPT if long-run coverage error <=
 * 1.5x the paper's O(1/(T*gamma)) bound AND mean interval width <= 110% of
 * fixed-alpha baseline. REJECT pure-ACI for the conformal-PID variant if
 * weekly local coverage sags >5pp below nominal for 4+ consecutive weeks.
 */

export interface AciMarketState {
  readonly market: string;
  /** Current quantile level state alpha_t (interval level = 1 - alpha_t). */
  readonly alphaT: number;
  readonly gamma: number;
  readonly weeksSinceChangepoint: number;
}

/** Paper-exact ACI update. errT = 1 on miscoverage of the published interval. */
export function aciUpdate(
  alphaT: number,
  gamma: number,
  targetAlpha: number,
  errT: 0 | 1,
): number {
  const next = alphaT + gamma * (targetAlpha - errT);
  return Math.min(Math.max(next, 0.001), 0.999);
}

/** Run one weekly online step for a market: fold in this week's coverages. */
export function aciWeeklyStep(
  state: AciMarketState,
  covered: ReadonlyArray<boolean>,
  targetAlpha: number,
): AciMarketState {
  let alphaT = state.alphaT;
  for (const c of covered) {
    alphaT = aciUpdate(alphaT, state.gamma, targetAlpha, c ? 0 : 1);
  }
  return { ...state, alphaT };
}

/**
 * Two-gamma regime controller: gamma_large for 3 weeks after a detected
 * changepoint, gamma_small otherwise. Returns the gamma to use this week.
 */
export function regimeGamma(
  weeksSinceChangepoint: number,
  gammaSmall: number,
  gammaLarge: number,
  recoveryWeeks = 3,
): number {
  return weeksSinceChangepoint < recoveryWeeks ? gammaLarge : gammaSmall;
}

/**
 * Changepoint detector: trailing-window coverage deviating more than
 * threshold from nominal flags a regime change (resets the recovery clock).
 */
export function detectChangepoint(
  trailingCoverages: readonly number[],
  nominal: number,
  threshold = 0.05,
): boolean {
  if (trailingCoverages.length === 0) return false;
  const mean =
    trailingCoverages.reduce((a, b) => a + b, 0) / trailingCoverages.length;
  return Math.abs(mean - nominal) > threshold;
}

/** O(1/(T*gamma)) long-run coverage-error bound from the paper. */
export function aciCoverageBound(weeks: number, gamma: number): number {
  if (weeks <= 0 || gamma <= 0) return Number.POSITIVE_INFINITY;
  return 1 / (weeks * gamma);
}

/** Initial per-market ACI state. */
export function initAciMarketState(market: string, gamma: number, alpha0: number): AciMarketState {
  return { market, alphaT: alpha0, gamma, weeksSinceChangepoint: 99 };
}

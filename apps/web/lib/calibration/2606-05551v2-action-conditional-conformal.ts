/**
 * arXiv 2606.05551v2: Conformal Risk-Averse Decision Making with Action Conditional Guarantee.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Action-conditional conformal bet/no-bet filter (alpha=0.05, utility = realized profit) over the engine's calibrated outcome distributions on a rolling 4-week calibration set: publish the guaranteed profit-floor certificate nu(x) conditioned on betting; utility-conditional stake tiers (0, 0.25f*, 0.5f*, f*) with the max-min rule selecting the largest stake whose worst-case certified utility is positive.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Add an action-conditional conformal bet/no-bet filter (alpha=0.05, utility = realized profit) over the engine's calibrated outcome distributions on a rolling 4-week calibration set, publishing the guaranteed profit floor certificate nu(x) conditioned on betting; extend to utility-conditional stake tiers (0, 0.25f*, 0.5f*, f*) so the max-min rule selects the largest stake whose worst-case certified utility is positive.
 *
 * ACCEPTANCE GATE:
 * ACCEPT if ALL hold on the 3-season backtest: (1) empirical action-conditional coverage ≥95% where AC-RAC selects 'bet'; (2) Sharpe_AC-RAC ≥ 1.10 x Sharpe_baseline AND Calmar_AC-RAC ≥ 1.10 x Calmar_baseline; (3) bet volume ≥ 30% of baseline volume.
 *
 * ENABLED=false: bet/no-bet filter + stake tiers; needs a human call.
 */


export const ENABLED = false;

export const STAKE_TIER_FRACTIONS = [0, 0.25, 0.5, 1];

export interface CalibBet {
  /** Engine's expected profit for the bet. */
  readonly expectedProfit: number;
  /** Realized profit. */
  readonly realizedProfit: number;
}

/**
 * Action-conditional conformal certificate: given calibration bets where the
 * action was 'bet', find the profit floor nu such that
 * P(realizedProfit >= nu | bet) >= 1 - alpha, via the conformal quantile of
 * the shortfall (expectedProfit - realizedProfit).
 */
export function profitFloorCertificate(
  calib: readonly CalibBet[],
  alpha = 0.05,
): { nu: number; nCal: number } {
  const n = calib.length;
  if (n === 0) return { nu: -Infinity, nCal: 0 };
  const shortfalls = calib
    .map((b) => b.expectedProfit - b.realizedProfit)
    .sort((a, b) => a - b);
  const k = Math.min(n, Math.ceil((1 - alpha) * (n + 1)));
  const q = shortfalls[k - 1];
  // Certified floor is relative to a new bet's expected profit; report the
  // shortfall quantile (nu(x) = E[profit|x] - q).
  return { nu: -q, nCal: n };
}

/**
 * Empirical action-conditional coverage: fraction of calibration bets where
 * realized profit >= expected - q (should be >= 1 - alpha).
 */
export function actionConditionalCoverage(
  calib: readonly CalibBet[],
  shortfallQuantile: number,
): number {
  if (calib.length === 0) return 1;
  const covered = calib.filter(
    (b) => b.realizedProfit >= b.expectedProfit - shortfallQuantile,
  ).length;
  return covered / calib.length;
}

export interface StakeDecision {
  readonly tierFraction: number;
  readonly stake: number;
  readonly certifiedFloor: number;
}

/**
 * Max-min stake-tier rule: select the largest tier in (0, 0.25f*, 0.5f*, f*)
 * whose worst-case certified utility is positive.
 */
export function selectStakeTier(
  kellyFraction: number,
  expectedProfit: number,
  shortfallQuantile: number,
): StakeDecision {
  let chosen: StakeDecision = { tierFraction: 0, stake: 0, certifiedFloor: 0 };
  for (const frac of STAKE_TIER_FRACTIONS) {
    const stake = frac * kellyFraction;
    const certifiedFloor = stake * (expectedProfit - shortfallQuantile);
    if (frac === 0 || certifiedFloor > 0) {
      chosen = { tierFraction: frac, stake, certifiedFloor };
    }
  }
  return chosen;
}

/** Gate (3): bet volume >= 30% of baseline volume. */
export function volumeGateOk(filtered: number, baseline: number): boolean {
  return baseline > 0 && filtered / baseline >= 0.3;
}

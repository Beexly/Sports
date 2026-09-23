/**
 * arXiv:2501.18606v1 — Temporal Dynamics of Goal Scoring in Soccer
 *
 * Score-differential x clock burstiness: same-team next-score intensity as a function of differential and
 * time remaining; the conditioned null is the league-average rate so the burstiness-adjusted live total is
 * testable.
 *
 * Improvement: Add a score-differential × clock burstiness interaction to the live total model: compute same-team burstiness as a function of score differential and time remaining (is the surge stronger when trailing?), turning the paper's pooled burstiness finding into a game-state-conditioned live intensity.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Adopt if the same-team burstiness effect survives team-strength conditioning — i.e., observed same-team next-score rate in the first 5 minutes after a score exceeds the conditioned null by ≥ 15% relative with χ² p < 0.01 — AND the burstiness-adjusted live intensity improves 2025 second-half total log-loss by ≥ 0.01 nats over the base Poisson model.
 */

/** Burstiness parameters for the live total model. */
export interface BurstParams {
  /** Base scoring intensity (scores per minute). */
  baseRate: number;
  /** Burst multiplier right after a score by the same team. */
  burstGain: number;
  /** Decay of the burst effect (per minute). */
  burstDecay: number;
  /** Differential interaction: extra burst when trailing. */
  trailingBoost: number;
}

/**
 * Same-team next-score intensity lambda(t) given game state.
 * minutesSinceScore: time since that team's last score; differential: team - opp.
 */
export function burstIntensity(
  p: BurstParams,
  minutesSinceScore: number,
  differential: number,
  minutesRemaining: number,
): number {
  if (minutesRemaining <= 0) return 0;
  const burst = p.burstGain * Math.exp(-p.burstDecay * Math.max(0, minutesSinceScore));
  const trail = differential < 0 ? p.trailingBoost : 0;
  return Math.max(0, p.baseRate * (1 + burst + trail));
}

/**
 * Conditioned-null test: does the observed same-team next-score rate in the
 * first 5 minutes after a score exceed the conditioned null by >= 15%?
 * Returns { ratio, passes } where ratio = observed / null.
 */
export function burstinessGateTest(
  observedRate: number,
  nullRate: number,
): { ratio: number; passes: boolean } {
  if (nullRate <= 0) throw new Error("burstinessGateTest: nullRate > 0");
  const ratio = observedRate / nullRate;
  return { ratio, passes: ratio >= 1.15 };
}

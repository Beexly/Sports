/**
 * arXiv:2411.17900v1 — Pretrained LLM Adapted with LoRA as a Decision Transformer for Offline RL in Quantitative Trading
 *
 * Season-as-trajectory decision transformer with LoRA-adapted pretrained backbone: states =
 * bankroll/edge/CLV context, actions = pick+stake, returns-to-go conditioning. Disabled: needs the
 * pretrained backbone and the pick/staking log fine-tune; the trajectory encoding ships as code.
 *
 * Improvement: Treat the season as a decision-transformer trajectory: LoRA-adapt a pretrained LLM on GSE's sequential pick/staking logs, pre-training the backbone cross-domain on public betting-market histories and synthetic Kelly-optimal trajectories to isolate whether the transfer gain comes from generic sequence modeling or language priors.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT iff on 2024 (a) beats (b) by ≥1pp ROI (transfer works in this domain) AND (a) beats fractional-Kelly by ≥2pp with drawdown no worse; if (a)≈(b), REJECT the pretraining complexity and use the from-scratch DT.
 */

/** Disabled: requires unavailable training data or model artifact. */
export const ENABLED = false;

/** One step of a staking trajectory. */
export interface TrajectoryStep {
  /** State: [bankroll, edge, clvHistory, weeksRemaining]. */
  state: number[];
  /** Action taken: [stakeFraction]. */
  action: number[];
  /** Reward-to-go from this step. */
  returnToGo: number;
}

/** Encode a season trajectory into a token sequence for the DT. */
export function encodeTrajectory(steps: readonly TrajectoryStep[]): number[][] {
  if (steps.length === 0) throw new Error("encodeTrajectory: no steps");
  const out: number[][] = [];
  for (const s of steps) {
    out.push([s.returnToGo, ...s.state, ...s.action]);
  }
  return out;
}

/** Reward-to-go targets from a reward sequence (the DT conditioning signal). */
export function returnsToGo(rewards: readonly number[]): number[] {
  const out = new Array<number>(rewards.length);
  let acc = 0;
  for (let i = rewards.length - 1; i >= 0; i--) {
    acc += rewards[i] ?? 0;
    out[i] = acc;
  }
  return out;
}

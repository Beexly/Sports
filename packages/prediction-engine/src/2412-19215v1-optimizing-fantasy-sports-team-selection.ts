/**
 * arXiv:2412.19215v1 — Optimizing Fantasy Sports Team Selection with Deep Reinforcement Learning
 *
 * Two-headed PPO lineup policy (surrogate utilities): head 1 maximizes projected score (cash), head 2
 * maximizes top-percentile probability vs a field simulator (GPP). Disabled: the trained policy and field
 * simulator are unavailable; the PPO/GAE math ships as the spec.
 *
 * Improvement: Rebuild DFS lineup construction with a two-headed PPO agent: head 1 maximizes projected score (cash-game lineups), head 2 maximizes probability of finishing above the 99th percentile of a field simulator built from public ownership projections (tournament lineups), judged on actual payout EV.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Accept the adaptation if the PPO agent's mean percentile rank over the 8 held-out NFL slates ≥ the optimizer baseline's mean percentile by ≥ 5 points, with the improvement consistent across ≥ 5 of 8 slates.
 */

/** Disabled: requires unavailable training data or model artifact. */
export const ENABLED = false;

/** One step's data for the PPO surrogate. */
export interface PpoStep {
  /** Probability ratio pi_new/pi_old. */
  ratio: number;
  /** Generalized advantage estimate. */
  advantage: number;
}

/**
 * Clipped PPO surrogate objective (to maximize): mean of
 * min(ratio * A, clip(ratio, 1-eps, 1+eps) * A).
 */
export function ppoSurrogate(steps: readonly PpoStep[], eps: number): number {
  if (steps.length === 0) throw new Error("ppoSurrogate: no steps");
  if (eps <= 0) throw new Error("ppoSurrogate: eps > 0");
  const vals = steps.map(({ ratio, advantage }) => {
    const clipped = Math.min(1 + eps, Math.max(1 - eps, ratio));
    return Math.min(ratio * advantage, clipped * advantage);
  });
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/**
 * Generalized Advantage Estimation: A_t = sum (gamma*lambda)^l delta_{t+l},
 * delta_t = r_t + gamma*V_{t+1} - V_t.
 */
export function gae(
  rewards: readonly number[],
  values: readonly number[],
  gamma: number,
  lambda: number,
): number[] {
  if (rewards.length !== values.length - 1) throw new Error("gae: values needs one extra terminal value");
  const adv = new Array<number>(rewards.length).fill(0);
  let g = 0;
  for (let t = rewards.length - 1; t >= 0; t--) {
    const delta = (rewards[t] ?? 0) + gamma * (values[t + 1] ?? 0) - (values[t] ?? 0);
    g = delta + gamma * lambda * g;
    adv[t] = g;
  }
  return adv;
}

/**
 * Two-head objective: w_cash * surrogate_cash + w_gpp * surrogate_gpp.
 * Head 2's advantages come from the top-percentile field-simulator reward.
 */
export function twoHeadObjective(
  cash: readonly PpoStep[],
  gpp: readonly PpoStep[],
  eps: number,
  wCash: number,
  wGpp: number,
): number {
  return wCash * ppoSurrogate(cash, eps) + wGpp * ppoSurrogate(gpp, eps);
}

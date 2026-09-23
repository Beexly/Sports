/**
 * arXiv:2504.20877v2 — Preference-centric Bandits: Optimality of Mixtures and Regret-efficient Algorithms
 *
 * Drifting two-armed bandit for market-timing: dynamic UCB with exponentially discounted
 * exploration/exploitation bonuses as a live bet-vs-wait throttle during line movement.
 *
 * Improvement: Allocate weekly stakes with the CVaR preference-mixture selector over GSE's own pick history (Neon picks table, model v5.2.7, SPREAD/MONEYLINE/TOTAL): walk-forward comparison of (a) PM mixture allocation vs (b) quarter-Kelly on the single highest-edge pick — the mixture should achieve strictly better preference-mixture value (lower drawdown at similar growth) than any solitary pick when outcomes are heterogeneous.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: At T=60k under GD on the paper's 2-arm Bernoulli setup, PM-UCB-M's average regret must be ≤ 50% of uniform sampling's average regret, with regret decreasing monotonically across T∈{20k,40k,60k}.
 */

/** Discounted counts and rewards for one arm. */
export interface ArmState {
  count: number;
  reward: number;
}

/** Dynamic-UCB arm score: discounted mean + bonus * sqrt(discountedLogT / n). */
export function dynamicUcbScore(
  arm: ArmState,
  discountedLogT: number,
  bonus: number,
): number {
  if (arm.count <= 0) return Infinity; // explore untried arms
  if (bonus < 0) throw new Error("dynamicUcbScore: bonus >= 0");
  return arm.reward / arm.count + bonus * Math.sqrt(discountedLogT / arm.count);
}

/**
 * Update arms with discount gamma: count <- gamma*count + 1 (pulled arm),
 * reward <- gamma*reward + r. Unpulled arms decay without increment.
 */
export function discountArms(
  arms: readonly ArmState[],
  pulled: number,
  reward: number,
  gamma: number,
): ArmState[] {
  if (gamma <= 0 || gamma > 1) throw new Error("discountArms: gamma in (0,1]");
  return arms.map((a, i) => ({
    count: gamma * a.count + (i === pulled ? 1 : 0),
    reward: gamma * a.reward + (i === pulled ? reward : 0),
  }));
}

/** Choose the arm with the highest dynamic-UCB score. */
export function dynamicUcbPick(
  arms: readonly ArmState[],
  discountedLogT: number,
  bonus: number,
): number {
  if (arms.length === 0) throw new Error("dynamicUcbPick: no arms");
  let best = 0;
  let bestScore = -Infinity;
  arms.forEach((a, i) => {
    const s = dynamicUcbScore(a, discountedLogT, bonus);
    if (s > bestScore) { bestScore = s; best = i; }
  });
  return best;
}

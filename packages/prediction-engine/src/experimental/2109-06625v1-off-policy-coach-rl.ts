/**
 * arXiv 2109.06625v1: Towards optimized actions in critical situations of soccer games with deep reinforcement learning
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Attack NFL critical situations with off-policy RL: Prong A -- states (down, distance, yardline, score diff, time, timeouts, team strengths), behavior policy = historical coach decisions (nflverse 2009-2024), reward = Delta win probability; train off-policy policy-gradient with importance weights, evaluate with IS + doubly robust OPE on strictly held-out seasons (fixing the paper's in-sample OPE flaw), reporting ESS and max weight, and quantify 'coach mistakes' like the paper's player-mistake analysis; Prong B -- a reusable OPE harness: given GSE's historical picks (actions), outcomes, and odds (behavior policy), evaluate any proposed pick-selection/staking policy via IS before deployment.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Attack NFL critical situations with off-policy RL: Prong A — states (down, distance, yardline, score diff, time, timeouts, team strengths), behavior policy = historical coach decisions (nflverse 2009-2024), reward = Delta win probability; train off-policy policy-gradient with importance weights, evaluate with IS + doubly robust OPE on strictly held-out seasons (fixing the paper's in-sample OPE flaw), reporting ESS and max weight, and quantify 'coach mistakes' like the paper's player-mistake analysis; Prong B — a reusable OPE harness: given GSE's historical picks (actions), outcomes, and odds (behavior policy), evaluate any proposed pick-selection/staking policy via IS before deployment.
 *
 * ACCEPTANCE GATE (verbatim):
 * Accept Prong A if held-out OPE shows >=0.5 wins/season gain over coaching behavior with effective sample size >50% of nominal (weights not degenerate) — and the learned policy's recommendations are interpretable (e.g., more aggressive on 4th-and-short in opponent territory). Reject if IS weights collapse or the policy just rediscovers 'always go for it' without situational nuance.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: experimental | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** CQL(H) conservative penalty: alpha * (E_{a~rand}[Q] - E_{a~data}[Q]). */
export function cqlPenalty(qData: number[], qRandom: number[], alpha: number): number {
  const mD = qData.reduce((a, b) => a + b, 0) / qData.length;
  const mR = qRandom.reduce((a, b) => a + b, 0) / qRandom.length;
  return alpha * (mR - mD);
}

/** Mean squared Bellman error for a batch. */
export function bellmanMse(q: number[], r: number[], gamma: number, qNext: number[]): number {
  let s = 0;
  for (let i = 0; i < q.length; i++) {
    const target = r[i]! + gamma * qNext[i]!;
    s += (q[i]! - target) ** 2;
  }
  return s / q.length;
}

/** Self-normalized importance-weighted OPE estimate. */
export function opeSelfNormalized(rewards: number[], weights: number[]): number {
  let num = 0;
  let den = 0;
  for (let i = 0; i < rewards.length; i++) {
    num += weights[i]! * rewards[i]!;
    den += weights[i]!;
  }
  return num / Math.max(1e-300, den);
}

/** Effective sample size of importance weights. */
export function ess(weights: number[]): number {
  const s1 = weights.reduce((a, b) => a + b, 0);
  const s2 = weights.reduce((a, b) => a + b * b, 0);
  return (s1 * s1) / Math.max(1e-300, s2);
}

/** Doubly-robust OPE estimate. */
export function doublyRobust(
  rewards: number[],
  weights: number[],
  qModel: number[],
  qBehavior: number[],
): number {
  let s = 0;
  for (let i = 0; i < rewards.length; i++) {
    s += qBehavior[i]! + weights[i]! * (rewards[i]! - qModel[i]!);
  }
  return s / rewards.length;
}

/** Lower-bound diagnostic: predicted value <= realized return on most weeks. */
export function lowerBoundDiagnostic(pred: number[], realized: number[]): number {
  let ok = 0;
  for (let i = 0; i < pred.length; i++) if (pred[i]! <= realized[i]!) ok++;
  return ok / pred.length;
}

/**
 * arXiv 2006.04779v2: Conservative Q-Learning for Offline Reinforcement Learning
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Conservative Q-learning stake policy trained offline on GSE's historical slate data: state = (week, bankroll, edges, CLV, market features), action = discrete stake {0, 0.25u, 0.5u, 1u, 2u}, reward = settled profit; small MLP Q-network with CQL(H) penalty; greedy argmax under a per-week max-exposure cap with abstention as the learned 'don't bet'; OOD density check with fallback to fractional-Kelly.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Train a conservative Q-learning stake policy offline on GSE's historical slate data: state = (week, bankroll, edges, CLV, market features), action = discrete stake {0, 0.25u, 0.5u, 1u, 2u} as actually placed by the historical rule, reward = settled profit in units; small MLP Q-network with CQL(H) conservative penalty; deploy greedy argmax under a per-week max-exposure cap with abstention (action 0) allowed as the learned 'don't bet' behavior; OOD density check with fallback to fractional-Kelly.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT iff on 2024 holdout the CQL policy beats the fractional-Kelly baseline by >=2pp ROI with max drawdown no worse than baseline (within 0.5u) AND the empirical lower-bound diagnostic holds (predicted value <= realized return on >=90% of weeks); if the lower-bound diagnostic fails, REJECT (the safety property is the whole point).
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Hermes | bucket: MODEL | lane: rl_sequential_decisions | verdict: ADOPT | doctrine: PROPRIETARY_EDGE
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

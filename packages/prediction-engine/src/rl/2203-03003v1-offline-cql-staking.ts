/**
 * arXiv 2203.03003v1: Offline Deep Reinforcement Learning for Dynamic Pricing of Consumer Credit
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Build the offline-CQL staking policy on GSE's logged picks/odds: state = per-bet feature vector (edge, de-vigged fair odds, market odds, CLV history, book, day-of-week, slate size, bankroll fraction), action = stake in {0, 0.25u, 0.5u, 1u, 2u}, reward = settled profit; train on 2021-2023, evaluate on realized 2024 settlement (stronger than the paper's model-only eval) plus sensitivity re-scoring under 3 alternative outcome models; trust-region constraint: stake MAPD vs historical fractional-Kelly <= 25%; then extend to sequential CQL with bankroll in state and log-bankroll-growth reward to capture stake-smoothing.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Build the offline-CQL staking policy on GSE's logged picks/odds: state = per-bet feature vector (edge, de-vigged fair odds, market odds, CLV history, book, day-of-week, slate size, bankroll fraction), action = stake in {0, 0.25u, 0.5u, 1u, 2u}, reward = settled profit; train on 2021-2023, evaluate on realized 2024 settlement (stronger than the paper's model-only eval) plus sensitivity re-scoring under 3 alternative outcome models; trust-region constraint: stake MAPD vs historical fractional-Kelly <= 25%; then extend to sequential CQL with bankroll in state and log-bankroll-growth reward to capture stake-smoothing.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT iff on realized 2024 settlement the CQL staking policy beats fractional-Kelly ROI by >=2pp with stake MAPD <= 25% AND the sensitivity re-scoring keeps the sign of the lift under all 3 outcome models; REJECT if the lift vanishes under alternative evaluators.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: rl_sequential_decisions | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
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

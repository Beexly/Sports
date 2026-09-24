/**
 * QR-DQN distributional head for the staking RL stack (pure math kernel).
 *
 * Same offline weekly-slate dataset as the staking ledgers: discrete stake
 * actions (0 / 0.25 / 0.5 / 1 / 2u) with settled unit-profit rewards.
 * The critic maps state → N quantile locations per stake action; training
 * uses the quantile Huber loss (κ=1) on pairwise TD-errors, plus the CQL
 * log-sum-exp penalty on the quantile means for offline pessimism. Policy:
 * greedy on the mean of quantiles, with a CVaR_0.25 variant for
 * drawdown-aware weeks. Serving is weekly batch; outputs stake +
 * inter-quantile range as the uncertainty bar for write-ups — the simplest
 * distributional critic without a fixed return support. (The MLP itself is
 * trained in the harness; this module is the loss/policy kernel.)
 *
 * @see arXiv:1710.10044v1 — "Distributional Reinforcement Learning with Quantile Regression"
 *
 * ACCEPTANCE GATE: ADOPT as the default distributional head iff on 2024 it
 * matches the best of the C51/IQN heads on ROI (within 1pp) with the lowest
 * seed-variance of the three AND quantile ECE ≤ 0.05; otherwise keep
 * whichever head wins and drop QR-DQN. The gate is a training concern; this
 * module is the pure kernel, not wired into any live path.
 */

export const STAKE_ACTIONS = [0, 0.25, 0.5, 1, 2] as const;

/**
 * Quantile Huber loss for one pairwise TD-error δ at quantile τ:
 *   ρ_τ^κ(δ) = |τ − 1{δ<0}| · L_κ(δ) / κ,  L_κ the Huber loss.
 */
export function quantileHuberLoss(delta: number, tau: number, kappa = 1): number {
  if (!(tau > 0 && tau < 1)) throw new Error("quantileHuberLoss: τ ∈ (0,1)");
  const huber = Math.abs(delta) <= kappa ? 0.5 * delta * delta : kappa * (Math.abs(delta) - 0.5 * kappa);
  return (Math.abs(tau - (delta < 0 ? 1 : 0)) * huber) / kappa;
}

/**
 * QR-DQN loss for one transition: mean over all (τ_i, τ̂_j) pairs of
 * ρ_{τ̂_j}^κ(r + γ·θ'_j(s',a*) − θ_i(s,a)).
 *
 * @param theta current quantiles for (s,a): length N
 * @param thetaTarget target quantiles for (s', a*): length N
 */
export function qrLoss(
  theta: readonly number[],
  thetaTarget: readonly number[],
  reward: number,
  gamma: number,
  kappa = 1,
): number {
  const n = theta.length;
  if (n === 0 || thetaTarget.length !== n) throw new Error("qrLoss: quantile length mismatch");
  const taus = Array.from({ length: n }, (_, i) => (i + 0.5) / n);
  let loss = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const td = reward + gamma * (thetaTarget[j] ?? 0) - (theta[i] ?? 0);
      loss += quantileHuberLoss(td, taus[j] ?? 0.5, kappa);
    }
  }
  return loss / (n * n);
}

/**
 * CQL log-sum-exp penalty on the quantile means (offline pessimism):
 * log Σ_a exp(mean_a) − mean_{a taken}.
 */
export function cqlPenalty(quantileMeans: readonly number[], takenAction: number): number {
  if (!(takenAction >= 0 && takenAction < quantileMeans.length)) {
    throw new Error("cqlPenalty: takenAction out of range");
  }
  const max = Math.max(...quantileMeans);
  const lse = max + Math.log(quantileMeans.reduce((s, m) => s + Math.exp(m - max), 0));
  return lse - (quantileMeans[takenAction] ?? 0);
}

/** Greedy policy on the mean of quantiles. */
export function greedyStake(quantilesPerAction: ReadonlyArray<readonly number[]>): number {
  const means = quantilesPerAction.map((q) => q.reduce((a, b) => a + b, 0) / Math.max(1, q.length));
  const best = means.reduce((bi, m, i) => (m > (means[bi] ?? -Infinity) ? i : bi), 0);
  return STAKE_ACTIONS[best] ?? 0;
}

/** CVaR_α policy: greedy on the mean of the worst α-fraction of quantiles. */
export function cvarStake(
  quantilesPerAction: ReadonlyArray<readonly number[]>,
  alpha = 0.25,
): number {
  if (!(alpha > 0 && alpha <= 1)) throw new Error("cvarStake: α ∈ (0,1]");
  const cvars = quantilesPerAction.map((q) => {
    const sorted = [...q].sort((a, b) => a - b);
    const k = Math.max(1, Math.floor(sorted.length * alpha));
    return sorted.slice(0, k).reduce((a, b) => a + b, 0) / k;
  });
  const best = cvars.reduce((bi, m, i) => (m > (cvars[bi] ?? -Infinity) ? i : bi), 0);
  return STAKE_ACTIONS[best] ?? 0;
}

/** Inter-quantile range (90–10) as the uncertainty bar for write-ups. */
export function interQuantileRange(quantiles: readonly number[]): number {
  if (quantiles.length === 0) return 0;
  const sorted = [...quantiles].sort((a, b) => a - b);
  const q = (p: number): number => {
    const idx = p * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    return (sorted[lo] ?? 0) + (idx - lo) * ((sorted[hi] ?? 0) - (sorted[lo] ?? 0));
  };
  return q(0.9) - q(0.1);
}

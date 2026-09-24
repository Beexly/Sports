/**
 * arXiv 1707.06887v1: A Distributional Perspective on Reinforcement Learning
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Weekly slate selection as episodic RL with a distributional critic: the
critic is a categorical head (N=51 atoms over the weekly-ROI support, e.g.
V in [-50u, +50u]) trained with cross-entropy against the projected Bellman
target (the paper's Eq. 7), and the staking policy acts greedily with respect
to a risk-adjusted statistic of the return distribution (CVaR_alpha or
mean - lambda*std) instead of the plain mean.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Frame weekly slate selection as episodic RL with a distributional critic: state = slate features (edge, CLV, market consensus, bankroll, week), action = discrete stake bucket per selected bet (0, 0.25u, 0.5u, 1u, 2u Kelly-fraction), reward = realized profit in units at settlement; train offline on logged GSE picks + odds API market prices (2019-2026); critic = categorical distributional head (N=51 atoms over weekly-ROI support, e.g., V in [-50u, +50u]) on a small MLP with cross-entropy vs projected Bellman target (Eq 7) plus CQL-style conservative regularizer; policy = greedy w.r.t. a risk-adjusted statistic (maximize CVaR_0.2 or mean - lambda*std).
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT for the staking module iff on the 2024 holdout the distributional policy beats fractional-Kelly ROI by >=2pp AND max drawdown is no worse than the Kelly baseline (within 0.5u).
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Hermes | bucket: MODEL | lane: rl_sequential_decisions | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */
export const ENABLED = false; // Gate needs 2024 holdout vs fractional-Kelly ROI.

export const N_ATOMS = 51;

/** Evenly spaced atom support over [vMin, vMax]. */
export function atomSupport(vMin: number, vMax: number, n = N_ATOMS): number[] {
  const dz = (vMax - vMin) / (n - 1);
  return Array.from({ length: n }, (_, i) => vMin + i * dz);
}

/**
 * C51 projection of the Bellman-updated distribution onto the atom support
 * (paper Eq. 7): each atom's mass is distributed to its two neighbors of the
 * projected location Tz = clip(r + gamma * z).
 */
export function projectBellman(
  probs: number[],
  reward: number,
  gamma: number,
  vMin: number,
  vMax: number,
): number[] {
  const n = probs.length;
  const z = atomSupport(vMin, vMax, n);
  const dz = (vMax - vMin) / (n - 1);
  const out = new Array<number>(n).fill(0);
  for (let j = 0; j < n; j++) {
    const tz = Math.min(vMax, Math.max(vMin, reward + gamma * z[j]!));
    const b = (tz - vMin) / dz;
    const l = Math.floor(b);
    const u = Math.ceil(b);
    const p = probs[j]!;
    if (l === u) {
      out[l]! += p;
    } else {
      out[l]! += p * (u - b);
      out[u]! += p * (b - l);
    }
  }
  return out;
}

/** Cross-entropy between the projected target and the predicted distribution. */
export function categoricalCrossEntropy(target: number[], pred: number[], eps = 1e-12): number {
  let ce = 0;
  for (let i = 0; i < target.length; i++) {
    ce -= target[i]! * Math.log(Math.max(pred[i]!, eps));
  }
  return ce;
}

export function distMean(probs: number[], vMin: number, vMax: number): number {
  const z = atomSupport(vMin, vMax, probs.length);
  return probs.reduce((s, p, i) => s + p * z[i]!, 0);
}

export function distStd(probs: number[], vMin: number, vMax: number): number {
  const z = atomSupport(vMin, vMax, probs.length);
  const m = distMean(probs, vMin, vMax);
  return Math.sqrt(probs.reduce((s, p, i) => s + p * (z[i]! - m) ** 2, 0));
}

/** Lower-tail CVaR_alpha of the return distribution. */
export function cvar(probs: number[], vMin: number, vMax: number, alpha = 0.2): number {
  const z = atomSupport(vMin, vMax, probs.length);
  let cum = 0;
  let tail = 0;
  for (let i = 0; i < probs.length; i++) {
    const take = Math.min(probs[i]!, Math.max(alpha - cum, 0));
    tail += take * z[i]!;
    cum += take;
    if (cum >= alpha) break;
  }
  return cum > 0 ? tail / cum : z[0]!;
}

export type RiskStatistic = "cvar" | "mean-minus-std";

/**
 * Greedy staking policy: pick the stake bucket maximizing the risk-adjusted
 * statistic of its return distribution.
 */
export function greedyStakeIndex(
  distributions: number[][],
  vMin: number,
  vMax: number,
  mode: RiskStatistic = "cvar",
  lambda = 1,
  alpha = 0.2,
): number {
  let best = 0;
  let bestScore = -Infinity;
  distributions.forEach((d, i) => {
    const score =
      mode === "cvar"
        ? cvar(d, vMin, vMax, alpha)
        : distMean(d, vMin, vMax) - lambda * distStd(d, vMin, vMax);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}

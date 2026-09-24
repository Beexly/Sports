/**
 * arXiv 1806.06923v2: Implicit Quantile Networks for Distributional Reinforcement Learning
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Implicit Quantile Networks learn the full return distribution via quantile regression with a cosine embedding of the quantile fraction tau and the quantile Huber loss. CVaR over the learned quantiles gives a risk-averse policy; calibration of the predicted quantiles is audited by ECE.
 *
 * Record improvement (verbatim):
 * Add the Implicit Quantile Networks (IQN) critic to GSE's staking RL stack (extends ledger 1922's C51: IQN removes the fixed [V_min,V_max] support problem that mishandles the heavy tails of weekly betting ROI). Offline dataset as in ledger 1923 (weekly slate states, discrete stake actions, settled unit-profit rewards); critic = IQN head: MLP(state) -> features, cosine tau-embedding (dim 64), elementwise product, quantile-value output, trained with quantile Huber loss (kappa=1) on N=N'=32 sampled tau pairs per minibatch; decision rule = stake a* = argmax_a E_{tau~beta}[Z_tau(s,a)] with beta = CVaR(0.25) distortion for normal weeks -- directly maximizing worst-quartile weekly return, a drawdown-aware Kelly alternative; add the CQL penalty (1923) on quantile outputs for offline pessimism. Serving: same weekly batch job, outputting per-bet stake + the full quantile curve of weekly P&L for the public write-up. Improvement beyond the paper: train the quantile function with the distortion inside the Bellman update (distorted Bellman operator -- apply beta to target quantiles before the quantile-regression step) rather than only at policy time, testing whether risk-aversion learned end-to-end beats post-hoc policy distortion.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT iff the CVaR(0.25)-policy beats the mean-policy (scalar CQL) on 2024 max drawdown by >=1.0u with ROI no worse than -1pp vs the mean policy, AND quantile calibration ECE <= 0.05; if calibration fails, REJECT the critic but keep the distortion-rule idea for the 1922 C51 head.
 */

export const ENABLED = false;

/** Cosine embedding of quantile fractions: phi_j(tau) = cos(pi * j * tau). */
export function cosineTauEmbedding(taus: number[], dim: number): number[][] {
  return taus.map((tau) =>
    Array.from({ length: dim }, (_, j) => Math.cos(Math.PI * (j + 1) * tau)),
  );
}

function huber(e: number, kappa: number): number {
  const a = Math.abs(e);
  return a <= kappa ? 0.5 * e * e : kappa * (a - 0.5 * kappa);
}

/**
 * Quantile Huber loss: mean over pairs of |tau - 1{e<0}| * huber_kappa(e)/kappa.
 */
export function quantileHuberLoss(errors: number[], taus: number[], kappa: number): number {
  let s = 0;
  for (let i = 0; i < errors.length; i++) {
    const e = errors[i]!;
    const tau = taus[i % taus.length]!;
    s += Math.abs(tau - (e < 0 ? 1 : 0)) * (huber(e, kappa) / kappa);
  }
  return s / errors.length;
}

/**
 * CVaR_alpha from learned quantiles: mean of quantile values with tau <= alpha.
 * Falls back to the minimum-tau quantile if none are below alpha.
 */
export function iqnCvar(taus: number[], values: number[], alpha: number): number {
  const sel = values.filter((_, i) => taus[i]! <= alpha);
  const use = sel.length > 0 ? sel : [values[0]!];
  return use.reduce((a, b) => a + b, 0) / use.length;
}

/** Greedy action under CVaR: argmax over actions of CVaR_alpha. */
export function cvarGreedy(
  actions: { taus: number[]; values: number[] }[],
  alpha: number,
): number {
  let best = 0;
  let bestV = -Infinity;
  for (let a = 0; a < actions.length; a++) {
    const v = iqnCvar(actions[a]!.taus, actions[a]!.values, alpha);
    if (v > bestV) {
      bestV = v;
      best = a;
    }
  }
  return best;
}

/**
 * Quantile calibration ECE: mean_j |P(outcome <= q_j) - tau_j| over the
 * predicted quantile grid.
 */
export function quantileECE(
  taus: number[],
  predQuantiles: number[][],
  outcomes: number[],
): number {
  let s = 0;
  for (let j = 0; j < taus.length; j++) {
    let hit = 0;
    for (let i = 0; i < outcomes.length; i++) if (outcomes[i]! <= predQuantiles[i]![j]!) hit++;
    s += Math.abs(hit / outcomes.length - taus[j]!);
  }
  return s / taus.length;
}

/** Gate: adopt IQN only on ROI gain with calibrated quantiles. */
export function iqnGate(roiGainPp: number, ece: number): "ADAPT" | "REJECT" {
  if (ece >= 0.05) return "REJECT";
  return roiGainPp >= 2 ? "ADAPT" : "REJECT";
}

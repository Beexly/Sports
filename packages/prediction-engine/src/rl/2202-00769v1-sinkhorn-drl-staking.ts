/**
 * arXiv 2202.00769v1: Distributional Reinforcement Learning with Regularized Wasserstein Loss
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Build the joint-distribution staking policy (SinkhornDRL): weekly state from logged picks/odds, action = stake grid, critic outputs N=32 samples of the 3-dim return vector (settled profit, -max intra-week drawdown, mean CLV) with Sinkhorn divergence to the vector Bellman target; scalarize at decision time with a tunable risk price (e.g., maximize E[profit] - 2*E[drawdown] + 0.5*E[CLV]) -- then learn the risk price itself as a contextual bandit over the season (meta-action from bankroll state, trained to end-of-season Sharpe).
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Build the joint-distribution staking policy (SinkhornDRL): weekly state from logged picks/odds, action = stake grid, critic outputs N=32 samples of the 3-dim return vector (settled profit, -max intra-week drawdown, mean CLV) with Sinkhorn divergence to the vector Bellman target; scalarize at decision time with a tunable risk price (e.g., maximize E[profit] - 2*E[drawdown] + 0.5*E[CLV]) — then learn the risk price itself as a contextual bandit over the season (meta-action from bankroll state, trained to end-of-season Sharpe).
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT iff on 2024 the joint policy Pareto-dominates the best scalar policy on >=2 of {ROI, max drawdown, CLV} with the third no worse than -5% relative; otherwise REJECT (compute not justified for a scalar-equivalent result).
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: rl_sequential_decisions | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** 1D Wasserstein-1 distance via sorted quantile matching. */
export function wasserstein1d(xs: number[], ys: number[]): number {
  const a = [...xs].sort((x, y) => x - y);
  const b = [...ys].sort((x, y) => x - y);
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += Math.abs(a[i]! - b[i]!);
  return s / n;
}

/** Sinkhorn-style entropic smoothing of a 1D transport plan (demo: soft matching). */
export function entropicTransportCost(xs: number[], ys: number[], eps: number): number {
  // dual-free demo: W1 + eps * entropy penalty proxy
  const w1 = wasserstein1d(xs, ys);
  return w1 + eps * Math.log(Math.max(2, xs.length));
}

/** Scalarize a 3-dim return sample (profit, -drawdown, CLV) with a risk price. */
export function scalarizeReturn(sample: [number, number, number], riskPrice: number, clvWeight: number): number {
  return sample[0] - riskPrice * sample[1] + clvWeight * sample[2];
}

/** Contextual risk-price bandit update (exponential weights over price grid). */
export function riskPriceUpdate(
  weights: number[],
  priceGrid: number[],
  realizedSharpes: number[][],
  eta: number,
): number[] {
  const losses = priceGrid.map((_, i) => -realizedSharpes[i]!.reduce((a, b) => a + b, 0) / realizedSharpes[i]!.length);
  const un = weights.map((w, i) => w * Math.exp(-eta * losses[i]!));
  const s = un.reduce((a, b) => a + b, 0);
  return un.map((x) => x / s);
}

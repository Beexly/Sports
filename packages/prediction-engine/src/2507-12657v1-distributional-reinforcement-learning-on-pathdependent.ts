/**
 * arXiv:2507.12657v1 — Distributional Reinforcement Learning on Path-dependent Options
 *
 * Season-level risk reporting: an RBF-quantile model over (bankroll, running profit, weeks remaining)
 * learns the distribution of season profit each week, reporting P(profit<0) and CVaR for pre-tail-event
 * sizing.
 *
 * Improvement: GSE adds season-level risk reporting: an RBF-quantile model over (bankroll, running profit, weeks remaining) learns the distribution of season profit each week, reporting P(season profit < 0) and CVaR to size down before tail events.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT iff on 2023-2024 the RBF-quantile model's season-profit quantile ECE <=0.05 AND it beats the Monte Carlo baseline on CVaR_0.1 absolute error by >=10% relative.
 */

/** RBF-quantile model: K centers, one quantile head per tau. */
export interface RbfQuantileModel {
  centers: number[][];
  bandwidth: number;
  /** weights[tauIdx][centerIdx]; taus sorted ascending. */
  weights: number[][];
  taus: number[];
}

function rbfKernel(x: number[], c: number[], bw: number): number {
  const d2 = x.reduce((s, v, i) => s + ((v - (c[i] ?? 0)) ** 2), 0);
  return Math.exp(-d2 / (2 * bw * bw));
}

/** Feature map: RBF activations at each center. */
export function rbfFeatures(m: RbfQuantileModel, x: number[]): number[] {
  return m.centers.map((c) => rbfKernel(x, c, m.bandwidth));
}

/** Predicted quantile values at x (one per tau). */
export function predictQuantiles(m: RbfQuantileModel, x: number[]): number[] {
  const phi = rbfFeatures(m, x);
  return m.weights.map((w) => w.reduce((s, wj, j) => s + wj * (phi[j] ?? 0), 0));
}

/** P(season profit < 0) by interpolating the quantile CDF. */
export function probNegativeProfit(m: RbfQuantileModel, x: number[]): number {
  const qs = predictQuantiles(m, x);
  // find bracketing taus around 0
  for (let i = 0; i < qs.length - 1; i++) {
    const q0 = qs[i] ?? 0;
    const q1 = qs[i + 1] ?? 0;
    if (q0 <= 0 && q1 >= 0) {
      const t0 = m.taus[i] ?? 0;
      const t1 = m.taus[i + 1] ?? 1;
      const frac = q1 === q0 ? 0.5 : (0 - q0) / (q1 - q0);
      return t0 + frac * (t1 - t0);
    }
  }
  return (qs[0] ?? 0) > 0 ? 0 : 1;
}

/** CVaR at level alpha (mean of quantiles below alpha). */
export function cvar(m: RbfQuantileModel, x: number[], alpha: number): number {
  if (alpha <= 0 || alpha >= 1) throw new Error("cvar: alpha in (0,1)");
  const qs = predictQuantiles(m, x);
  const below = qs.filter((_, i) => (m.taus[i] ?? 0) <= alpha);
  if (below.length === 0) throw new Error("cvar: no quantiles below alpha");
  return below.reduce((a, b) => a + b, 0) / below.length;
}

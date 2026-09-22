/**
 * Multivariate simultaneous Kelly staking (arXiv 2307.13807v1).
 *
 * Portfolio staking over simultaneous edges: maximize expected
 * log-growth of the bankroll over the stake vector f subject to
 * f_i >= 0 and sum(f) <= 1 (no leverage, no shorting). Binary-outcome
 * approximation per leg (win prob p_i, decimal odds b_i) with a
 * correlation haircut, solved by projected gradient ascent; the Kelly
 * fraction is adaptive — scaled by a calibration multiplier
 * (1 - ECE-style miscalibration penalty), shrinking stakes when the
 * model is miscalibrated.
 *
 * ACCEPTANCE GATE: ADAPT iff the multivariate Kelly backtest beats
 * flat staking on final wealth with max drawdown no worse, at
 * p < 0.10 on the wealth difference; REJECT if drawdown is worse or
 * the wealth edge is insignificant.
 *
 * Research-only module. Not wired into any live staking path.
 */

export interface Edge {
  /** Win probability. */
  p: number;
  /** Decimal odds. */
  odds: number;
  /** Pairwise correlation with other legs (optional haircut). */
  corr?: readonly number[];
}

/** Univariate Kelly fraction for one binary edge. */
export function kellyFraction(p: number, odds: number): number {
  if (p <= 0 || p >= 1 || odds <= 1) throw new Error("kellyFraction: invalid edge");
  const b = odds - 1;
  return Math.max(0, (p * (b + 1) - 1) / b);
}

/**
 * Simultaneous Kelly stakes via projected gradient ascent on
 * expected log-growth: E[log(1 + sum f_i (X_i - 1))] with X_i in
 * {odds_i w.p. p_i, 0 w.p. 1-p_i}, approximated by Monte Carlo over
 * joint outcomes (Gaussian copula: shared shock induces correlation
 * while preserving each leg's marginal win probability).
 */
export function simultaneousKelly(
  edges: readonly Edge[],
  rand: () => number,
  opts: { iters?: number; lr?: number; sims?: number; kellyScale?: number } = {},
): number[] {
  if (edges.length === 0) throw new Error("simultaneousKelly: no edges");
  const { iters = 400, lr = 0.05, sims = 4000, kellyScale = 1 } = opts;
  if (kellyScale <= 0) throw new Error("simultaneousKelly: kellyScale > 0");
  const n = edges.length;
  // Start at independent fractional-Kelly stakes, projected.
  let f = edges.map((e) => kellyFraction(e.p, e.odds) * kellyScale * 0.5);
  f = projectSimplex(f);
  for (let it = 0; it < iters; it++) {
    const grad = new Array(n).fill(0);
    for (let s = 0; s < sims; s++) {
      const zCommon = gauss(rand); // shared shock
      const rets = edges.map((e, i) => {
        const rho = avgCorr(e, edges, i);
        const z = Math.sqrt(rho) * zCommon + Math.sqrt(1 - rho) * gauss(rand);
        const win = phi(z) < e.p;
        return win ? e.odds - 1 : -1;
      });
      const wealth = 1 + dot(f, rets);
      // Floor (don't skip): ruin outcomes contribute a large negative
      // gradient, repelling the optimizer from bankruptcy.
      const w = Math.max(wealth, 1e-3);
      for (let i = 0; i < n; i++) grad[i]! += (rets[i] as number) / w / sims;
    }
    f = projectSimplex(f.map((x, i) => x + lr * (grad[i] as number)));
  }
  return f;
}

/**
 * Adaptive Kelly scale from calibration: scale = max(0.25, 1 - 2*ece),
 * so a miscalibrated model (ECE 0.1) stakes at 0.8x, heavily
 * miscalibrated (>= 0.375 ECE) floors at 0.25x.
 */
export function adaptiveKellyScale(ece: number): number {
  if (ece < 0 || ece > 1) throw new Error("adaptiveKellyScale: ece in [0,1]");
  return Math.max(0.25, 1 - 2 * ece);
}

/** Simulate bankroll growth for a stake vector over outcomes. */
export function simulateWealth(
  stakes: readonly number[],
  edges: readonly Edge[],
  outcomes: readonly boolean[],
  bankroll = 1,
): { wealth: number; maxDrawdown: number } {
  if (stakes.length !== edges.length || edges.length !== outcomes.length) {
    throw new Error("simulateWealth: length mismatch");
  }
  let w = bankroll;
  let peak = bankroll;
  let maxDd = 0;
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i] as Edge;
    const f = stakes[i] as number;
    w += w * f * ((outcomes[i] as boolean) ? e.odds - 1 : -1);
    peak = Math.max(peak, w);
    maxDd = Math.max(maxDd, (peak - w) / peak);
  }
  return { wealth: w, maxDrawdown: maxDd };
}

function avgCorr(e: Edge, edges: readonly Edge[], i: number): number {
  if (!e.corr) return 0;
  const others = e.corr.filter((_, j) => j !== i);
  if (others.length === 0) return 0;
  return Math.min(0.9, Math.max(0, others.reduce((s, x) => s + x, 0) / others.length));
}

/** Standard normal draw via Box-Muller. */
function gauss(rand: () => number): number {
  const u1 = Math.max(1e-12, rand());
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** Standard normal CDF (Abramowitz-Stegun). */
function phi(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x >= 0 ? 1 - p : p;
}

function dot(a: readonly number[], b: readonly number[]): number {
  return a.reduce((s, x, i) => s + x * (b[i] as number), 0);
}

/**
 * Project onto {f >= 0, sum f <= 1}. If the positive part already fits
 * in the budget, clip at zero; otherwise project onto the equality
 * simplex (Duchi et al.).
 */
function projectSimplex(v: readonly number[]): number[] {
  const pos = v.map((x) => Math.max(0, x));
  if (pos.reduce((s, x) => s + x, 0) <= 1) return pos;
  const n = v.length;
  const u = [...v].sort((a, b) => b - a);
  let rho = 0;
  let cumsum = 0;
  for (let j = 0; j < n; j++) {
    cumsum += u[j] as number;
    const t = (cumsum - 1) / (j + 1);
    if ((u[j] as number) - t > 0) rho = j + 1;
  }
  const theta = (u.slice(0, rho).reduce((s, x) => s + x, 0) - 1) / rho;
  return v.map((x) => Math.max(0, x - theta));
}

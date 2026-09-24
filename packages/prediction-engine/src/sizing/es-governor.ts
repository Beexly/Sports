/**
 * Kelly staking with an expected-shortfall tail governor (arXiv 2112.14451v1).
 *
 * Each slate, start from full-Kelly fractions from engine edges,
 * Monte-Carlo the slate portfolio log-return distribution under the pick
 * outcome model, and compute ES_alpha (expected shortfall at level alpha).
 * If ES_alpha exceeds the bankroll risk budget, shrink all fractions by a
 * scalar s in (0, 1) — the paper's interior solution as a convex mixture
 * of the growth-optimal and minimum-risk wealth positions. The replicated
 * mean-ES frontier must be (a) concave, (b) anchored at the growth-optimal
 * endpoint, (c) terminating at a finite min-ES point, and (d) shifting
 * left as alpha rises.
 *
 * ACCEPTANCE GATE: run the governor on GSE's walk-forward picks comparing
 * fixed quarter-Kelly vs ES-governed Kelly (alpha = 0.95, ES budget = 15%
 * bankroll log-return).
 *
 * Research-only module. Not wired into any live staking path.
 */

export interface SlatePick {
  /** Full-Kelly fraction of bankroll for this pick. */
  kellyFrac: number;
  /** Decimal odds. */
  decimalOdds: number;
  /** Engine win probability. */
  winProb: number;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Monte-Carlo slate log-returns at shrink scalar s: each pick wins
 * independently with its winProb; log-return = log(1 + s * sum pnl).
 */
export function simulateSlateLogReturns(
  picks: readonly SlatePick[],
  s: number,
  nSims: number,
  seed = 42,
): number[] {
  if (picks.length === 0) throw new Error("simulateSlateLogReturns: no picks");
  if (s < 0 || s > 1) throw new Error("simulateSlateLogReturns: s in [0,1]");
  if (nSims < 1) throw new Error("simulateSlateLogReturns: nSims >= 1");
  const rand = mulberry32(seed);
  const out = new Array<number>(nSims);
  for (let k = 0; k < nSims; k++) {
    let pnl = 0;
    for (const p of picks) {
      const f = s * p.kellyFrac;
      pnl += rand() < p.winProb ? f * (p.decimalOdds - 1) : -f;
    }
    out[k] = Math.log(Math.max(1e-12, 1 + pnl));
  }
  return out;
}

function quantile(sorted: readonly number[], q: number): number {
  const n = sorted.length;
  const pos = q * (n - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return (sorted[lo] as number) + (pos - lo) * ((sorted[hi] as number) - (sorted[lo] as number));
}

export interface TailStats {
  mean: number;
  /** VaR_alpha: the alpha-quantile of the loss distribution (positive = loss). */
  var: number;
  /** ES_alpha: mean loss beyond VaR (positive = loss). */
  es: number;
}

/** Mean log-return, VaR and ES from simulated log-returns (losses positive). */
export function tailStats(logReturns: readonly number[], alpha: number): TailStats {
  if (logReturns.length === 0) throw new Error("tailStats: no simulations");
  if (alpha <= 0 || alpha >= 1) throw new Error("tailStats: alpha in (0,1)");
  const losses = logReturns.map((r) => -r).sort((a, b) => a - b);
  const varT = quantile(losses, alpha);
  const tail = losses.filter((l) => l >= varT);
  const mean = logReturns.reduce((a, r) => a + r, 0) / logReturns.length;
  const tailMean = tail.reduce((a, l) => a + l, 0) / Math.max(1, tail.length);
  return {
    mean,
    var: varT,
    // ES >= VaR is a mathematical identity; the max guards float noise.
    es: Math.max(varT, tailMean),
  };
}

export interface GovernorResult {
  /** Shrink scalar applied (1 = no governing needed). */
  s: number;
  governed: boolean;
  stats: TailStats;
}

/**
 * ES governor: bisect s in (0, 1] so that ES_alpha <= esBudget. Returns
 * s = 1 when the ungoverned slate already satisfies the budget.
 */
export function esGovernor(
  picks: readonly SlatePick[],
  alpha: number,
  esBudget: number,
  nSims = 20000,
  seed = 42,
): GovernorResult {
  const full = tailStats(simulateSlateLogReturns(picks, 1, nSims, seed), alpha);
  if (full.es <= esBudget) return { s: 1, governed: false, stats: full };
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const st = tailStats(simulateSlateLogReturns(picks, mid, nSims, seed), alpha);
    if (st.es <= esBudget) lo = mid;
    else hi = mid;
  }
  const stats = tailStats(simulateSlateLogReturns(picks, lo, nSims, seed), alpha);
  return { s: lo, governed: true, stats };
}

/**
 * Mean-ES frontier: (mean, ES) at shrink scalars from sMax down to ~0.
 * The paper's checks: concave, anchored at the growth-optimal endpoint,
 * terminating at a finite min-ES point.
 */
export function meanEsFrontier(
  picks: readonly SlatePick[],
  alpha: number,
  nPoints = 21,
  nSims = 20000,
  seed = 42,
): Array<{ s: number; mean: number; es: number }> {
  return Array.from({ length: nPoints }, (_, i) => {
    const s = 1 - (i / (nPoints - 1)) * 0.99; // 1 -> 0.01
    const st = tailStats(simulateSlateLogReturns(picks, s, nSims, seed), alpha);
    return { s, mean: st.mean, es: st.es };
  });
}

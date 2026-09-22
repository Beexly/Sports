
export interface MaxDdOptions {
  /** Minimum weight per selected bet (paper: 0.05). */
  readonly minW?: number;
  /** Maximum weight per bet (paper: 0.50). */
  readonly maxW?: number;
  readonly iters?: number;
  readonly lr?: number;
}

/** Project onto {w: sum=1, lo<=w<=hi} via bisection on the shift theta. */
export function projectCappedSimplex(w: readonly number[], lo: number, hi: number): number[] {
  const n = w.length;
  if (n === 0) return [];
  let low = -1e9;
  let high = 1e9;
  const clipped = (theta: number): number[] => w.map((v) => Math.min(hi, Math.max(lo, v - theta)));
  for (let it = 0; it < 200; it++) {
    const mid = (low + high) / 2;
    const s = clipped(mid).reduce((a, b) => a + b, 0);
    if (s > 1) low = mid;
    else high = mid;
  }
  return clipped((low + high) / 2);
}

/**
 * Maximin portfolio: maximize the worst session return min_s (r_s . w).
 * sessionReturns[s][b] = return multiple of bet b in session s.
 */
export function constrainedMaxDrawdownWeights(
  sessionReturns: ReadonlyArray<readonly number[]>,
  opts: MaxDdOptions = {},
): number[] {
  const nSessions = sessionReturns.length;
  if (nSessions === 0) throw new Error("max-drawdown-portfolio: need >= 1 session");
  const nBets = sessionReturns[0]?.length ?? 0;
  if (nBets === 0) throw new Error("max-drawdown-portfolio: need >= 1 bet");
  const minW = opts.minW ?? 0.05;
  const maxW = opts.maxW ?? 0.5;
  const iters = opts.iters ?? 2000;
  const lr = opts.lr ?? 0.05;
  let w = new Array<number>(nBets).fill(1 / nBets);
  for (let it = 0; it < iters; it++) {
    // find worst session under current w
    let worst = 0;
    let worstRet = Infinity;
    for (let s = 0; s < nSessions; s++) {
      const row = sessionReturns[s] ?? [];
      let r = 0;
      for (let b = 0; b < nBets; b++) r += (w[b] ?? 0) * (row[b] ?? 0);
      if (r < worstRet) {
        worstRet = r;
        worst = s;
      }
    }
    const row = sessionReturns[worst] ?? [];
    w = projectCappedSimplex(
      w.map((wb, b) => wb + lr * (row[b] ?? 0)),
      minW,
      maxW,
    );
  }
  return w;
}

/**
 * Drawdown-adaptive bounds: shrink maxW after a bad 30-day window.
 * Returns the adapted (minW, maxW) pair.
 */
export function drawdownAdaptiveBounds(recentDrawdown: number, baseMaxW: number, baseMinW = 0.05): { minW: number; maxW: number } {
  const dd = Math.max(recentDrawdown, 0);
  const maxW = Math.max(baseMinW, baseMaxW * (1 - Math.min(dd, 0.5)));
  return { minW: baseMinW, maxW };
}

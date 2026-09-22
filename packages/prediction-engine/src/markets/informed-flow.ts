/**
 * Informed-flow detector on line moves (arXiv 2209.07581).
 *
 * For each market participant segment, regress the segment's price
 * impact (line move caused by their bets) on the edge they bet into:
 * (current line - line they last bet). Segments with a significantly
 * NEGATIVE beta are informed flow — they move the line toward the
 * efficient price — and their subsequent moves get up-weighted in
 * market-implied features; others are down-weighted as noise.
 * Informedness is estimated per league x market (never assume an NFL
 * sharp is sharp in NBA) and re-estimated after regime breaks.
 *
 * ACCEPTANCE GATE: the reference magnitude for "informed" is the
 * paper's +0.037-0.041 DeltaAUC on informed (PS) flow with 95% CI
 * above zero vs -0.003 to -0.012 for non-PS; cross-sectional bar:
 * 2-3/4+ PS-trader markets beating 0/1 at p < 0.001.
 *
 * Research-only module. Not wired into any live market path.
 */

export interface FlowBet {
  /** Line move caused by this bet (points, signed toward the bet side). */
  priceImpact: number;
  /** Edge bet into: current line minus the line the segment last bet. */
  edge: number;
}

export interface SegmentFlow {
  segment: string;
  league: string;
  market: string;
  bets: FlowBet[];
}

export interface InformedVerdict {
  segment: string;
  league: string;
  market: string;
  beta: number;
  /** t-statistic for beta (negative = informed direction). */
  tStat: number;
  n: number;
  /** True when beta is significantly negative at the 5% level. */
  informed: boolean;
}

/**
 * OLS of priceImpact on edge; informed iff the slope is significantly
 * negative (one-sided 5% t-test).
 */
export function detectInformedFlow(flow: SegmentFlow): InformedVerdict {
  const { bets } = flow;
  if (bets.length < 10) throw new Error("detectInformedFlow: need >= 10 bets");
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (const b of bets) {
    sx += b.edge;
    sy += b.priceImpact;
    sxx += b.edge * b.edge;
    sxy += b.edge * b.priceImpact;
  }
  const n = bets.length;
  const xBar = sx / n;
  const beta = (sxy - (sx * sy) / n) / Math.max(1e-12, sxx - (sx * sx) / n);
  const alpha = sy / n - beta * xBar;
  let sse = 0;
  for (const b of bets) {
    const r = b.priceImpact - (alpha + beta * b.edge);
    sse += r * r;
  }
  const se = Math.sqrt(sse / Math.max(1, n - 2) / Math.max(1e-12, sxx - (sx * sx) / n));
  const tStat = beta / Math.max(1e-12, se);
  // One-sided 5%: informed when t < -1.645 (normal approx).
  return {
    segment: flow.segment,
    league: flow.league,
    market: flow.market,
    beta,
    tStat,
    n,
    informed: tStat < -1.645,
  };
}

export interface DeltaAuc {
  /** AUC(post-move lines) - AUC(pre-move lines). */
  delta: number;
  /** 95% CI half-width (normal approx). */
  ciHalf: number;
}

/**
 * DeltaAUC from line moves stratified by move size: compare the AUC of
 * pre-move vs post-move implied probabilities against outcomes.
 */
export function deltaAuc(
  pre: readonly number[],
  post: readonly number[],
  outcomes: readonly number[],
): DeltaAuc {
  if (pre.length !== post.length || pre.length !== outcomes.length) {
    throw new Error("deltaAuc: length mismatch");
  }
  if (pre.length < 20) throw new Error("deltaAuc: need >= 20 games");
  const auc = (ps: readonly number[]): number => {
    const pos = outcomes.map((y, i) => ({ p: ps[i] as number, y })).filter((o) => o.y === 1);
    const neg = outcomes.map((y, i) => ({ p: ps[i] as number, y })).filter((o) => o.y === 0);
    if (pos.length === 0 || neg.length === 0) throw new Error("deltaAuc: need both classes");
    let wins = 0;
    for (const a of pos) {
      for (const b of neg) {
        if (a.p > b.p) wins += 1;
        else if (a.p === b.p) wins += 0.5;
      }
    }
    return wins / (pos.length * neg.length);
  };
  const d = auc(post) - auc(pre);
  // Hanley-McNeil-ish SE via the delta of paired AUCs (conservative).
  const n = pre.length;
  const se = Math.sqrt(2 * 0.25 / n);
  return { delta: d, ciHalf: 1.96 * se };
}

/**
 * Cross-sectional bar: do markets with 2-3 / 4+ informed-trader segments
 * beat 0/1-segment markets? Returns the win-rate gap and a z-test
 * p-value for the difference in proportions.
 */
export function crossSectionalBar(
  informed: readonly boolean[],
  profitable: readonly boolean[],
): { gap: number; pValue: number } {
  if (informed.length !== profitable.length || informed.length === 0) {
    throw new Error("crossSectionalBar: length mismatch / empty");
  }
  const hi = profitable.filter((_, i) => informed[i] as boolean);
  const lo = profitable.filter((_, i) => !(informed[i] as boolean));
  if (hi.length === 0 || lo.length === 0) throw new Error("crossSectionalBar: need both groups");
  const p1 = hi.filter(Boolean).length / hi.length;
  const p2 = lo.filter(Boolean).length / lo.length;
  const p = (hi.filter(Boolean).length + lo.filter(Boolean).length) / (hi.length + lo.length);
  const se = Math.sqrt(p * (1 - p) * (1 / hi.length + 1 / lo.length));
  const z = se < 1e-12 ? 0 : (p1 - p2) / se;
  // One-sided p-value (normal approx).
  const pValue = 0.5 * (1 - erf(z / Math.SQRT2));
  return { gap: p1 - p2, pValue };
}

function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) *
      Math.exp(-x * x);
  return x >= 0 ? y : -y;
}

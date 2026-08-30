/**
 * Spearman rank correlation + separation diagnostics for GSE ranking.
 *
 * Murphy RES answers: do bins finish at different rates?
 * Spearman answers: does the *ordering* of p match the ordering of outcomes?
 * Separation answers: mean p|win − mean p|loss (L1 ranking gap).
 *
 * World-class use on the site:
 *  - Compare confidence vs rankingP vs marketImplied on the same holdout
 *  - pathViable only if Spearman ρ and separation clear noise floors
 *  - Never treat ρ as ROI or PROVEN unlock
 */

export type RankedPoint = {
  readonly p: number;
  readonly y: 0 | 1;
};

export type SpearmanResult = {
  readonly n: number;
  readonly rho: number;
  readonly meanPWin: number;
  readonly meanPLoss: number;
  /** meanPWin − meanPLoss */
  readonly separation: number;
  /** Rough z under H0 ρ=0 for large n: z ≈ ρ √(n−1) */
  readonly zApprox: number;
  readonly pApprox: number;
  /** True when ρ and separation jointly suggest ranking skill. */
  readonly rankingSignal: boolean;
  readonly note: string;
};

export type ScoreKindSeparation = {
  readonly kind: string;
  readonly result: SpearmanResult;
};

function erfApprox(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const y =
    1 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

function normalTwoTailP(z: number): number {
  const az = Math.abs(z);
  if (!Number.isFinite(az)) return 1;
  return Math.max(0, Math.min(1, 1 - erfApprox(az / Math.SQRT2)));
}

/** Average ranks with tie mid-ranks. */
export function rankWithTies(values: readonly number[]): number[] {
  const n = values.length;
  const idx = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(n).fill(0);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && idx[j + 1]!.v === idx[i]!.v) j++;
    const avg = (i + j) / 2 + 1; // 1-based average rank
    for (let k = i; k <= j; k++) ranks[idx[k]!.i] = avg;
    i = j + 1;
  }
  return ranks;
}

export function spearmanRho(
  xs: readonly number[],
  ys: readonly number[],
): number {
  if (xs.length !== ys.length || xs.length < 3) return 0;
  const rx = rankWithTies(xs);
  const ry = rankWithTies(ys);
  const n = xs.length;
  const mx = rx.reduce((s, v) => s + v, 0) / n;
  const my = ry.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = rx[i]! - mx;
    const b = ry[i]! - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  return den > 0 ? num / den : 0;
}

export function computeSpearmanSeparation(
  points: readonly RankedPoint[],
  options?: {
    readonly minN?: number;
    readonly minRho?: number;
    readonly minSeparation?: number;
  },
): SpearmanResult {
  const minN = options?.minN ?? 30;
  const minRho = options?.minRho ?? 0.05;
  const minSeparation = options?.minSeparation ?? 0.03;
  const n = points.length;
  if (n < 3) {
    return {
      n,
      rho: 0,
      meanPWin: NaN,
      meanPLoss: NaN,
      separation: 0,
      zApprox: 0,
      pApprox: 1,
      rankingSignal: false,
      note: "n too small",
    };
  }
  const ps = points.map((p) => p.p);
  const ys = points.map((p) => p.y);
  const rho = spearmanRho(ps, ys);
  const wins = points.filter((p) => p.y === 1);
  const losses = points.filter((p) => p.y === 0);
  const meanPWin =
    wins.length === 0 ? NaN : wins.reduce((s, r) => s + r.p, 0) / wins.length;
  const meanPLoss =
    losses.length === 0
      ? NaN
      : losses.reduce((s, r) => s + r.p, 0) / losses.length;
  const separation =
    Number.isFinite(meanPWin) && Number.isFinite(meanPLoss)
      ? meanPWin - meanPLoss
      : 0;
  const zApprox = rho * Math.sqrt(Math.max(1, n - 1));
  const pApprox = normalTwoTailP(zApprox);
  const rankingSignal =
    n >= minN && Math.abs(rho) >= minRho && Math.abs(separation) >= minSeparation;

  return {
    n,
    rho,
    meanPWin,
    meanPLoss,
    separation,
    zApprox,
    pApprox,
    rankingSignal,
    note: rankingSignal
      ? "Ordering of p aligns with outcomes — ranking path has signal"
      : "Weak rank correlation / separation — maps cannot invent RES",
  };
}

/**
 * Multi-score bake-off: same outcomes, different p series.
 * Prefer the kind with highest |ρ| subject to rankingSignal.
 */
export function compareScoreKinds(
  series: readonly {
    readonly kind: string;
    readonly points: readonly RankedPoint[];
  }[],
): {
  readonly results: readonly ScoreKindSeparation[];
  readonly bestKind: string | null;
  readonly note: string;
} {
  const results = series.map((s) => ({
    kind: s.kind,
    result: computeSpearmanSeparation(s.points),
  }));
  const ranked = [...results].sort(
    (a, b) => Math.abs(b.result.rho) - Math.abs(a.result.rho),
  );
  const best =
    ranked.find((r) => r.result.rankingSignal) ?? ranked[0] ?? null;
  return {
    results,
    bestKind: best?.kind ?? null,
    note: best
      ? `Best rank correlation: ${best.kind} ρ=${best.result.rho.toFixed(4)} sep=${best.result.separation.toFixed(4)}`
      : "No score series provided",
  };
}

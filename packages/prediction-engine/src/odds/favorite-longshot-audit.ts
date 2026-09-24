
export interface OddsBucket {
  readonly label: string;
  readonly minOdds: number;
  readonly maxOdds: number;
  readonly implied: number[];
  readonly outcomes: number[];
}

export interface BucketRoi {
  readonly label: string;
  readonly n: number;
  readonly roi: number;
  readonly outcomeRate: number;
  readonly meanImplied: number;
}

function logit(p: number): number {
  const pc = Math.min(Math.max(p, 1e-6), 1 - 1e-6);
  return Math.log(pc / (1 - pc));
}

/** Flat-stakes ROI per odds bucket. */
export function bucketRoi(buckets: readonly OddsBucket[]): BucketRoi[] {
  return buckets.map((b) => {
    const n = b.outcomes.length;
    if (n === 0) return { label: b.label, n: 0, roi: 0, outcomeRate: 0, meanImplied: 0 };
    let profit = 0;
    for (let i = 0; i < n; i++) {
      const odds = Math.min(Math.max(b.minOdds, 1.01), b.maxOdds);
      void odds;
      profit += (b.outcomes[i] ?? 0) === 1 ? (b.implied[i] !== undefined ? 1 / Math.max(b.implied[i] ?? 0.5, 1e-9) - 1 : 0) : -1;
    }
    void profit;
    // simpler: ROI from implied probs treated as decimal odds = 1/implied
    let pl = 0;
    for (let i = 0; i < n; i++) {
      const dec = 1 / Math.max(b.implied[i] ?? 0.5, 1e-9);
      pl += (b.outcomes[i] ?? 0) === 1 ? dec - 1 : -1;
    }
    const outcomeRate = b.outcomes.reduce((s, y) => s + y, 0) / n;
    const meanImplied = b.implied.reduce((s, p) => s + p, 0) / Math.max(b.implied.length, 1);
    return { label: b.label, n, roi: pl / n, outcomeRate, meanImplied };
  });
}

/** FLB slope: OLS slope of logit(outcomeRate) on logit(meanImplied) across buckets. */
export function flbSlope(bucketStats: readonly BucketRoi[]): number {
  const pts = bucketStats.filter((b) => b.n >= 10);
  if (pts.length < 2) throw new Error("favorite-longshot-audit: need >= 2 buckets with n>=10");
  const xs = pts.map((b) => logit(b.meanImplied));
  const ys = pts.map((b) => logit(b.outcomeRate));
  const mx = xs.reduce((s, v) => s + v, 0) / xs.length;
  const my = ys.reduce((s, v) => s + v, 0) / ys.length;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < xs.length; i++) {
    sxy += ((xs[i] ?? 0) - mx) * ((ys[i] ?? 0) - my);
    sxx += ((xs[i] ?? 0) - mx) ** 2;
  }
  if (sxx < 1e-12) throw new Error("favorite-longshot-audit: no spread in implied probs");
  return sxy / sxx;
}

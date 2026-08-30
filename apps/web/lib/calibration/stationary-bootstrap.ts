/**
 * Stationary bootstrap for time-ordered calibration series.
 * Preserves local dependence better than IID resample.
 * Internal uncertainty only — not public claims.
 */

/** Length-n indices into [0, n) via stationary bootstrap (Politis–Romano). */
export function stationaryBootstrapIndices(
  n: number,
  meanBlock: number,
  rand: () => number,
): number[] {
  if (n <= 0) return [];
  const p = 1 / Math.max(meanBlock, 1);
  const out = new Array<number>(n);
  let t = 0;
  while (t < n) {
    const start = Math.floor(rand() * n);
    // geometric length, min 1: P(L=k) = (1-p)^{k-1} p
    let L = 1;
    while (rand() > p) L++;
    for (let j = 0; j < L && t < n; j++) {
      out[t] = (start + j) % n;
      t++;
    }
  }
  return out;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function stationaryBootstrapResample<T>(
  rows: readonly T[],
  meanBlock = 14,
  rand: () => number = mulberry32(0),
): T[] {
  const idx = stationaryBootstrapIndices(rows.length, meanBlock, rand);
  return idx.map((i) => rows[i]!);
}

export function brierScore(p: readonly number[], y: readonly number[]): number {
  if (p.length === 0) return NaN;
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const pi = Math.min(1 - 1e-15, Math.max(1e-15, p[i]!));
    s += (pi - y[i]!) ** 2;
  }
  return s / p.length;
}

/** Point Brier + stationary-bootstrap CI on time-ordered (p,y). */
export function bootstrapBrierCi(
  p: readonly number[],
  y: readonly number[],
  options?: {
    readonly B?: number;
    readonly meanBlock?: number;
    readonly alpha?: number;
    readonly seed?: number;
  },
): { readonly point: number; readonly lower: number; readonly upper: number } {
  const B = options?.B ?? 400;
  const meanBlock = options?.meanBlock ?? 14;
  const alpha = options?.alpha ?? 0.05;
  const rand = mulberry32(options?.seed ?? 0);
  const point = brierScore(p, y);
  const n = y.length;
  const stats: number[] = [];
  for (let b = 0; b < B; b++) {
    const idx = stationaryBootstrapIndices(n, meanBlock, rand);
    const pb = idx.map((i) => p[i]!);
    const yb = idx.map((i) => y[i]!);
    stats.push(brierScore(pb, yb));
  }
  stats.sort((a, b) => a - b);
  const lo = stats[Math.floor((alpha / 2) * (stats.length - 1))] ?? point;
  const hi = stats[Math.ceil((1 - alpha / 2) * (stats.length - 1))] ?? point;
  return { point, lower: lo, upper: hi };
}

export type MapGridBand = {
  readonly grid: readonly number[];
  readonly median: readonly number[];
  readonly lower: readonly number[];
  readonly upper: readonly number[];
  readonly nBootstrap: number;
  readonly meanBlock: number;
  readonly note: string;
};

/**
 * Pointwise percentile bands for a calibration map under stationary bootstrap.
 * fitFn(scores, outcomes) -> predict(score) => p_hat
 */
export function bootstrapMapGrid(
  scores: readonly number[],
  outcomes: readonly number[],
  fitFn: (
    scores: readonly number[],
    outcomes: readonly number[],
  ) => (score: number) => number,
  scoreGrid: readonly number[],
  options?: {
    readonly B?: number;
    readonly meanBlock?: number;
    readonly alpha?: number;
    readonly seed?: number;
  },
): MapGridBand {
  const B = options?.B ?? 100;
  const meanBlock = options?.meanBlock ?? 14;
  const alpha = options?.alpha ?? 0.05;
  const rand = mulberry32(options?.seed ?? 0);
  const n = scores.length;
  const preds: number[][] = scoreGrid.map(() => []);

  for (let b = 0; b < B; b++) {
    const idx = stationaryBootstrapIndices(n, meanBlock, rand);
    const sB = idx.map((i) => scores[i]!);
    const yB = idx.map((i) => outcomes[i]!);
    const predict = fitFn(sB, yB);
    for (let g = 0; g < scoreGrid.length; g++) {
      preds[g]!.push(predict(scoreGrid[g]!));
    }
  }

  const median: number[] = [];
  const lower: number[] = [];
  const upper: number[] = [];
  for (const col of preds) {
    const sorted = [...col].sort((a, b) => a - b);
    const nB = sorted.length;
    median.push(sorted[Math.floor(0.5 * (nB - 1))] ?? 0.5);
    lower.push(sorted[Math.floor((alpha / 2) * (nB - 1))] ?? 0);
    upper.push(sorted[Math.ceil((1 - alpha / 2) * (nB - 1))] ?? 1);
  }

  return {
    grid: scoreGrid,
    median,
    lower,
    upper,
    nBootstrap: B,
    meanBlock,
    note: "Stationary-bootstrap map band — internal only; not for public claims.",
  };
}

export { mulberry32 as createSeededRng };

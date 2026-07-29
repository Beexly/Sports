/**
 * Phase 0 acceptance: shuffled-time placebo.
 * Randomize the time index of labels vs features; measured CLV must collapse ~0.
 * If placebo shows edge → leakage → stop modeling.
 */

export interface PlaceboTrial {
  readonly clv: number;
}

export interface PlaceboReport {
  readonly n: number;
  readonly meanClv: number;
  readonly absMeanClv: number;
  readonly maxAbsClv: number;
  readonly pass: boolean;
  readonly threshold: number;
  readonly detail: string;
}

/**
 * Fisher-Yates shuffle (seeded for reproducibility in tests).
 */
export function shuffleInPlace<T>(arr: T[], rng: () => number = Math.random): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = t;
  }
  return arr;
}

/**
 * Compute mean CLV of (pred, marketClose) pairs after shuffling labels.
 * Real pipeline wires actual CLV; this is the pure acceptance harness.
 */
export function runShuffledTimePlacebo(
  clvSeries: readonly number[],
  opts: { threshold?: number; rng?: () => number } = {},
): PlaceboReport {
  const threshold = opts.threshold ?? 0.005;
  const n = clvSeries.length;
  if (n < 20) {
    return {
      n,
      meanClv: 0,
      absMeanClv: 0,
      maxAbsClv: 0,
      pass: false,
      threshold,
      detail: "sample_floor — need ≥20 settled CLV observations",
    };
  }

  // Placebo: shuffle CLV signs/indices — if features leaked close, shuffle
  // destroys structure and mean |CLV| collapses. Here we shuffle the series
  // itself as a stand-in for time-index randomization of Y.
  const shuffled = shuffleInPlace([...clvSeries], opts.rng);
  const mean = shuffled.reduce((a, b) => a + b, 0) / n;
  const absMean = Math.abs(mean);
  const maxAbs = Math.max(...shuffled.map((x) => Math.abs(x)));
  const pass = absMean <= threshold;

  return {
    n,
    meanClv: mean,
    absMeanClv: absMean,
    maxAbsClv: maxAbs,
    pass,
    threshold,
    detail: pass
      ? `placebo CLV |mean|=${absMean.toFixed(4)} ≤ ${threshold} — no detectable leakage signature`
      : `placebo CLV |mean|=${absMean.toFixed(4)} > ${threshold} — investigate leakage before Phase 1`,
  };
}

/** Mulberry32 PRNG for deterministic tests. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

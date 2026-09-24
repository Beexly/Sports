
export interface ConstrainedKellyOptions {
  /** Max weight per pick (paper: 0.25). */
  readonly maxW?: number;
  readonly iters?: number;
  readonly lr?: number;
}

/** Project onto the capped simplex {w >= 0, w_k <= maxW, sum w <= 1}. */
export function projectKellySimplex(w: readonly number[], maxW: number): number[] {
  const n = w.length;
  const clipped = w.map((v) => Math.min(maxW, Math.max(0, v)));
  const total = clipped.reduce((s, v) => s + v, 0);
  // No leverage: if the box-clipped weights already sum <= 1, the cash asset
  // (uninvested bankroll) absorbs the remainder and no further projection is needed.
  if (total <= 1) return clipped;
  // Otherwise project onto {0 <= x_k <= maxW, sum x = 1} by soft-thresholding.
  let low = -1e9;
  let high = 1e9;
  const clip = (t: number): number[] => clipped.map((v) => Math.min(maxW, Math.max(0, v - t)));
  for (let it = 0; it < 200; it++) {
    const mid = (low + high) / 2;
    if (clip(mid).reduce((s, v) => s + v, 0) > 1) low = mid;
    else high = mid;
  }
  return clip((low + high) / 2);
}

/** Log-growth objective under independence: sum_k p ln(1+b w) + (1-p) ln(1-w). */
export function kellyLogGrowth(p: readonly number[], b: readonly number[], w: readonly number[]): number {
  if (p.length !== b.length || p.length !== w.length) throw new Error("constrained-kelly: p/b/w must align");
  let g = 0;
  for (let k = 0; k < p.length; k++) {
    const pk = Math.min(Math.max(p[k] ?? 0, 1e-9), 1 - 1e-9);
    const bk = b[k] ?? 0;
    const wk = Math.min(Math.max(w[k] ?? 0, 0), 1 - 1e-9);
    g += pk * Math.log1p(bk * wk) + (1 - pk) * Math.log1p(-wk);
  }
  return g;
}

/** Constrained multivariate Kelly weights via projected gradient ascent. */
export function constrainedKellyWeights(
  p: readonly number[],
  b: readonly number[],
  opts: ConstrainedKellyOptions = {},
): number[] {
  if (p.length !== b.length || p.length === 0) throw new Error("constrained-kelly: aligned non-empty p/b required");
  const maxW = opts.maxW ?? 0.25;
  const iters = opts.iters ?? 2000;
  const lr = opts.lr ?? 0.1;
  let w = p.map(() => 0.01);
  for (let it = 0; it < iters; it++) {
    w = projectKellySimplex(
      w.map((wk, k) => {
        const pk = Math.min(Math.max(p[k] ?? 0, 1e-9), 1 - 1e-9);
        const bk = b[k] ?? 0;
        const grad = (pk * bk) / (1 + bk * wk) - (1 - pk) / Math.max(1 - wk, 1e-9);
        return wk + lr * grad;
      }),
      maxW,
    );
  }
  return w;
}

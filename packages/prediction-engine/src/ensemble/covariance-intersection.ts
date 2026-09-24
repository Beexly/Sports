/**
 * Covariance-intersection fusion of correlated signals (arXiv 2301.13594v1).
 *
 * GSE's pick-generating signals (engine model, market-implied/CLV,
 * analyst adjustments, LLM panels) share information, so naive
 * precision-weighting is overconfident — the paper's PW-underperformance
 * is direct evidence. Fuse with covariance intersection (CI) / inverse
 * covariance intersection (ICI) instead, track the epistemic/aleatoric
 * decomposition separately, and blend CI with adaptive fusion weights
 * (mAFTER-style) tracking which source is currently best.
 *
 * ACCEPTANCE GATE: ADOPT iff the CI/ICI/CU fusion beats
 * precision-weighting and simple averaging by >= 1% log-loss
 * improvement over the best single source (Diebold-Mariano test), with
 * consistency (fused variance not understated vs empirical).
 *
 * Research-only module. Not wired into any live fusion path.
 */

export interface Source {
  /** Source mean (e.g. win probability). */
  mean: number;
  /** Source variance (epistemic + aleatoric). */
  variance: number;
}

/** Naive precision-weighted fusion (the overconfident baseline). */
export function precisionWeighted(sources: readonly Source[]): Source {
  if (sources.length === 0) throw new Error("precisionWeighted: no sources");
  let wSum = 0;
  let mSum = 0;
  for (const s of sources) {
    if (s.variance <= 0) throw new Error("precisionWeighted: variance > 0");
    const w = 1 / s.variance;
    wSum += w;
    mSum += w * s.mean;
  }
  return { mean: mSum / wSum, variance: 1 / wSum };
}

/**
 * Covariance-intersection fusion: finds omega in [0,1] minimizing the
 * fused variance. For two sources the closed form is used; for n > 2
 * the sources are fused sequentially (order-independent enough for the
 * gate comparison).
 */
export function covarianceIntersection(sources: readonly Source[]): Source & { omega: number } {
  if (sources.length === 0) throw new Error("covarianceIntersection: no sources");
  if (sources.length === 1) return { ...(sources[0] as Source), omega: 1 };
  const [a, b] = [sources[0] as Source, sources[1] as Source];
  if (a.variance <= 0 || b.variance <= 0) throw new Error("covarianceIntersection: variance > 0");
  // Minimize fused variance over omega: grid search (closed form is
  // omega-insensitive when variances are equal; grid is robust).
  let best = { omega: 0.5, variance: Infinity };
  for (let k = 0; k <= 100; k++) {
    const omega = k / 100;
    const v = 1 / (omega / a.variance + (1 - omega) / b.variance);
    if (v < best.variance) best = { omega, variance: v };
  }
  const fused: Source = {
    mean:
      best.variance * (best.omega * a.mean / a.variance + ((1 - best.omega) * b.mean) / b.variance),
    variance: best.variance,
  };
  let acc: Source & { omega: number } = { ...fused, omega: best.omega };
  for (let i = 2; i < sources.length; i++) {
    const rest = covarianceIntersection([acc, sources[i] as Source]);
    acc = rest;
  }
  return acc;
}

/** Simple average fusion (the other baseline). */
export function simpleAverage(sources: readonly Source[]): Source {
  if (sources.length === 0) throw new Error("simpleAverage: no sources");
  const mean = sources.reduce((s, x) => s + x.mean, 0) / sources.length;
  // Variance of the average under unknown correlation: use the mean of
  // the source variances (conservative, CI-flavored).
  const variance = sources.reduce((s, x) => s + x.variance, 0) / sources.length;
  return { mean, variance };
}

export interface EpistemicSplit {
  epistemic: number;
  aleatoric: number;
}

/**
 * Epistemic/aleatoric decomposition (paper eq. 34, scalar form):
 * epistemic = spread across source means; aleatoric = mean of source
 * variances. Tracked separately rather than as one variance number.
 */
export function decomposeUncertainty(sources: readonly Source[]): EpistemicSplit {
  if (sources.length === 0) throw new Error("decomposeUncertainty: no sources");
  const mean = sources.reduce((s, x) => s + x.mean, 0) / sources.length;
  const epistemic = sources.reduce((s, x) => s + (x.mean - mean) ** 2, 0) / sources.length;
  const aleatoric = sources.reduce((s, x) => s + x.variance, 0) / sources.length;
  return { epistemic, aleatoric };
}

/**
 * Consistency check: the fused variance must not understate the
 * empirical squared error (NEES-style, scalar).
 */
export function consistencyCheck(fused: Source, truth: number): {
  squaredError: number;
  consistent: boolean;
} {
  const squaredError = (truth - fused.mean) ** 2;
  return { squaredError, consistent: squaredError <= fused.variance * 4 };
}

/**
 * Adaptive fusion weights (mAFTER-style): track per-source recent
 * log-loss and reweight the CI fusion inputs by softmax(-loss).
 */
export function adaptiveWeights(recentLogLoss: readonly number[]): number[] {
  if (recentLogLoss.length === 0) throw new Error("adaptiveWeights: no sources");
  const exps = recentLogLoss.map((l) => Math.exp(-l));
  const sum = exps.reduce((s, x) => s + x, 0);
  return exps.map((e) => e / sum);
}

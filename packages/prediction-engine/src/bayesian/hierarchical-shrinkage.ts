
export interface PooledEstimate {
  readonly posteriorMean: number;
  /** Shrinkage weight on the group mean in [0,1]; 1 = no pooling. */
  readonly shrinkage: number;
}

/**
 * Empirical-Bayes partial pooling of one group mean toward the prior mean.
 * shrinkage = n / (n + sigma2 / tau2); posterior = shrinkage*groupMean + (1-shrinkage)*priorMean.
 */
export function partialPool(
  groupMean: number,
  n: number,
  priorMean: number,
  tau2: number,
  sigma2: number,
): PooledEstimate {
  if (!(n > 0)) throw new Error("hierarchical-shrinkage: n must be positive");
  if (!(tau2 > 0 && sigma2 > 0)) throw new Error("hierarchical-shrinkage: variances must be positive");
  const shrinkage = n / (n + sigma2 / tau2);
  return {
    posteriorMean: shrinkage * groupMean + (1 - shrinkage) * priorMean,
    shrinkage,
  };
}

/** Method-of-moments estimate of the between-group variance tau^2. */
export function ebTau2(groupMeans: readonly number[], ns: readonly number[], sigma2: number): number {
  if (groupMeans.length !== ns.length || groupMeans.length === 0) {
    throw new Error("hierarchical-shrinkage: aligned non-empty inputs required");
  }
  const mean = groupMeans.reduce((s, v) => s + v, 0) / groupMeans.length;
  const varBetween = groupMeans.reduce((s, v) => s + (v - mean) ** 2, 0) / groupMeans.length;
  const meanInvN = ns.reduce((s, n) => s + 1 / Math.max(n, 1), 0) / ns.length;
  return Math.max(varBetween - sigma2 * meanInvN, 1e-9);
}

/** Pool a full set of group means toward the grand mean. */
export function poolAll(
  groupMeans: readonly number[],
  ns: readonly number[],
  sigma2: number,
): PooledEstimate[] {
  const grandMean = groupMeans.reduce((s, v, i) => s + v * (ns[i] ?? 0), 0) / Math.max(ns.reduce((s, n) => s + n, 0), 1);
  const tau2 = ebTau2(groupMeans, ns, sigma2);
  return groupMeans.map((g, i) => partialPool(g, ns[i] ?? 1, grandMean, tau2, sigma2));
}

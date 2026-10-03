
/** Likelihood-ratio weights from discriminator probabilities: w-hat = p/(1-p). */
export function oddsWeights(pCurrent: readonly number[]): number[] {
  return pCurrent.map((p) => {
    const pc = Math.min(Math.max(p, 1e-6), 1 - 1e-6);
    return pc / (1 - pc);
  });
}

/** Effective sample size diagnostic: (sum w)^2 / sum w^2. */
export function effectiveSampleSize(weights: readonly number[]): number {
  const sum = weights.reduce((s, w) => s + w, 0);
  const sumSq = weights.reduce((s, w) => s + w * w, 0);
  if (sumSq <= 0) return 0;
  return (sum * sum) / sumSq;
}

/** True when the weights have collapsed (ESS < 30% of nominal, per the gate). */
export function weightsCollapsed(weights: readonly number[], collapseFrac = 0.3): boolean {
  if (weights.length === 0) return true;
  return effectiveSampleSize(weights) < collapseFrac * weights.length;
}

/**
 * Weighted conformal quantile of nonconformity scores at level 1-alpha:
 * smallest q with sum_{scores_i <= q} w_i / sum w >= 1-alpha.
 */
export function weightedConformalQuantile(
  scores: readonly number[],
  weights: readonly number[],
  alpha: number,
): number {
  if (scores.length !== weights.length || scores.length === 0) {
    throw new Error("weighted-conformal-shift: aligned non-empty inputs required");
  }
  if (!(alpha > 0 && alpha < 1)) throw new Error("weighted-conformal-shift: alpha in (0,1) required");
  const order = scores.map((_, i) => i).sort((a, b) => (scores[a] ?? 0) - (scores[b] ?? 0));
  const total = weights.reduce((s, w) => s + Math.max(w, 0), 0);
  const level = (1 - alpha) * total;
  let acc = 0;
  for (const i of order) {
    acc += Math.max(weights[i] ?? 0, 0);
    if (acc >= level) return scores[i] ?? 0;
  }
  return scores[order[order.length - 1] ?? 0] ?? 0;
}

/** Weighted conformal interval for a point forecast. */
export function weightedConformalInterval(
  pointForecast: number,
  scores: readonly number[],
  weights: readonly number[],
  alpha: number,
): { lower: number; upper: number; quantile: number } {
  const q = weightedConformalQuantile(scores, weights, alpha);
  return { lower: pointForecast - q, upper: pointForecast + q, quantile: q };
}

/**
 * High-dimensional neighbor weights used before a t-SNE map.
 *
 * van der Maaten and Hinton, 2008. The conditional is a Gaussian over
 * distances, normalized. Perplexity is 2 to the entropy of that conditional.
 * The 2D embedding optimization is not here. NGS used the neighbor step to
 * flag mixed labels. The mismatch rate already does that flag.
 */

export function gaussianNeighborWeights(distances: readonly number[], sigma: number): number[] {
  if (distances.length === 0) throw new Error("at least one distance is required");
  if (!Number.isFinite(sigma) || sigma <= 0) throw new Error("sigma must be finite and positive");
  if (distances.some((d) => !Number.isFinite(d) || d < 0)) throw new Error("distances must be finite and non-negative");
  const weights = distances.map((d) => Math.exp(-(d * d) / (2 * sigma * sigma)));
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum === 0) throw new Error("neighbor weights collapsed to zero");
  return weights.map((w) => w / sum);
}

export function perplexity(weights: readonly number[]): number {
  if (weights.length === 0) throw new Error("at least one weight is required");
  const entropy = weights.reduce((sum, p) => (p > 0 ? sum - p * Math.log2(p) : sum), 0);
  return 2 ** entropy;
}

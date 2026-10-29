/**
 * Stream 8: Spectral Costs of Multinomial and Residual Resampling in High-Dimensional
 * Particle Ensembles: A Free-Probability Analysis (arXiv:2610.16680).
 */

export interface ResidualResamplingResult {
  readonly deterministicCopies: readonly number[];
  readonly residualWeights: readonly number[];
  readonly deterministicAllocated: number;
  readonly remainderCountR: number;
  readonly expectedSpectralRankRetention: number;
}

/**
 * One-parameter floor-fraction family N_j = floor(alpha * N * w_j) + Multinomial(R, r).
 * Residual resampling (alpha = 1) strictly dominates multinomial resampling (alpha = 0)
 * in covariance operator norm and effective rank across all aspect ratios gamma = d / N.
 */
export function resampleFloorFractionResidual(
  weights: readonly number[],
  ensembleSizeN: number,
  floorFractionAlpha = 1.0,
): ResidualResamplingResult {
  if (weights.length === 0 || ensembleSizeN <= 0) {
    return {
      deterministicCopies: [],
      residualWeights: [],
      deterministicAllocated: 0,
      remainderCountR: 0,
      expectedSpectralRankRetention: 0,
    };
  }
  const alpha = Math.min(1, Math.max(0, floorFractionAlpha));
  const wSum = weights.reduce((a, b) => a + Math.max(0, b), 0) || 1;
  const normW = weights.map((w) => Math.max(0, w) / wSum);
  const detCopies = normW.map((w) => Math.floor(alpha * ensembleSizeN * w));
  const allocated = detCopies.reduce((a, b) => a + b, 0);
  const remainderR = Math.max(0, ensembleSizeN - allocated);

  const rawRem = normW.map((w, i) => Math.max(0, ensembleSizeN * w - (detCopies[i] ?? 0)));
  const remSum = rawRem.reduce((a, b) => a + b, 0) || 1;
  const residualWeights = rawRem.map((r) => Number((r / remSum).toFixed(6)));

  // Free-probability rank retention proxy: deterministic mass preserves full support
  const detShare = allocated / ensembleSizeN;
  const multinomialSupportRetention = 1 - Math.exp(-1);
  const expectedSpectralRankRetention = Number(
    (detShare + (1 - detShare) * multinomialSupportRetention).toFixed(4),
  );

  return {
    deterministicCopies: detCopies,
    residualWeights,
    deterministicAllocated: allocated,
    remainderCountR: remainderR,
    expectedSpectralRankRetention,
  };
}

export function computeMarchenkoPasturSpectralHealth(
  eigenvalues: readonly number[],
  aspectRatioGamma: number,
): {
  readonly effectiveRank: number;
  readonly zeroModeMassAtom: number;
  readonly mpUpperEdgeLambdaPlus: number;
} {
  const pos = eigenvalues.filter((e) => Number.isFinite(e) && e > 1e-12);
  if (pos.length === 0) {
    return { effectiveRank: 0, zeroModeMassAtom: 1, mpUpperEdgeLambdaPlus: 0 };
  }
  const sum1 = pos.reduce((a, b) => a + b, 0);
  const sum2 = pos.reduce((a, b) => a + b * b, 0);
  const effectiveRank = Number(((sum1 * sum1) / Math.max(sum2, 1e-18)).toFixed(4));
  const zeroCount = eigenvalues.length - pos.length;
  const zeroModeMassAtom = Number((zeroCount / eigenvalues.length).toFixed(4));
  const g = Math.max(0, aspectRatioGamma);
  const mpUpperEdgeLambdaPlus = Number(Math.pow(1 + Math.sqrt(g), 2).toFixed(4));
  return {
    effectiveRank,
    zeroModeMassAtom,
    mpUpperEdgeLambdaPlus,
  };
}

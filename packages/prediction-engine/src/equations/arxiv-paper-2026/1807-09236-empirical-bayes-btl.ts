/**
 * arXiv:1807.09236 — Empirical Bayes shrinkage of Bradley-Terry-Luce MLEs.
 *
 * gamma_SHR = (I - R) gamma_MLE + R u
 * R = (I + A S)^{-1}
 *
 * ENABLED = false until wired into the ratings layer.
 */
export const ENABLED = false;

export const ACCEPTANCE_GATE = {
  status: "UNEVALUATED_BAYESIAN_SHRINKAGE_GATE",
  paperId: "arXiv:1807.09236",
  title: "Empirical Bayes shrinkage of Bradley-Terry-Luce MLEs",
  requiresLowNLogLossAdvantage: true,
  sealBoundary: "PRE_SEAL_TUESDAY_0400_CT_ONLY",
} as const;

function identity(n: number): number[][] {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );
}

function matVec(A: number[][], x: number[]): number[] {
  return A.map((row) => row.reduce((s, a, j) => s + a * (x[j] ?? 0), 0));
}

/**
 * Shrink BTL maximum-likelihood estimates.
 * Currently returns a simple shrinkage toward the prior mean when ENABLED = false.
 */
export function shrinkBtl(
  gammaMle: number[],
  A: number[][],
  S: number[][] | number,
  u: number[]
): number[] {
  const n = gammaMle.length;
  if (!ENABLED) {
    // Fallback: 0.8 MLE + 0.2 prior mean
    return gammaMle.map((g, i) => 0.8 * g + 0.2 * (u[i] ?? 0));
  }
  // Full matrix form would invert (I + A S) here
  const I = identity(n);
  // Placeholder: return MLE until the inversion is implemented
  return gammaMle;
}

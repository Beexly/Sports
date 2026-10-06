/**
 * arXiv:2512.15269v1 — Model inference for ranking from pairwise comparisons
 *
 * Chebyshev-polynomial kernel for pairwise comparisons: the logistic win-probability kernel is replaced by
 * a jointly learned Chebyshev expansion (EM + belief propagation), learning sport-specific shapes and
 * detecting favorite-longshot bias as a calibration correction.
 *
 * Improvement: GSE replaces the fixed logistic win-probability kernel in its rating layer with a jointly learned Chebyshev-polynomial kernel (EM + belief propagation), learning sport-specific probability shapes and detecting favorite-longshot bias as a calibration correction.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADAPT iff the learned kernel beats the fixed logistic on GSE's own backtest: log-loss of kernel-learned win probabilities must be lower than logistic-baseline Bradley-Terry on at least two held-out NFL seasons.
 */

/** Chebyshev expansion kernel: P(win) = logistic(sum c_k T_k(x)). */
export interface ChebKernel {
  /** Coefficients c_0..c_{K-1}. */
  coeffs: number[];
}

/** Chebyshev polynomials T_0..T_{K-1} at x in [-1, 1]. */
export function chebyshevBasis(x: number, K: number): number[] {
  if (K < 1) throw new Error("chebyshevBasis: K >= 1");
  const xc = Math.max(-1, Math.min(1, x));
  const T = new Array<number>(K);
  T[0] = 1;
  if (K > 1) T[1] = xc;
  for (let k = 2; k < K; k++) T[k] = 2 * xc * (T[k - 1] ?? 0) - (T[k - 2] ?? 0);
  return T;
}

/** Win probability under the learned Chebyshev kernel. */
export function chebWinProb(kernel: ChebKernel, strengthDiff: number, scale: number): number {
  if (scale <= 0) throw new Error("chebWinProb: scale > 0");
  const T = chebyshevBasis(strengthDiff / scale, kernel.coeffs.length);
  const eta = T.reduce((s, t, k) => s + t * (kernel.coeffs[k] ?? 0), 0);
  return 1 / (1 + Math.exp(-eta));
}

/**
 * One EM-style gradient step on the Chebyshev coefficients (the M-step core):
 * gradient ascent on Bernoulli log-likelihood with L2 shrinkage.
 */
export function chebEmStep(
  kernel: ChebKernel,
  diffs: readonly number[],
  outcomes: readonly (0 | 1)[],
  scale: number,
  lr: number,
  l2: number,
): ChebKernel {
  if (diffs.length !== outcomes.length) throw new Error("chebEmStep: length mismatch");
  const K = kernel.coeffs.length;
  const grad = new Array<number>(K).fill(0);
  for (let i = 0; i < diffs.length; i++) {
    const T = chebyshevBasis((diffs[i] ?? 0) / scale, K);
    const eta = T.reduce((s, t, k) => s + t * (kernel.coeffs[k] ?? 0), 0);
    const p = 1 / (1 + Math.exp(-eta));
    const r = (outcomes[i] ?? 0) - p;
    for (let k = 0; k < K; k++) grad[k] = (grad[k] ?? 0) + r * (T[k] ?? 0);
  }
  const coeffs = kernel.coeffs.map((c, k) => c + lr * ((grad[k] ?? 0) / diffs.length - l2 * c));
  return { coeffs };
}

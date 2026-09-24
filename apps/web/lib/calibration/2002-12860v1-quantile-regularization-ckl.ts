// @ts-nocheck
/**
 * arXiv 2002.12860v1: Quantile Regularization: Towards Implicit Calibration of Regression Models.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Quantile regularization for implicit calibration: CKL-bar(s) regularizer over the differentiable sort of per-batch PIT values, L = NLL + lambda*CKL-bar(s) (lambda start 20), replacing the isotonic-post-hoc baseline on backtest slices with n < 1,000.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Add the CKL quantile regularizer (L = NLL + lambda*CKL-bar(s), lambda start 20, differentiable sort of per-batch PIT values) to each GSE probabilistic regression head producing (mu, sigma), and let it replace the isotonic-post-hoc baseline on backtest slices with n < 1,000 where the baseline degrades calibration.
 *
 * ACCEPTANCE GATE:
 * Adapt only if, on a held-out NFL season, adding the CKL regularizer to one GSE regression head reduces the L2 quantile calibration error by >= 15% relative (e.g. 0.20 -> 0.17 or better) with held-out NLL not materially worse.
 *
 * ENABLED=false: training-time regularizer for GSE regression heads; needs a human call.
 */


export const ENABLED = false;

function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t -
      0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return x >= 0 ? y : -y;
}

function phiStd(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

/** PIT values of observations under Gaussian (mu, sigma) heads. */
export function gaussianPIT(
  ys: readonly number[],
  mus: readonly number[],
  sigmas: readonly number[],
): number[] {
  return ys.map((y, i) => {
    const p = phiStd((y - mus[i]) / Math.max(sigmas[i], 1e-9));
    return Math.min(Math.max(p, 1e-9), 1 - 1e-9);
  });
}

/**
 * CKL-bar(s): histogram KL divergence between the empirical PIT distribution
 * and Uniform(0,1). Calibrated heads have CKL-bar near 0. (The differentiable-sort
 * variant is training-time; this is the evaluation-time equivalent.)
 */
export function cklBar(pits: readonly number[], nBins = 20): number {
  const counts = new Array(nBins).fill(0);
  for (const p of pits) {
    const b = Math.min(nBins - 1, Math.floor(p * nBins));
    counts[b]++;
  }
  const n = pits.length;
  let kl = 0;
  for (let b = 0; b < nBins; b++) {
    const q = counts[b] / n;
    if (q > 0) kl += q * Math.log(q / (1 / nBins));
  }
  return kl;
}

/** Regularized training loss L = NLL + lambda * CKL-bar. */
export function regularizedLoss(
  nll: number,
  pits: readonly number[],
  lambda: number,
  nBins = 20,
): number {
  return nll + lambda * cklBar(pits, nBins);
}

/**
 * L2 quantile calibration error: mean squared deviation of empirical PIT
 * quantiles from nominal over a uniform grid. Gate: >= 15% relative reduction.
 */
export function l2QuantileCalibrationError(
  pits: readonly number[],
  nGrid = 20,
): number {
  const sorted = [...pits].sort((a, b) => a - b);
  const n = sorted.length;
  let s = 0;
  for (let g = 1; g <= nGrid; g++) {
    const nominal = g / nGrid;
    const k = Math.min(n - 1, Math.floor(nominal * n));
    const empirical = sorted[k];
    s += (empirical - nominal) * (empirical - nominal);
  }
  return s / nGrid;
}

/** Relative reduction of L2 quantile calibration error (gate >= 0.15). */
export function relativeQceReduction(before: number, after: number): number {
  return before > 0 ? (before - after) / before : 0;
}

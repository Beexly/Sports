/**
 * arXiv 2202.11834: Comparison of Combination Methods to Create Calibrated Ensemble Forecasts for Seasonal Influenza in the U.S.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Add a Beta Linear Pool (BLP) post-processing layer on the engine's linear-pool consensus: per-market (spread/total/moneyline) estimate (alpha, beta) by MLE on log score over past seasons, publish B_{alpha,beta}(F_LP(y)) as the calibrated forecast -- with shrinkage-regularized estimation (penalized MLE toward identity, lambda by leave-one-season-out CV) and separate (alpha,beta) for high-vs-low total regimes, attacking the paper's under-prediction pathology.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Add a Beta Linear Pool (BLP) post-processing layer on the engine's linear-pool consensus: per-market (spread/total/moneyline) estimate (alpha, beta) by MLE on log score over past seasons, publish B_{alpha,beta}(F_LP(y)) as the calibrated forecast — with shrinkage-regularized estimation (penalized MLE toward identity, lambda by leave-one-season-out CV) and separate (alpha,beta) for high-vs-low total regimes, attacking the paper's under-prediction pathology.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT iff on the 2025 holdout it improves mean log score over the weight-optimized LP by >=0.02 AND its PIT Cramer distance is <= LP's (no calibration regression), with no systematic under-prediction (PIT CDF within +-0.05 of diagonal at all deciles).
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Mimo | bucket: MODEL | lane: ensembles | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Regularized incomplete beta I_x(a,b) via Simpson integration. */
export function regIncBeta(x: number, a: number, b: number, steps = 400): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const logB = logGammaLocal(a) + logGammaLocal(b) - logGammaLocal(a + b);
  const f = (t: number): number => {
    if (t <= 0 || t >= 1) return 0;
    return Math.exp((a - 1) * Math.log(t) + (b - 1) * Math.log(1 - t) - logB);
  };
  const h = x / steps;
  let s = f(0) + f(x);
  for (let i = 1; i < steps; i++) s += (i % 2 === 0 ? 2 : 4) * f(i * h);
  return (s * h) / 3;
}

function logGammaLocal(z: number): number {
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGammaLocal(1 - z);
  z -= 1;
  let x = c[0]!;
  for (let i = 1; i < 9; i++) x += c[i]! / (z + i);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/** Apply the Beta Linear Pool recalibration B_{alpha,beta}(p). */
export function blpApply(p: number, alpha: number, beta: number): number {
  return regIncBeta(Math.min(1 - 1e-9, Math.max(1e-9, p)), alpha, beta);
}

/** Grid-fit (alpha, beta) by mean log score on a validation set. */
export function blpFit(
  ps: number[],
  ys: number[],
  grid: number[],
): { alpha: number; beta: number; score: number } {
  let best = { alpha: 1, beta: 1, score: -Infinity };
  for (const a of grid)
    for (const b of grid) {
      let s = 0;
      for (let i = 0; i < ps.length; i++) {
        const p = blpApply(ps[i]!, a, b);
        s += ys[i]! === 1 ? Math.log(p) : Math.log(1 - p);
      }
      s /= ps.length;
      if (s > best.score) best = { alpha: a, beta: b, score: s };
    }
  return best;
}

/** PIT values for calibration diagnostics. */
export function pitValues(ps: number[], ys: number[]): number[] {
  return ps.map((p, i) => (ys[i] === 1 ? p : 1 - p));
}

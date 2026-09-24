/**
 * Localized Conformal Prediction — arXiv 2106.08460
 * ("Localized Conformal Prediction").
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published
 * intervals and is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: sample-splitting localized conformal for margins/totals.
 * Localizer = product kernel on (total bucket, spread bucket, weather
 * bucket, rest differential), or k-NN weights in the engine's feature space.
 * Uses the paper's ADJUSTED quantile level (the test point's own kernel
 * weight sits as point mass at +infinity, the finite-sample correction),
 * not the naive weighted quantile. Reports effective sample size per game
 * ((sum w)^2 / sum w^2) and flags starved games.
 *
 * ACCEPTANCE GATE (improvement-ledger): ADAPT if worst-stratum coverage gap
 * shrinks >=30% vs marginal CQR at <=105% mean width. REJECT full LCP for
 * Mondrian stratification if kernel effective sample sizes collapse
 * (median (sum w)^2 / sum w^2 < 50).
 */

export type FeatureVector = readonly number[];

/** Gaussian product kernel weight between test and calibration features. */
export function productKernelWeight(
  xTest: FeatureVector,
  xCal: FeatureVector,
  bandwidths: readonly number[],
): number {
  if (xTest.length !== xCal.length || xTest.length !== bandwidths.length) {
    return 0;
  }
  let logW = 0;
  for (let d = 0; d < xTest.length; d++) {
    const h = bandwidths[d]!;
    if (!(h > 0)) return 0;
    const z = (xTest[d]! - xCal[d]!) / h;
    logW += -0.5 * z * z;
  }
  return Math.exp(logW);
}

/** k-NN weights: 1/k for the k nearest calibration points, 0 otherwise. */
export function knnWeights(
  xTest: FeatureVector,
  xCal: ReadonlyArray<FeatureVector>,
  k: number,
): number[] {
  const n = xCal.length;
  if (n === 0 || k <= 0) return [];
  const dists = xCal.map((x, i) => {
    let d = 0;
    for (let dim = 0; dim < Math.min(x.length, xTest.length); dim++) {
      const z = x[dim]! - xTest[dim]!;
      d += z * z;
    }
    return { i, d };
  });
  dists.sort((a, b) => a.d - b.d);
  const kk = Math.min(k, n);
  const w = new Array<number>(n).fill(0);
  for (let r = 0; r < kk; r++) w[dists[r]!.i] = 1 / kk;
  return w;
}

/** Effective sample size: (sum w)^2 / sum w^2. */
export function effectiveSampleSize(weights: readonly number[]): number {
  let s1 = 0;
  let s2 = 0;
  for (const w of weights) {
    s1 += w;
    s2 += w * w;
  }
  if (s2 === 0) return 0;
  return (s1 * s1) / s2;
}

/**
 * Paper-exact ADJUSTED weighted quantile: normalize the calibration
 * weights, give the test point its own normalized kernel weight as point
 * mass at +infinity, then take the (1-alpha) quantile of that distribution.
 * This is the finite-sample correction the naive weighted quantile omits.
 */
export function adjustedWeightedQuantile(
  scores: readonly number[],
  calWeights: readonly number[],
  testWeight: number,
  alpha: number,
): number {
  const n = scores.length;
  if (n === 0) return Number.POSITIVE_INFINITY;
  const total = calWeights.reduce((a, b) => a + b, 0) + testWeight;
  if (!(total > 0)) return Number.POSITIVE_INFINITY;
  const order = scores.map((_, i) => i).sort((a, b) => scores[a]! - scores[b]!);
  let cum = 0;
  for (const i of order) {
    cum += calWeights[i]! / total;
    if (cum >= 1 - alpha) return scores[i]!;
  }
  return Number.POSITIVE_INFINITY; // mass at +infinity absorbs the tail
}

/**
 * Localized conformal interval for a point forecast: weights from the
 * localizer, adjusted quantile of absolute residuals.
 */
export function localizedConformalInterval(
  pointForecast: number,
  xTest: FeatureVector,
  xCal: ReadonlyArray<FeatureVector>,
  absResiduals: readonly number[],
  alpha: number,
  bandwidths: readonly number[],
): { readonly lo: number; readonly hi: number; readonly nEff: number } {
  const weights = xCal.map((x) => productKernelWeight(xTest, x, bandwidths));
  const nEff = effectiveSampleSize(weights);
  const testWeight = 1; // kernel of the test point with itself
  const q = adjustedWeightedQuantile(absResiduals, weights, testWeight, alpha);
  if (!Number.isFinite(q)) {
    return { lo: Number.NEGATIVE_INFINITY, hi: Number.POSITIVE_INFINITY, nEff };
  }
  return { lo: pointForecast - q, hi: pointForecast + q, nEff };
}

/** Starved-game flag: effective sample size below the collapse threshold. */
export function isStarved(nEff: number, threshold = 50): boolean {
  return nEff < threshold;
}

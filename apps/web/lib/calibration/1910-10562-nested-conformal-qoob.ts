// @ts-nocheck
/**
 * arXiv 1910.10562: Nested Conformal Prediction and Quantile Out-of-Bag Ensemble Methods (QOOB).
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Nested conformal prediction: sets F_t(x) = {y: score(x,y) <= t} with the paper's efficient cross-conformal aggregation; QOOB (quantile forest + out-of-bag calibration + cross-conformal) as the weeks-1-to-6 small-n interval method, handing off to split-CQR once n_cal >= 200.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Refactor the conformal core around F_t(x) nested sets with the paper's efficient cross-conformal algorithm, and deploy QOOB (QRF + OOB calibration + cross-conformal aggregation) as the weeks-1-to-6 small-n interval method, handing off to split-CQR once n_cal >= 200.
 *
 * ACCEPTANCE GATE:
 * ADAPT if: at k <= 6 weeks, QOOB coverage within +/-2pp of nominal AND mean width <= 90% of split-CQR (replicating the paper's small-n win). REJECT the full QOOB machinery if the efficient cross-conformal port proves too slow for the weekly batch -- keep just the nested-set refactor.
 *
 * ENABLED=false: small-n interval method for the weekly batch; publish-path use needs a human call.
 */


export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const ENABLED = false;

/** Finite-sample conformal quantile: ceil((1-alpha)(n+1))-th order statistic. */
export function conformalQuantile(scores: readonly number[], alpha: number): number {
  const n = scores.length;
  if (n === 0) return Number.POSITIVE_INFINITY;
  const sorted = [...scores].sort((a, b) => a - b);
  const k = Math.min(n, Math.ceil((1 - alpha) * (n + 1)));
  return sorted[k - 1];
}

/**
 * Nested-set interval: F_t(x) = [f(x) - t, f(x) + t] where t is the conformal
 * quantile of the nested nonconformity scores score(x, y) = |y - f(x)|.
 */
export function nestedSetInterval(
  pointForecast: number,
  calibScores: readonly number[],
  alpha: number,
): { lo: number; hi: number; t: number } {
  const t = conformalQuantile(calibScores, alpha);
  return { lo: pointForecast - t, hi: pointForecast + t, t };
}

export interface FoldModel {
  /** Point forecast from the model trained without fold k. */
  readonly predict: (x: number) => number;
  /** Indices held out of this fold's training set. */
  readonly heldOut: readonly number[];
}

/**
 * Efficient cross-conformal aggregation: pool out-of-fold residuals across K
 * folds into one calibration set, then build the nested-set interval around the
 * full-data point forecast. O(K) fits, one pooled quantile.
 */
export function crossConformalInterval(
  xs: readonly number[],
  ys: readonly number[],
  foldModels: readonly FoldModel[],
  fullPredict: (x: number) => number,
  xNew: number,
  alpha: number,
): { lo: number; hi: number; nCal: number } {
  const scores: number[] = [];
  for (const fm of foldModels) {
    for (const i of fm.heldOut) {
      scores.push(Math.abs(ys[i] - fm.predict(xs[i])));
    }
  }
  const { lo, hi } = nestedSetInterval(fullPredict(xNew), scores, alpha);
  return { lo, hi, nCal: scores.length };
}

/**
 * QOOB-lite for weeks 1-6 small-n: out-of-bag quantile intervals.
 * Given OOB lower/upper quantile forecasts per calibration point, calibrate the
 * expansion factor c so the expanded bands hit nominal coverage, then apply.
 * (Full QRF port deferred; this is the OOB-calibration + cross-conformal core.)
 */
export function qoobCalibrate(
  oobLo: readonly number[],
  oobHi: readonly number[],
  ys: readonly number[],
  alpha: number,
): { expansion: number; coverage: number } {
  const n = ys.length;
  // conformity: how far outside the band each point falls, normalized by width
  const scores = ys.map((y, i) => {
    const w = Math.max(oobHi[i] - oobLo[i], 1e-9);
    if (y < oobLo[i]) return (oobLo[i] - y) / w;
    if (y > oobHi[i]) return (y - oobHi[i]) / w;
    return 0;
  });
  const expansion = conformalQuantile(scores, alpha);
  const covered = ys.filter((y, i) => {
    const w = Math.max(oobHi[i] - oobLo[i], 1e-9);
    return y >= oobLo[i] - expansion * w && y <= oobHi[i] + expansion * w;
  }).length;
  return { expansion, coverage: n > 0 ? covered / n : 0 };
}

/** Apply the calibrated QOOB expansion to a new band. */
export function qoobInterval(
  lo: number,
  hi: number,
  expansion: number,
): { lo: number; hi: number } {
  const w = Math.max(hi - lo, 1e-9);
  return { lo: lo - expansion * w, hi: hi + expansion * w };
}

/**
 * Handoff rule: use QOOB while n_cal < 200, split-CQR once n_cal >= 200.
 */
export function intervalMethodForN(nCal: number): "qoob" | "split-cqr" {
  return nCal >= 200 ? "split-cqr" : "qoob";
}

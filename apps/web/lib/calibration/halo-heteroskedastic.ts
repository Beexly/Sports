/**
 * Halo: heteroscedastic dual-head estimation — arXiv 2609.10589
 * ("Halo: Improving Forecast Accuracy through Heteroscedastic Estimation").
 *
 * ADDITIVE utility. Training stays offline; this module is the serving-time
 * loss math plus the monotone-coverage diagnostic. Not wired into any model
 * or publish path (wiring changes model behavior and is a NEEDS HUMAN CALL
 * — see tracking report).
 *
 * Paper mechanism: give each deep component emitting point predictions
 * (spread, total) a dual head — mean mu and scale sigma via softplus —
 * trained under beta-NLL so uncertainty intervals are learned from the
 * data rather than bolted on afterwards. Serving-time: beta-NLL evaluation
 * for model selection, the scale head's interval, and the monotone-coverage
 * diagnostic (wider scale <-> higher |error| rank correlation > 0.3).
 *
 * ACCEPTANCE GATE (improvement-ledger): ADOPT dual-head Halo on any engine
 * component where beta-NLL training cuts held-out MSE by >=2% across >=3
 * seeds AND the scale head's intervals show monotone coverage behavior
 * (wider scale <-> higher |error| rank correlation > 0.3); reject the
 * component wiring if no gain survives multi-seed testing.
 */

/** Softplus: smooth positive scale head. */
export function softplus(x: number): number {
  if (x > 20) return x;
  return Math.log1p(Math.exp(x));
}

/**
 * Beta-NLL loss (Seitzer et al. 2022): the Gaussian NLL reweighted by
 * sigma^{2*beta} (stop-gradient in training; closed form here), which
 * interpolates between NLL (beta=0) and MSE-like behavior (beta=1).
 */
export function betaNllLoss(
  y: number,
  mu: number,
  sigma: number,
  beta: number,
): number {
  const s = Math.max(sigma, 1e-9);
  const nll = 0.5 * Math.log(s * s) + ((y - mu) * (y - mu)) / (2 * s * s);
  return Math.pow(s, 2 * beta) * nll;
}

/** Gaussian central interval from the dual head at miscoverage alpha. */
export function haloInterval(
  mu: number,
  rawScale: number,
  alpha: number,
): { readonly lo: number; readonly hi: number; readonly sigma: number } {
  const sigma = softplus(rawScale);
  const z = 1.959963984540054; // default 95%; refined below
  const zz = alpha === 0.1 ? 1.6448536269514722 : z;
  return { lo: mu - zz * sigma, hi: mu + zz * sigma, sigma };
}

/** Ranks with average-tie handling. */
function ranks(xs: readonly number[]): number[] {
  const order = xs.map((x, i) => ({ x, i })).sort((a, b) => a.x - b.x);
  const r = new Array<number>(xs.length);
  let i = 0;
  while (i < order.length) {
    let j = i;
    while (j + 1 < order.length && order[j + 1]!.x === order[i]!.x) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[order[k]!.i] = avg;
    i = j + 1;
  }
  return r;
}

/** Pearson correlation. */
function pearson(a: readonly number[], b: readonly number[]): number {
  const n = a.length;
  if (n < 2) return Number.NaN;
  const ma = a.reduce((x, y) => x + y, 0) / n;
  const mb = b.reduce((x, y) => x + y, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (a[i]! - ma) * (b[i]! - mb);
    sxx += (a[i]! - ma) * (a[i]! - ma);
    syy += (b[i]! - mb) * (b[i]! - mb);
  }
  if (sxx === 0 || syy === 0) return 0;
  return sxy / Math.sqrt(sxx * syy);
}

/**
 * Monotone-coverage diagnostic: Spearman rank correlation between
 * |error| and the predicted scale. The gate requires > 0.3 (wider scale
 * <-> larger errors).
 */
export function scaleErrorRankCorrelation(
  errors: readonly number[],
  scales: readonly number[],
): number {
  if (errors.length !== scales.length || errors.length < 2) return Number.NaN;
  return pearson(
    ranks(errors.map((e) => Math.abs(e))),
    ranks([...scales]),
  );
}

/** Gate check: does the scale head show monotone coverage behavior? */
export function passesMonotoneCoverageGate(
  errors: readonly number[],
  scales: readonly number[],
  threshold = 0.3,
): boolean {
  const rho = scaleErrorRankCorrelation(errors, scales);
  return Number.isFinite(rho) && rho > threshold;
}

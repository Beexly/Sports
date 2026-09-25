// @ts-nocheck
/**
 * arXiv 1909.03725v3: Isotonic Distributional Regression.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Isotonic Distributional Regression (IDR): conditional outcome distributions via per-threshold isotonic regression of 1{y <= t} on the engine's implied quantity, giving calibrated non-crossing quantile functions for Kelly sizing and prop pricing.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Adopt IDR (idrbag) as GSE's benchmark engine-output postprocessor: covariate = engine's implied quantity (spread/total forecast, or sorted sub-model ensemble under stochastic order), response = realized outcome, producing calibrated conditional outcome distributions with non-crossing quantiles for Kelly and prop pricing.
 *
 * ACCEPTANCE GATE:
 * 5% -- adopt IDR (idrbag) as GSE's benchmark engine-output postprocessor if it achieves >= 5% relative mean-CRPS improvement over the raw engine on held-out 2025 games and beats the incumbent GSE recalibration method on the same split.
 *
 * ENABLED=false: benchmark postprocessor over engine outputs; shipping it as the default needs a human call.
 */


export const ENABLED = false;

/** Pool-Adjacent-Violators Algorithm: nondecreasing isotonic regression fit. */
export function pava(y: readonly number[]): number[] {
  const n = y.length;
  const fitted = [...y];
  const blockStart: number[] = [];
  const blockSum: number[] = [];
  const blockCount: number[] = [];
  for (let i = 0; i < n; i++) {
    blockStart.push(i);
    blockSum.push(y[i]!);
    blockCount.push(1);
    while (
      blockSum.length >= 2 &&
      blockSum[blockSum.length - 2]! / blockCount[blockCount.length - 2]! >
        blockSum[blockSum.length - 1]! / blockCount[blockCount.length - 1]!
    ) {
      const s = blockStart.pop()!;
      const sum = blockSum.pop()! + blockSum[blockSum.length - 1]!;
      const cnt = blockCount.pop()! + blockCount[blockCount.length - 1]!;
      blockSum[blockSum.length - 1] = sum;
      blockCount[blockCount.length - 1] = cnt;
      void s;
    }
  }
  let b = 0;
  for (let i = 0; i < blockStart.length; i++) {
    const start = blockStart[i]!;
    const end = i + 1 < blockStart.length ? blockStart[i + 1]! : n;
    const mean = blockSum[b]! / blockCount[b]!;
    for (let j = start; j < end; j++) fitted[j] = mean;
    b++;
  }
  return fitted;
}

export interface IdrFit {
  readonly xsSorted: number[];
  /** cdfFits[k] = isotonic fit of 1{y <= gridT[k]} over xsSorted order. */
  readonly cdfFits: number[][];
  readonly gridT: number[];
}

/**
 * Fit IDR: sort by covariate x (engine implied quantity); for each threshold t
 * in gridT, isotonic-regress the indicators 1{y_i <= t} on the x-ordering.
 *
 * Under stochastic order, F(t|x) = P(y<=t|x) is nonincreasing in x, so we fit
 * PAVA (nondecreasing) to the survival indicators 1{y_i > t} and subtract
 * from 1.
 */
export function idrFit(
  xs: readonly number[],
  ys: readonly number[],
  gridT: readonly number[],
): IdrFit {
  const order = xs.map((_, i) => i).sort((a, b) => xs[a]! - xs[b]!);
  const xsSorted = order.map((i) => xs[i]!);
  const ysSorted = order.map((i) => ys[i]!);
  const cdfFits = gridT.map((t) =>
    pava(ysSorted.map((y) => (y > t ? 1 : 0))).map((f) => 1 - f),
  );
  return { xsSorted, cdfFits, gridT: [...gridT] };
}

function interp1(x: number, xs: readonly number[], fs: readonly number[]): number {
  if (x <= xs[0]!) return fs[0]!;
  const n = xs.length;
  if (x >= xs[n - 1]!) return fs[n - 1]!;
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid]! <= x) lo = mid;
    else hi = mid;
  }
  const t = (x - xs[lo]!) / (xs[hi]! - xs[lo]! || 1);
  return fs[lo]! + t * (fs[hi]! - fs[lo]!);
}

/** Calibrated conditional CDF F(t | x) via interpolation of the IDR fit. */
export function idrCdf(fit: IdrFit, x: number, t: number): number {
  const { xsSorted, cdfFits, gridT } = fit;
  const atGrid = cdfFits.map((f) => interp1(x, xsSorted, f));
  return interp1(t, gridT, atGrid);
}

/** alpha-quantile of the IDR conditional distribution at x. */
export function idrQuantile(fit: IdrFit, x: number, alpha: number): number {
  const { gridT } = fit;
  let lo = gridT[0]!;
  let hi = gridT[gridT.length - 1]!;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (idrCdf(fit, x, mid) < alpha) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * CRPS from the CDF grid: integral of (F(t) - 1{y <= t})^2 dt, with exact
 * integration over each cell for the piecewise-linear F and the step
 * indicator (the step falls at y inside at most one cell).
 */
export function crpsFromCdfGrid(
  gridT: readonly number[],
  cdfVals: readonly number[],
  y: number,
): number {
  let s = 0;
  for (let i = 1; i < gridT.length; i++) {
    const a = gridT[i - 1]!;
    const b = gridT[i]!;
    const dt = b - a;
    if (dt <= 0) continue;
    const fa = cdfVals[i - 1]!;
    const fb = cdfVals[i]!;
    // ∫ F^2 over the cell (F linear).
    const intF2 = (dt * (fa * fa + fa * fb + fb * fb)) / 3;
    // ∫ 1{y<=t} over the cell.
    const intInd = y < a ? dt : y >= b ? 0 : b - y;
    // ∫ F*1{y<=t} over the cell: F linear, indicator steps at y.
    let intFInd = 0;
    if (y < a) {
      intFInd = (dt * (fa + fb)) / 2;
    } else if (y < b) {
      const u = (y - a) / dt;
      const fy = fa + u * (fb - fa);
      intFInd = ((b - y) * (fy + fb)) / 2;
    }
    s += intF2 - 2 * intFInd + intInd;
  }
  return s;
}


/** Pool-adjacent-violators: nondecreasing isotonic regression. */
export function pava(y: readonly number[]): number[] {
  const n = y.length;
  const sol = y.map((v) => ({ sum: v, count: 1 }));
  const out: { sum: number; count: number }[] = [];
  for (const block of sol) {
    out.push(block);
    while (out.length >= 2) {
      const b = out[out.length - 1]!;
      const a = out[out.length - 2]!;
      if (a.sum / a.count <= b.sum / b.count) break;
      out.pop();
      out.pop();
      out.push({ sum: a.sum + b.sum, count: a.count + b.count });
    }
  }
  const res: number[] = [];
  for (const block of out) {
    const avg = block.sum / block.count;
    for (let i = 0; i < block.count; i++) res.push(avg);
  }
  return res;
}

/**
 * IDR predictive CDF at x: for thresholds, isotonic-regress 1{y_i <= t} on sorted x_i,
 * then evaluate at x by nearest-rank interpolation.
 */
export function idrPredictiveCdf(
  calX: readonly number[],
  calY: readonly number[],
  x: number,
  thresholds: readonly number[],
): number[] {
  if (calX.length !== calY.length || calX.length === 0) {
    throw new Error("idr-postprocess: aligned non-empty calibration data required");
  }
  const order = calX.map((v, i) => i).sort((a, b) => (calX[a] ?? 0) - (calX[b] ?? 0));
  const sx = order.map((i) => calX[i] ?? 0);
  return thresholds.map((t) => {
    const ind = order.map((i) => ((calY[i] ?? 0) <= t ? 1 : 0));
    const fit = pava(ind);
    // evaluate at x: last fitted value with sx <= x
    let val = fit[0] ?? 0;
    for (let k = 0; k < sx.length; k++) {
      if ((sx[k] ?? 0) <= x) val = fit[k] ?? val;
      else break;
    }
    return Math.min(Math.max(val, 0), 1);
  });
}

/** IDR median: smallest threshold with CDF >= 0.5. */
export function idrMedian(cdf: readonly number[], thresholds: readonly number[]): number {
  for (let i = 0; i < cdf.length; i++) {
    if ((cdf[i] ?? 0) >= 0.5) return thresholds[i] ?? 0;
  }
  return thresholds[thresholds.length - 1] ?? 0;
}

/** mAFTER-style adaptive window weights: exp(-eta * recent CRPS-ish loss), normalized. */
export function mafterWindowWeights(windowLosses: readonly number[], eta = 1): number[] {
  if (windowLosses.length === 0) return [];
  const w = windowLosses.map((l) => Math.exp(-eta * l));
  const sum = w.reduce((s, v) => s + v, 0);
  return w.map((v) => v / Math.max(sum, 1e-12));
}

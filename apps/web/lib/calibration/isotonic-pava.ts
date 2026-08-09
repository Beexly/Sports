/**
 * Isotonic regression (PAVA) for probability calibration — offline R&D only.
 * Does not enable CALIBRATION_ADJUSTMENTS or production maps.
 */

export interface IsoPoint {
  readonly p: number;
  readonly y: 0 | 1;
}

export interface IsotonicModel {
  readonly x: readonly number[]; // sorted unique forecast knots
  readonly y: readonly number[]; // nondecreasing fitted rates
  readonly note: string;
}

function clamp01(v: number): number {
  return Math.min(1 - 1e-6, Math.max(1e-6, v));
}

/**
 * Pool Adjacent Violators on equal-width bins of mean forecast vs observed rate.
 */
export function fitIsotonicPava(
  samples: readonly IsoPoint[],
  nBins = 10,
): IsotonicModel {
  if (samples.length === 0) {
    return { x: [0, 1], y: [0.5, 0.5], note: "empty → flat 0.5" };
  }
  const bins = Array.from({ length: nBins }, (_, i) => ({
    sumP: 0,
    sumY: 0,
    n: 0,
    lo: i / nBins,
  }));
  for (const s of samples) {
    const p = clamp01(s.p);
    const idx = Math.min(nBins - 1, Math.floor(p * nBins));
    bins[idx]!.sumP += p;
    bins[idx]!.sumY += s.y;
    bins[idx]!.n += 1;
  }
  // active bins
  type Block = { w: number; sumY: number; meanP: number; meanY: number };
  const blocks: Block[] = [];
  for (const b of bins) {
    if (b.n === 0) continue;
    blocks.push({
      w: b.n,
      sumY: b.sumY,
      meanP: b.sumP / b.n,
      meanY: b.sumY / b.n,
    });
  }
  if (blocks.length === 0) {
    return { x: [0, 1], y: [0.5, 0.5], note: "no mass" };
  }
  // PAVA
  const stack: Block[] = [];
  for (const b of blocks) {
    stack.push({ ...b });
    while (
      stack.length >= 2 &&
      stack[stack.length - 2]!.meanY > stack[stack.length - 1]!.meanY
    ) {
      const right = stack.pop()!;
      const left = stack.pop()!;
      const w = left.w + right.w;
      const sumY = left.sumY + right.sumY;
      stack.push({
        w,
        sumY,
        meanP: (left.meanP * left.w + right.meanP * right.w) / w,
        meanY: sumY / w,
      });
    }
  }
  const x = stack.map((b) => b.meanP);
  const y = stack.map((b) => clamp01(b.meanY));
  // ensure nondecreasing (numerical)
  for (let i = 1; i < y.length; i++) {
    if (y[i]! < y[i - 1]!) y[i] = y[i - 1]!;
  }
  return {
    x,
    y,
    note: "Isotonic PAVA (binned) — R&D only, apply OFF until holdout wins floors.",
  };
}

/** Piecewise-constant / linear interpolate in probability space. */
export function applyIsotonic(p: number, model: IsotonicModel): number {
  const x = clamp01(p);
  if (model.x.length === 0) return 0.5;
  if (x <= model.x[0]!) return model.y[0]!;
  if (x >= model.x[model.x.length - 1]!) return model.y[model.y.length - 1]!;
  for (let i = 1; i < model.x.length; i++) {
    if (x <= model.x[i]!) {
      const x0 = model.x[i - 1]!;
      const x1 = model.x[i]!;
      const y0 = model.y[i - 1]!;
      const y1 = model.y[i]!;
      const t = x1 === x0 ? 0 : (x - x0) / (x1 - x0);
      return clamp01(y0 + t * (y1 - y0));
    }
  }
  return model.y[model.y.length - 1]!;
}

/**
 * Isotonic regression (true PAVA on sorted scores) — offline R&D only.
 * Apply OFF until holdout wins floors + founder enables CALIBRATION_ADJUSTMENTS.
 *
 * Calibrator matrix (doc only — not auto-selected in prod):
 * | Situation                         | Prefer                          |
 * |-----------------------------------|---------------------------------|
 * | Smooth global rescale             | Platt IRLS                      |
 * | Clear monotone bias, weird shape  | Isotonic PAVA (+ optional CIR)  |
 * | Thin tails unreliable             | Platt or Temp (avoid plateaus)  |
 * | Hierarchical markets              | Platt/logistic + EB-τ u_g       |
 */

export interface IsoPoint {
  readonly p: number;
  readonly y: 0 | 1;
}

export interface IsotonicModel {
  /** Sorted unique forecast knots (input order after sort by p). */
  readonly x: readonly number[];
  /** Nondecreasing fitted rates aligned to x. */
  readonly y: readonly number[];
  readonly note: string;
}

function clamp01(v: number): number {
  return Math.min(1 - 1e-6, Math.max(1e-6, v));
}

/**
 * PAVA on sorted scores; y in {0,1} (or any real). Returns block means
 * aligned to each index (same length as y).
 */
export function pava(y: number[], w?: number[]): number[] {
  const n = y.length;
  if (n === 0) return [];
  const weights = w ?? y.map(() => 1);
  const mean = y.slice();
  const wt = weights.slice();
  const left = [...Array(n).keys()];
  const right = [...Array(n).keys()];
  let i = 0;
  while (i < n - 1) {
    if (mean[i]! <= mean[i + 1]! + 1e-15) {
      i++;
      continue;
    }
    let j = i;
    while (j >= 0 && mean[j]! > mean[j + 1]! + 1e-15) {
      const totalW = wt[j]! + wt[j + 1]!;
      const m = (mean[j]! * wt[j]! + mean[j + 1]! * wt[j + 1]!) / totalW;
      const L = left[j]!;
      const R = right[j + 1]!;
      for (let k = L; k <= R; k++) {
        mean[k] = m;
        wt[k] = totalW;
        left[k] = L;
        right[k] = R;
      }
      j = L - 1;
    }
    i = Math.max(i, right[i] ?? i) + 1;
  }
  return mean;
}

/**
 * Fit isotonic map: sort by p, run PAVA on outcomes, collapse equal-p ties
 * into knots for apply.
 */
export function fitIsotonicPava(samples: readonly IsoPoint[]): IsotonicModel {
  if (samples.length === 0) {
    return {
      x: [0, 1],
      y: [0.5, 0.5],
      note: "empty → flat 0.5 (R&D only)",
    };
  }

  const ordered = samples
    .map((s) => ({ p: clamp01(s.p), y: s.y as number }))
    .sort((a, b) => a.p - b.p);

  // Pool exact-p ties into weighted observations before PAVA
  const uniqP: number[] = [];
  const uniqY: number[] = [];
  const uniqW: number[] = [];
  for (const row of ordered) {
    const last = uniqP.length - 1;
    if (last >= 0 && Math.abs(uniqP[last]! - row.p) < 1e-12) {
      const w0 = uniqW[last]!;
      const w1 = 1;
      uniqY[last] = (uniqY[last]! * w0 + row.y * w1) / (w0 + w1);
      uniqW[last] = w0 + w1;
    } else {
      uniqP.push(row.p);
      uniqY.push(row.y);
      uniqW.push(1);
    }
  }

  const fitted = pava(uniqY, uniqW).map(clamp01);

  // Enforce nondecreasing (numerical guard)
  for (let i = 1; i < fitted.length; i++) {
    if (fitted[i]! < fitted[i - 1]!) fitted[i] = fitted[i - 1]!;
  }

  return {
    x: uniqP,
    y: fitted,
    note: "True PAVA on sorted scores — R&D only; apply OFF until holdout wins floors.",
  };
}

/** Piecewise-linear interpolate in probability space; flat outside range. */
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

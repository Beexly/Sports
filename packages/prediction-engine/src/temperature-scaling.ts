/**
 * Temperature scaling for binary probabilities — R&D only.
 *
 * Softens/sharpens logits with one learned T. Fit on time-holdout settled
 * samples only. NOT wired into live scoring (CALIBRATION_ADJUSTMENTS_ENABLED).
 * Prefer existing plattScaling / isotonic when asymmetric bias needs fixing.
 */

import type { CalibrationSample } from "./probability-calibration.js";

const EPS = 1e-6;

function clampUnit(p: number): number {
  return Math.min(1 - EPS, Math.max(EPS, p));
}

function logit(p: number): number {
  const c = clampUnit(p);
  return Math.log(c / (1 - c));
}

function sigmoid(z: number): number {
  if (z >= 0) {
    const e = Math.exp(-z);
    return 1 / (1 + e);
  }
  const e = Math.exp(z);
  return e / (1 + e);
}

export interface TemperatureModel {
  readonly method: "temperature";
  readonly T: number;
  readonly predict: (p: number) => number;
}

/** Apply temperature T to a probability (T>1 softens; T=1 identity; T<1 sharpens). */
export function applyTemperature(p: number, T: number): number {
  if (!(T > 0) || !Number.isFinite(T)) return clampUnit(p);
  return sigmoid(logit(p) / T);
}

/**
 * Fit T by minimizing mean log loss on samples (grid + refine).
 * Prefer fitTemperatureNewton from log-loss-optimize.ts for Newton polish.
 * Returns null if fewer than 2 samples or no class diversity.
 */
export function fitTemperature(
  samples: readonly CalibrationSample[],
  opts?: { tMin?: number; tMax?: number; steps?: number },
): TemperatureModel | null {
  if (samples.length < 2) return null;
  let wins = 0;
  for (const s of samples) wins += s.y;
  if (wins === 0 || wins === samples.length) return null;

  const tMin = opts?.tMin ?? 0.05;
  const tMax = opts?.tMax ?? 10;
  const steps = opts?.steps ?? 80;

  function meanLogLoss(T: number): number {
    let sum = 0;
    for (const s of samples) {
      const p = applyTemperature(s.p, T);
      sum += s.y === 1 ? -Math.log(p) : -Math.log(1 - p);
    }
    return sum / samples.length;
  }

  // Log-spaced grid covers soft (T>1) and sharp (T<1) regimes evenly in log-T
  let bestT = 1;
  let best = meanLogLoss(1);
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const T = tMin * Math.exp(Math.log(tMax / tMin) * u);
    const loss = meanLogLoss(T);
    if (loss < best) {
      best = loss;
      bestT = T;
    }
  }

  // Local refine around best (linear neighborhood)
  const span = bestT * 0.15;
  for (let k = -4; k <= 4; k++) {
    if (k === 0) continue;
    const T = bestT + (span * k) / 4;
    if (T <= 0 || T > tMax * 1.1) continue;
    const loss = meanLogLoss(T);
    if (loss < best) {
      best = loss;
      bestT = T;
    }
  }

  const T = Math.round(bestT * 1e6) / 1e6;
  return {
    method: "temperature",
    T,
    predict: (p: number) => applyTemperature(p, T),
  };
}

/**
 * Log-loss optimization utilities for binary forecasts — R&D / offline only.
 *
 * Temperature scaling via Newton–Raphson on mean NLL (finer than pure grid).
 * OOF log-loss scoring for map family selection. Does NOT wire into live
 * scoring or flip CALIBRATION_ADJUSTMENTS_ENABLED.
 *
 * Proper scoring: meanLogLoss is strictly proper — optimizing it improves
 * probability quality without inventing RES (maps still fix REL/levels only).
 */

import type { CalibrationSample } from "./probability-calibration.js";
import {
  applyTemperature,
  fitTemperature,
  type TemperatureModel,
} from "./temperature-scaling.js";
import { logLoss, meanLogLoss } from "./certificate/proper-scoring.js";

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

export { logLoss, meanLogLoss };

/** Mean NLL under temperature T. */
export function meanLogLossAtTemperature(
  samples: readonly CalibrationSample[],
  T: number,
): number {
  if (samples.length === 0 || !(T > 0) || !Number.isFinite(T)) return NaN;
  let s = 0;
  for (const r of samples) {
    const p = applyTemperature(r.p, T);
    s += logLoss(p, r.y);
  }
  return s / samples.length;
}

/**
 * Gradient d/dT of mean NLL under p = σ(logit(p_raw)/T).
 * Used for Newton / gradient descent refine after grid.
 */
export function temperatureLogLossGradient(
  samples: readonly CalibrationSample[],
  T: number,
): number {
  if (samples.length === 0 || !(T > 0)) return 0;
  let g = 0;
  for (const r of samples) {
    const z = logit(r.p) / T;
    const p = sigmoid(z);
    // dp/dT = p(1-p) * (-logit/T²)
    const dp = p * (1 - p) * (-logit(r.p) / (T * T));
    // dNLL/dp = -1/p (y=1) or 1/(1-p) (y=0)
    const dNllDp = r.y === 1 ? -1 / p : 1 / (1 - p);
    g += dNllDp * dp;
  }
  return g / samples.length;
}

/**
 * Fit T: coarse grid (fitTemperature) then Newton refine on log-loss.
 * Returns null on degenerate class labels.
 */
export function fitTemperatureNewton(
  samples: readonly CalibrationSample[],
  opts?: { tMin?: number; tMax?: number; steps?: number; maxIter?: number },
): TemperatureModel | null {
  const base = fitTemperature(samples, opts);
  if (!base) return null;

  let T = base.T;
  const maxIter = opts?.maxIter ?? 12;
  const tMin = opts?.tMin ?? 0.05;
  const tMax = opts?.tMax ?? 10;

  for (let i = 0; i < maxIter; i++) {
    const g = temperatureLogLossGradient(samples, T);
    // Finite-diff Hessian approx
    const h = 1e-3;
    const g2 = temperatureLogLossGradient(samples, Math.min(tMax, T + h));
    const hess = (g2 - g) / h;
    if (!Number.isFinite(g) || !Number.isFinite(hess) || Math.abs(hess) < 1e-12) break;
    let step = g / hess;
    // Damped Newton
    if (!Number.isFinite(step) || Math.abs(step) > 2) step = Math.sign(step) * 0.5;
    const next = Math.min(tMax, Math.max(tMin, T - step));
    if (Math.abs(next - T) < 1e-6) {
      T = next;
      break;
    }
    // Accept only if NLL improves
    if (meanLogLossAtTemperature(samples, next) <= meanLogLossAtTemperature(samples, T) + 1e-12) {
      T = next;
    } else {
      break;
    }
  }

  const Tround = Math.round(T * 1e6) / 1e6;
  return {
    method: "temperature",
    T: Tround,
    predict: (p: number) => applyTemperature(p, Tround),
  };
}

export type LogLossSliceReport = {
  readonly n: number;
  readonly meanLogLoss: number;
  readonly meanBrier: number;
  /** Fraction of rows with p outside (0.02, 0.98) — tail mass that NLL punishes. */
  readonly extremeMass: number;
  /** Mean |p−0.5| — sharpness; high + high NLL ⇒ overconfident. */
  readonly meanAbsDevFromHalf: number;
};

/** Debug snapshot of log-loss geometry on a sample. */
export function diagnoseLogLoss(
  samples: readonly CalibrationSample[],
): LogLossSliceReport {
  if (samples.length === 0) {
    return {
      n: 0,
      meanLogLoss: NaN,
      meanBrier: NaN,
      extremeMass: NaN,
      meanAbsDevFromHalf: NaN,
    };
  }
  let nll = 0;
  let brier = 0;
  let extreme = 0;
  let absDev = 0;
  for (const r of samples) {
    const p = clampUnit(r.p);
    nll += logLoss(p, r.y);
    brier += (p - r.y) ** 2;
    if (p < 0.02 || p > 0.98) extreme += 1;
    absDev += Math.abs(p - 0.5);
  }
  const n = samples.length;
  return {
    n,
    meanLogLoss: nll / n,
    meanBrier: brier / n,
    extremeMass: extreme / n,
    meanAbsDevFromHalf: absDev / n,
  };
}

/**
 * Time-ordered OOF log-loss for a predict-fn: fit on prefix, score on suffix.
 * Caller supplies fit that returns predict(p).
 */
export function holdoutLogLoss(
  samplesChrono: readonly CalibrationSample[],
  fit: (train: readonly CalibrationSample[]) => ((p: number) => number) | null,
  trainFrac = 0.7,
): { nTrain: number; nTest: number; rawLogLoss: number; mappedLogLoss: number | null } {
  const n = samplesChrono.length;
  const cut = Math.max(1, Math.floor(n * trainFrac));
  const train = samplesChrono.slice(0, cut);
  const test = samplesChrono.slice(cut);
  const rawLogLoss = meanLogLoss(test.map((r) => ({ p: r.p, y: r.y })));
  if (test.length === 0) {
    return { nTrain: train.length, nTest: 0, rawLogLoss: NaN, mappedLogLoss: null };
  }
  const predict = fit(train);
  if (!predict) {
    return { nTrain: train.length, nTest: test.length, rawLogLoss, mappedLogLoss: null };
  }
  const mapped = test.map((r) => ({ p: predict(r.p), y: r.y as 0 | 1 }));
  return {
    nTrain: train.length,
    nTest: test.length,
    rawLogLoss,
    mappedLogLoss: meanLogLoss(mapped),
  };
}

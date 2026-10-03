/**
 * Ridge (L2-regularized) linear regression — pure, deterministic, zero-dep.
 *
 * The expected-rush-yards and expected-YAC models are continuous regressions of
 * a play outcome on situational features. We fit them by the ridge normal
 * equations, solved exactly with the Gaussian-elimination kernel in numeric.ts:
 *
 *     β = (ZᵀZ + λR)⁻¹ Zᵀy
 *
 * where Z is the standardized design matrix with a leading intercept column and
 * R = diag(0, 1, 1, …) leaves the intercept unpenalized. Standardizing the
 * features first makes a single scalar λ act uniformly across columns and keeps
 * the normal-equations matrix well-conditioned. The fit is a closed-form solve —
 * no randomness, no iteration count — so the same plays always produce the same
 * coefficients (the house determinism contract).
 */

import { applyScaler, fitScaler, mean, solveLinearSystem, type FeatureScaler } from "./numeric.js";

export interface LinearModel {
  /** Unpenalized intercept (in raw target units). */
  readonly intercept: number;
  /** Coefficients in STANDARDIZED feature space, aligned with the scaler columns. */
  readonly weights: readonly number[];
  /** The feature standardizer applied before the linear combination. */
  readonly scaler: FeatureScaler;
  /** The L2 penalty used (0 = ordinary least squares). */
  readonly lambda: number;
  /** Number of training rows the fit consumed. */
  readonly sampleSize: number;
}

/**
 * Fit ridge regression of `targets` on `rows`. Returns null when there is too
 * little data to identify the coefficients (fewer rows than features + 1) or the
 * normal-equations matrix is singular even after ridging — we never return an
 * unidentifiable model.
 *
 * @param rows    Raw feature rows (no intercept column; the fit adds one).
 * @param targets Continuous outcome per row.
 * @param lambda  L2 penalty on the standardized (non-intercept) coefficients.
 */
export function fitRidge(
  rows: ReadonlyArray<readonly number[]>,
  targets: readonly number[],
  lambda = 1,
): LinearModel | null {
  const n = Math.min(rows.length, targets.length);
  if (n === 0) return null;
  const p = rows[0]?.length ?? 0;
  if (p === 0) return null;
  if (n < p + 1) return null; // underdetermined

  const scaler = fitScaler(rows);
  // Standardized design with a leading intercept column of ones: width p + 1.
  const z: number[][] = [];
  for (let i = 0; i < n; i++) {
    const scaled = applyScaler(scaler, rows[i] ?? []);
    z.push([1, ...scaled]);
  }
  const width = p + 1;

  // Normal-equations matrix ZᵀZ + λR and right-hand side Zᵀy.
  const ata: number[][] = Array.from({ length: width }, () => new Array<number>(width).fill(0));
  const atb: number[] = new Array(width).fill(0);
  for (let i = 0; i < n; i++) {
    const zi = z[i]!;
    const yi = targets[i] ?? 0;
    for (let a = 0; a < width; a++) {
      const za = zi[a] ?? 0;
      atb[a] = (atb[a] ?? 0) + za * yi;
      const rowA = ata[a]!;
      for (let b = 0; b < width; b++) {
        rowA[b] = (rowA[b] ?? 0) + za * (zi[b] ?? 0);
      }
    }
  }
  // Ridge: penalize every coefficient except the intercept (index 0).
  for (let a = 1; a < width; a++) {
    const rowA = ata[a]!;
    rowA[a] = (rowA[a] ?? 0) + lambda;
  }

  const beta = solveLinearSystem(ata, atb);
  if (beta === null) return null;

  const intercept = beta[0] ?? mean(targets.slice(0, n));
  const weights = beta.slice(1);
  return { intercept, weights, scaler, lambda, sampleSize: n };
}

/** Predict the continuous outcome for one raw feature row. */
export function predictRidge(model: LinearModel, row: readonly number[]): number {
  const scaled = applyScaler(model.scaler, row);
  let acc = model.intercept;
  for (let c = 0; c < model.weights.length; c++) acc += (model.weights[c] ?? 0) * (scaled[c] ?? 0);
  return acc;
}

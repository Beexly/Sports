/**
 * Logistic regression — pure, deterministic, zero-dep.
 *
 * The expected-completion-probability model (our own xCOMP) is a binary
 * classifier: P(complete | air yards, pressure, location, situation). We fit it
 * with L2-regularized batch gradient descent on the log-loss gradient over
 * STANDARDIZED features, with the intercept carried as a separate bias term that
 * is never penalized.
 *
 * Why full-batch fixed-iteration gradient descent rather than IRLS: it is
 * embarrassingly deterministic (no matrix inversion that can go singular on
 * separable data, no stochastic sampling), converges reliably on standardized
 * features, and is cheap enough to run at load time on a season of dropbacks
 * (~18k rows × ~10 features). Determinism is the contract — the same plays and
 * the same hyper-parameters always yield the same coefficients.
 */

import { applyScaler, fitScaler, sigmoid, type FeatureScaler } from "./numeric.js";

export interface LogisticModel {
  /** Bias term in logit space (unpenalized). */
  readonly intercept: number;
  /** Coefficients in STANDARDIZED feature space, aligned with the scaler columns. */
  readonly weights: readonly number[];
  /** The feature standardizer applied before the linear combination. */
  readonly scaler: FeatureScaler;
  /** L2 penalty strength used during the fit. */
  readonly l2: number;
  /** Gradient-descent iterations performed. */
  readonly iterations: number;
  /** Number of training rows the fit consumed. */
  readonly sampleSize: number;
}

export interface LogisticFitOptions {
  /** Gradient-descent steps. Default 400 — ample for standardized features. */
  readonly iterations?: number;
  /** Learning rate. Default 0.3. */
  readonly learningRate?: number;
  /** L2 penalty on the (standardized) weights. Default 1e-3. */
  readonly l2?: number;
}

/**
 * Fit a logistic regression of binary `labels` (0/1) on `rows`. Returns null
 * when there is no data or the labels are degenerate (all 0 or all 1 — no
 * decision boundary is estimable and any coefficients would be an artifact of
 * regularization rather than signal).
 */
export function fitLogistic(
  rows: ReadonlyArray<readonly number[]>,
  labels: readonly number[],
  options: LogisticFitOptions = {},
): LogisticModel | null {
  const iterations = options.iterations ?? 400;
  const learningRate = options.learningRate ?? 0.3;
  const l2 = options.l2 ?? 1e-3;

  const n = Math.min(rows.length, labels.length);
  if (n === 0) return null;
  const p = rows[0]?.length ?? 0;
  if (p === 0) return null;

  let positives = 0;
  for (let i = 0; i < n; i++) positives += (labels[i] ?? 0) > 0.5 ? 1 : 0;
  if (positives === 0 || positives === n) return null; // degenerate labels

  const scaler = fitScaler(rows);
  const z: number[][] = [];
  for (let i = 0; i < n; i++) z.push(applyScaler(scaler, rows[i] ?? []));

  const weights: number[] = new Array(p).fill(0);
  // Initialize the bias at the class-prior log-odds so descent starts calibrated.
  const priorP = positives / n;
  let intercept = Math.log((priorP + 1e-9) / (1 - priorP + 1e-9));

  for (let iter = 0; iter < iterations; iter++) {
    const gradW: number[] = new Array(p).fill(0);
    let gradB = 0;
    for (let i = 0; i < n; i++) {
      const zi = z[i]!;
      let logit = intercept;
      for (let c = 0; c < p; c++) logit += (weights[c] ?? 0) * (zi[c] ?? 0);
      const err = sigmoid(logit) - (labels[i] ?? 0);
      gradB += err;
      for (let c = 0; c < p; c++) gradW[c] = (gradW[c] ?? 0) + err * (zi[c] ?? 0);
    }
    intercept -= learningRate * (gradB / n);
    for (let c = 0; c < p; c++) {
      const g = (gradW[c] ?? 0) / n + l2 * (weights[c] ?? 0);
      weights[c] = (weights[c] ?? 0) - learningRate * g;
    }
  }

  return { intercept, weights, scaler, l2, iterations, sampleSize: n };
}

/** Predict P(label = 1) for one raw feature row. Always in the open interval (0, 1). */
export function predictLogistic(model: LogisticModel, row: readonly number[]): number {
  const scaled = applyScaler(model.scaler, row);
  let logit = model.intercept;
  for (let c = 0; c < model.weights.length; c++) logit += (model.weights[c] ?? 0) * (scaled[c] ?? 0);
  return sigmoid(logit);
}

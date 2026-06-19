/**
 * Predictive Analytics Library
 *
 * Pure TypeScript regression and analytics utilities for sports prediction.
 * Zero external dependencies. All functions are pure (no side effects).
 *
 * NOTE: This library does NOT claim picks are infallible.
 * All outputs are probabilistic estimates only.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Matrix = number[][];
export type Vector = number[];

export interface LinearModel {
  coefficients: Vector; // excludes intercept
  intercept: number;
  rSquared: number;
  mse: number;
}

export interface LogisticModel {
  coefficients: Vector; // excludes intercept
  intercept: number;
  logLoss: number;
}

export interface CrossValidationResult {
  scores: number[];
  mean: number;
  std: number;
}

export interface FeatureImportance {
  index: number;
  name?: string;
  importance: number;
}

export interface PredictionInterval {
  prediction: number;
  lower: number;
  upper: number;
  confidence: number;
}

// ---------------------------------------------------------------------------
// Internal utilities
// ---------------------------------------------------------------------------

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function sign(x: number): number {
  return x > 0 ? 1 : x < 0 ? -1 : 0;
}

function softThreshold(x: number, lambda: number): number {
  return sign(x) * Math.max(Math.abs(x) - lambda, 0);
}

// ---------------------------------------------------------------------------
// Linear Algebra Helpers
// ---------------------------------------------------------------------------

export function matTranspose(m: Matrix): Matrix {
  if (m.length === 0) return [];
  const rows = m.length;
  const cols = m[0]!.length;
  const result: Matrix = Array.from({ length: cols }, () => new Array<number>(rows).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[j]![i] = m[i]![j]!;
    }
  }
  return result;
}

export function matMul(a: Matrix, b: Matrix): Matrix {
  const n = a.length;
  const m = b[0]!.length;
  const k = b.length;
  const result: Matrix = Array.from({ length: n }, () => new Array<number>(m).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      let sum = 0;
      for (let l = 0; l < k; l++) {
        sum += a[i]![l]! * b[l]![j]!;
      }
      result[i]![j] = sum;
    }
  }
  return result;
}

export function matAdd(a: Matrix, b: Matrix): Matrix {
  return a.map((row, i) => row.map((val, j) => val + b[i]![j]!));
}

export function vecDot(a: Vector, b: Vector): number {
  return a.reduce((sum, val, i) => sum + val * b[i]!, 0);
}

export function matVec(m: Matrix, v: Vector): Vector {
  return m.map((row) => vecDot(row, v));
}

export function addBias(X: Matrix): Matrix {
  return X.map((row) => [1, ...row]);
}

/**
 * LU decomposition with partial pivoting.
 * Returns L, U, P (permutation array).
 */
function luDecompose(A: Matrix): { L: Matrix; U: Matrix; P: number[] } {
  const n = A.length;
  const U: Matrix = A.map((row) => [...row]);
  const L: Matrix = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (__, j) => (i === j ? 1 : 0))
  );
  const P: number[] = Array.from({ length: n }, (_, i) => i);

  for (let k = 0; k < n; k++) {
    // Find pivot
    let maxVal = Math.abs(U[k]![k]!);
    let maxRow = k;
    for (let i = k + 1; i < n; i++) {
      if (Math.abs(U[i]![k]!) > maxVal) {
        maxVal = Math.abs(U[i]![k]!);
        maxRow = i;
      }
    }

    if (maxRow !== k) {
      [U[k], U[maxRow]] = [U[maxRow]!, U[k]!];
      [P[k], P[maxRow]] = [P[maxRow]!, P[k]!];
      if (k > 0) {
        for (let j = 0; j < k; j++) {
          [L[k]![j], L[maxRow]![j]] = [L[maxRow]![j]!, L[k]![j]!];
        }
      }
    }

    for (let i = k + 1; i < n; i++) {
      if (Math.abs(U[k]![k]!) < 1e-12) continue;
      const factor = U[i]![k]! / U[k]![k]!;
      L[i]![k] = factor;
      for (let j = k; j < n; j++) {
        U[i]![j]! -= factor * U[k]![j]!;
      }
    }
  }

  return { L, U, P };
}

/**
 * Forward substitution: solve L * y = b
 */
function forwardSubstitution(L: Matrix, b: Vector): Vector {
  const n = L.length;
  const y: Vector = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    let sum = b[i]!;
    for (let j = 0; j < i; j++) {
      sum -= L[i]![j]! * y[j]!;
    }
    y[i] = sum / L[i]![i]!;
  }
  return y;
}

/**
 * Back substitution: solve U * x = y
 */
function backSubstitution(U: Matrix, y: Vector): Vector {
  const n = U.length;
  const x: Vector = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = y[i]!;
    for (let j = i + 1; j < n; j++) {
      sum -= U[i]![j]! * x[j]!;
    }
    if (Math.abs(U[i]![i]!) < 1e-12) {
      x[i] = 0;
    } else {
      x[i] = sum / U[i]![i]!;
    }
  }
  return x;
}

/**
 * Solve A * x = b via LU decomposition with partial pivoting.
 */
function solveLU(A: Matrix, b: Vector): Vector {
  const n = A.length;
  const { L, U, P } = luDecompose(A);

  // Apply permutation to b
  const pb: Vector = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    pb[i] = b[P[i]!]!;
  }

  const y = forwardSubstitution(L, pb);
  return backSubstitution(U, y);
}

/**
 * Solve normal equations: (X^T X) β = X^T y
 */
export function solveNormalEquations(X: Matrix, y: Vector): Vector {
  const Xt = matTranspose(X);
  const XtX = matMul(Xt, X);
  const Xty = matVec(Xt, y);
  return solveLU(XtX, Xty);
}

/**
 * Compute the inverse of a square matrix via LU decomposition.
 */
function matInverse(A: Matrix): Matrix {
  const n = A.length;
  const inv: Matrix = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const e: Vector = new Array<number>(n).fill(0);

  for (let j = 0; j < n; j++) {
    const ej = [...e];
    ej[j] = 1;
    const col = solveLU(A, ej);
    for (let i = 0; i < n; i++) {
      inv[i]![j] = col[i]!;
    }
  }

  return inv;
}

// ---------------------------------------------------------------------------
// Ordinary Least Squares
// ---------------------------------------------------------------------------

export function linearRegression(X: Matrix, y: Vector): LinearModel {
  const Xb = addBias(X);
  const beta = solveNormalEquations(Xb, y);

  const intercept = beta[0]!;
  const coefficients = beta.slice(1);

  const yPred = matVec(Xb, beta);
  const yMean = y.reduce((s, v) => s + v, 0) / y.length;

  const ssTot = y.reduce((s, v) => s + (v - yMean) ** 2, 0);
  const ssRes = y.reduce((s, v, i) => s + (v - yPred[i]!) ** 2, 0);

  const rSq = ssTot < 1e-12 ? 1 : 1 - ssRes / ssTot;
  const msVal = ssRes / y.length;

  return { coefficients, intercept, rSquared: rSq, mse: msVal };
}

export function predict(model: LinearModel, X: Matrix): Vector {
  return X.map((row) => model.intercept + vecDot(model.coefficients, row));
}

export function residuals(model: LinearModel, X: Matrix, y: Vector): Vector {
  const yPred = predict(model, X);
  return y.map((v, i) => v - yPred[i]!);
}

export function standardErrors(model: LinearModel, X: Matrix, y: Vector): Vector {
  const n = y.length;
  const p = model.coefficients.length;
  const dfResid = n - p - 1;

  const res = residuals(model, X, y);
  const sigmaSquared = res.reduce((s, r) => s + r ** 2, 0) / Math.max(dfResid, 1);

  const Xb = addBias(X);
  const Xt = matTranspose(Xb);
  const XtX = matMul(Xt, Xb);
  const XtXinv = matInverse(XtX);

  // SE for intercept + coefficients
  const allSE = XtXinv.map((row, i) => Math.sqrt(Math.max(row[i]! * sigmaSquared, 0)));
  return allSE.slice(1); // return only coefficient SEs
}

export function tStatistics(model: LinearModel, X: Matrix, y: Vector): Vector {
  const se = standardErrors(model, X, y);
  return model.coefficients.map((c, i) => (se[i]! < 1e-12 ? 0 : c / se[i]!));
}

/**
 * t-distribution quantile approximation for two-tailed confidence interval.
 * Uses rational approximation of the normal for large df, or a conservative
 * lookup table for small df.
 */
function tQuantile(alpha: number, df: number): number {
  // For large df, approximate with normal
  if (df >= 120) {
    return normalQuantile(1 - alpha / 2);
  }

  // For very small df, use conservative bounds
  const confidenceLevels: Record<number, number[]> = {
    0.05: [
      12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.16,
      2.145, 2.131, 2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074, 2.069, 2.064, 2.06, 2.056,
      2.052, 2.048, 2.045, 1.96,
    ],
  };

  const table = confidenceLevels[alpha];
  if (!table) return normalQuantile(1 - alpha / 2);

  const idx = Math.min(df - 1, table.length - 1);
  return table[Math.max(idx, 0)]!;
}

/**
 * Approximate normal quantile (probit) via rational approximation.
 */
function normalQuantile(p: number): number {
  // Beasley-Springer-Moro algorithm approximation
  const a = [2.50662823884, -18.61500062529, 41.39119773534, -25.44106049637];
  const b = [-8.4735109309, 23.08336743743, -21.06224101826, 3.13082909833];
  const c = [
    0.337475482272615, 0.976169019091719, 0.160797971491821, 2.76438810333863e-2,
    3.8405729373609e-3, 3.951896511349e-4, 3.21767881768e-5, 2.888167364e-7, 3.960315187e-7,
  ];

  const y = p - 0.5;
  if (Math.abs(y) < 0.42) {
    const r = y * y;
    return (
      (y * (((a[3]! * r + a[2]!) * r + a[1]!) * r + a[0]!)) /
      ((((b[3]! * r + b[2]!) * r + b[1]!) * r + b[0]!) * r + 1)
    );
  }

  const r = p < 0.5 ? Math.log(-Math.log(p)) : Math.log(-Math.log(1 - p));
  let x = c[0]!;
  for (let i = 1; i < c.length; i++) {
    x += c[i]! * r ** i;
  }
  return p < 0.5 ? -x : x;
}

export function predictionInterval(
  model: LinearModel,
  X: Matrix,
  y: Vector,
  newX: Vector,
  confidence = 0.95
): PredictionInterval {
  const n = y.length;
  const p = model.coefficients.length;
  const dfResid = n - p - 1;
  const alpha = 1 - confidence;

  const res = residuals(model, X, y);
  const sigmaSquared = res.reduce((s, r) => s + r ** 2, 0) / Math.max(dfResid, 1);
  const sigma = Math.sqrt(sigmaSquared);

  const Xb = addBias(X);
  const Xt = matTranspose(Xb);
  const XtX = matMul(Xt, Xb);
  const XtXinv = matInverse(XtX);

  const newXb = [1, ...newX];
  // h = x^T (X^TX)^-1 x
  const XtXinvX = matVec(XtXinv, newXb);
  const h = vecDot(newXb, XtXinvX);

  const prediction = model.intercept + vecDot(model.coefficients, newX);
  const t = tQuantile(alpha, dfResid);
  const margin = t * sigma * Math.sqrt(1 + h);

  return { prediction, lower: prediction - margin, upper: prediction + margin, confidence };
}

// ---------------------------------------------------------------------------
// Regularized Regression
// ---------------------------------------------------------------------------

export function ridgeRegression(X: Matrix, y: Vector, lambda = 1.0): LinearModel {
  const Xb = addBias(X);
  const Xt = matTranspose(Xb);
  const XtX = matMul(Xt, Xb);
  const p = XtX.length;

  // Add lambda to diagonal (skip intercept: index 0)
  const XtXReg: Matrix = XtX.map((row, i) =>
    row.map((val, j) => (i === j && i > 0 ? val + lambda : val))
  );

  const Xty = matVec(Xt, y);
  const beta = solveLU(XtXReg, Xty);

  const intercept = beta[0]!;
  const coefficients = beta.slice(1);

  const yPred = matVec(Xb, beta);
  const yMean = y.reduce((s, v) => s + v, 0) / y.length;
  const ssTot = y.reduce((s, v) => s + (v - yMean) ** 2, 0);
  const ssRes = y.reduce((s, v, i) => s + (v - yPred[i]!) ** 2, 0);
  const rSq = ssTot < 1e-12 ? 1 : 1 - ssRes / ssTot;
  const msVal = ssRes / y.length;

  // Suppress unused variable warning
  void p;

  return { coefficients, intercept, rSquared: rSq, mse: msVal };
}

export function lassoRegression(
  X: Matrix,
  y: Vector,
  lambda = 0.1,
  maxIter = 1000
): LinearModel {
  const n = X.length;
  const numFeatures = X[0]!.length;

  // Standardize X
  const means: Vector = new Array<number>(numFeatures).fill(0);
  const stds: Vector = new Array<number>(numFeatures).fill(1);

  for (let j = 0; j < numFeatures; j++) {
    const colVals = X.map((row) => row[j]!);
    means[j] = colVals.reduce((s, v) => s + v, 0) / n;
    const variance = colVals.reduce((s, v) => s + (v - means[j]!) ** 2, 0) / n;
    stds[j] = Math.sqrt(variance) || 1;
  }

  const Xs: Matrix = X.map((row) => row.map((v, j) => (v - means[j]!) / stds[j]!));

  // Intercept from mean of y
  const yMean = y.reduce((s, v) => s + v, 0) / n;

  // Initialize coefficients
  const beta: Vector = new Array<number>(numFeatures).fill(0);
  const yCenter = y.map((v) => v - yMean);

  // Precompute column dot products (X_j^T X_j)
  const colNorms: Vector = Xs[0]!.map((_, j) => {
    return Xs.reduce((s, row) => s + row[j]! ** 2, 0);
  });

  // Coordinate descent
  for (let iter = 0; iter < maxIter; iter++) {
    let maxChange = 0;

    for (let j = 0; j < numFeatures; j++) {
      const oldBeta = beta[j]!;

      // Compute partial residual
      const rho = Xs.reduce((s, row, i) => {
        let pred = 0;
        for (let k = 0; k < numFeatures; k++) {
          if (k !== j) pred += Xs[i]![k]! * beta[k]!;
        }
        return s + row[j]! * (yCenter[i]! - pred);
      }, 0);

      const norm = colNorms[j]!;
      if (norm < 1e-12) {
        beta[j] = 0;
      } else {
        beta[j] = softThreshold(rho / norm, lambda / norm);
      }

      maxChange = Math.max(maxChange, Math.abs(beta[j]! - oldBeta));
    }

    if (maxChange < 1e-6) break;
  }

  // Unstandardize: beta_orig_j = beta_std_j / std_j
  const coefficients = beta.map((b, j) => b / stds[j]!);
  const intercept = yMean - vecDot(coefficients, means);

  const yPred = X.map((row) => intercept + vecDot(coefficients, row));
  const yMeanOrig = y.reduce((s, v) => s + v, 0) / n;
  const ssTot = y.reduce((s, v) => s + (v - yMeanOrig) ** 2, 0);
  const ssRes = y.reduce((s, v, i) => s + (v - yPred[i]!) ** 2, 0);
  const rSq = ssTot < 1e-12 ? 1 : 1 - ssRes / ssTot;
  const msVal = ssRes / n;

  return { coefficients, intercept, rSquared: rSq, mse: msVal };
}

export function elasticNet(
  X: Matrix,
  y: Vector,
  alpha = 0.5,
  l1Ratio = 0.5,
  maxIter = 1000
): LinearModel {
  const n = X.length;
  const numFeatures = X[0]!.length;

  // Standardize
  const means: Vector = new Array<number>(numFeatures).fill(0);
  const stds: Vector = new Array<number>(numFeatures).fill(1);
  for (let j = 0; j < numFeatures; j++) {
    const colVals = X.map((row) => row[j]!);
    means[j] = colVals.reduce((s, v) => s + v, 0) / n;
    const variance = colVals.reduce((s, v) => s + (v - means[j]!) ** 2, 0) / n;
    stds[j] = Math.sqrt(variance) || 1;
  }

  const Xs: Matrix = X.map((row) => row.map((v, j) => (v - means[j]!) / stds[j]!));
  const yMean = y.reduce((s, v) => s + v, 0) / n;
  const yCenter = y.map((v) => v - yMean);

  const beta: Vector = new Array<number>(numFeatures).fill(0);

  const colNorms: Vector = Xs[0]!.map((_, j) =>
    Xs.reduce((s, row) => s + row[j]! ** 2, 0)
  );

  const lambdaL1 = alpha * l1Ratio;
  const lambdaL2 = alpha * (1 - l1Ratio);

  for (let iter = 0; iter < maxIter; iter++) {
    let maxChange = 0;

    for (let j = 0; j < numFeatures; j++) {
      const oldBeta = beta[j]!;

      const rho = Xs.reduce((s, row, i) => {
        let pred = 0;
        for (let k = 0; k < numFeatures; k++) {
          if (k !== j) pred += Xs[i]![k]! * beta[k]!;
        }
        return s + row[j]! * (yCenter[i]! - pred);
      }, 0);

      const norm = colNorms[j]! + lambdaL2;
      if (norm < 1e-12) {
        beta[j] = 0;
      } else {
        beta[j] = softThreshold(rho / norm, lambdaL1 / norm);
      }

      maxChange = Math.max(maxChange, Math.abs(beta[j]! - oldBeta));
    }

    if (maxChange < 1e-6) break;
  }

  const coefficients = beta.map((b, j) => b / stds[j]!);
  const intercept = yMean - vecDot(coefficients, means);

  const yPred = X.map((row) => intercept + vecDot(coefficients, row));
  const yMeanOrig = y.reduce((s, v) => s + v, 0) / n;
  const ssTot = y.reduce((s, v) => s + (v - yMeanOrig) ** 2, 0);
  const ssRes = y.reduce((s, v, i) => s + (v - yPred[i]!) ** 2, 0);
  const rSq = ssTot < 1e-12 ? 1 : 1 - ssRes / ssTot;
  const msVal = ssRes / n;

  return { coefficients, intercept, rSquared: rSq, mse: msVal };
}

// ---------------------------------------------------------------------------
// Logistic Regression
// ---------------------------------------------------------------------------

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-clamp(x, -500, 500)));
}

export function logisticRegression(
  X: Matrix,
  y: Vector,
  opts: { lr?: number; maxIter?: number; lambda?: number } = {}
): LogisticModel {
  const lr = opts.lr ?? 0.01;
  const maxIter = opts.maxIter ?? 500;
  const lambda = opts.lambda ?? 0.0;

  const n = X.length;
  const p = X[0]!.length;

  let intercept = 0;
  let coefficients: Vector = new Array<number>(p).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    // Compute predictions
    const probs = X.map((row) => sigmoid(intercept + vecDot(coefficients, row)));

    // Gradients
    const errors = probs.map((prob, i) => prob - y[i]!);

    const gradIntercept = errors.reduce((s, e) => s + e, 0) / n;
    const gradCoeffs = coefficients.map((_, j) =>
      errors.reduce((s, e, i) => s + e * X[i]![j]!, 0) / n + lambda * coefficients[j]!
    );

    intercept -= lr * gradIntercept;
    coefficients = coefficients.map((c, j) => c - lr * gradCoeffs[j]!);
  }

  const finalProbs = X.map((row) => sigmoid(intercept + vecDot(coefficients, row)));
  const loss = logLoss(y, finalProbs);

  return { coefficients, intercept, logLoss: loss };
}

export function logisticPredict(model: LogisticModel, X: Matrix): Vector {
  return X.map((row) => sigmoid(model.intercept + vecDot(model.coefficients, row)));
}

export function logisticPredictClass(
  model: LogisticModel,
  X: Matrix,
  threshold = 0.5
): number[] {
  return logisticPredict(model, X).map((p) => (p >= threshold ? 1 : 0));
}

export function logLoss(yTrue: Vector, yPred: Vector): number {
  const eps = 1e-12;
  return (
    -yTrue.reduce((s, y, i) => {
      const p = clamp(yPred[i]!, eps, 1 - eps);
      return s + y * Math.log(p) + (1 - y) * Math.log(1 - p);
    }, 0) / yTrue.length
  );
}

// ---------------------------------------------------------------------------
// Model Evaluation
// ---------------------------------------------------------------------------

export function rSquared(yTrue: Vector, yPred: Vector): number {
  const yMean = yTrue.reduce((s, v) => s + v, 0) / yTrue.length;
  const ssTot = yTrue.reduce((s, v) => s + (v - yMean) ** 2, 0);
  const ssRes = yTrue.reduce((s, v, i) => s + (v - yPred[i]!) ** 2, 0);
  return ssTot < 1e-12 ? 1 : 1 - ssRes / ssTot;
}

export function mse(yTrue: Vector, yPred: Vector): number {
  return yTrue.reduce((s, v, i) => s + (v - yPred[i]!) ** 2, 0) / yTrue.length;
}

export function rmse(yTrue: Vector, yPred: Vector): number {
  return Math.sqrt(mse(yTrue, yPred));
}

export function mae(yTrue: Vector, yPred: Vector): number {
  return yTrue.reduce((s, v, i) => s + Math.abs(v - yPred[i]!), 0) / yTrue.length;
}

export function mape(yTrue: Vector, yPred: Vector): number {
  const validPairs = yTrue
    .map((v, i) => ({ actual: v, pred: yPred[i]! }))
    .filter(({ actual }) => Math.abs(actual) > 1e-12);
  if (validPairs.length === 0) return 0;
  return (
    validPairs.reduce(
      ({ sum }, { actual, pred }) => ({
        sum: sum + Math.abs((actual - pred) / actual),
      }),
      { sum: 0 }
    ).sum /
    validPairs.length
  );
}

export function accuracy(yTrue: number[], yPred: number[]): number {
  const correct = yTrue.filter((v, i) => v === yPred[i]).length;
  return correct / yTrue.length;
}

export function precision(yTrue: number[], yPred: number[], positiveClass = 1): number {
  const tp = yTrue.filter((v, i) => v === positiveClass && yPred[i] === positiveClass).length;
  const fp = yTrue.filter((v, i) => v !== positiveClass && yPred[i] === positiveClass).length;
  return tp + fp === 0 ? 0 : tp / (tp + fp);
}

export function recall(yTrue: number[], yPred: number[], positiveClass = 1): number {
  const tp = yTrue.filter((v, i) => v === positiveClass && yPred[i] === positiveClass).length;
  const fn = yTrue.filter((v, i) => v === positiveClass && yPred[i] !== positiveClass).length;
  return tp + fn === 0 ? 0 : tp / (tp + fn);
}

export function f1Score(yTrue: number[], yPred: number[], positiveClass = 1): number {
  const p = precision(yTrue, yPred, positiveClass);
  const r = recall(yTrue, yPred, positiveClass);
  return p + r === 0 ? 0 : (2 * p * r) / (p + r);
}

export function confusionMatrix(yTrue: number[], yPred: number[]): Matrix {
  const classes = [...new Set([...yTrue, ...yPred])].sort((a, b) => a - b);
  const n = classes.length;
  const classIndex: Map<number, number> = new Map(classes.map((c, i) => [c, i]));
  const matrix: Matrix = Array.from({ length: n }, () => new Array<number>(n).fill(0));

  for (let i = 0; i < yTrue.length; i++) {
    const row = classIndex.get(yTrue[i]!)!;
    const col = classIndex.get(yPred[i]!)!;
    matrix[row]![col]!++;
  }

  return matrix;
}

export function aucRoc(yTrue: number[], yScores: number[]): number {
  // Sort by descending score
  const pairs = yTrue.map((y, i) => ({ y, score: yScores[i]! })).sort((a, b) => b.score - a.score);

  const totalPos = yTrue.filter((v) => v === 1).length;
  const totalNeg = yTrue.length - totalPos;

  if (totalPos === 0 || totalNeg === 0) return 0.5;

  // Trapezoidal rule
  let auc = 0;
  let tp = 0;
  let fp = 0;
  let prevTp = 0;
  let prevFp = 0;

  for (const { y } of pairs) {
    if (y === 1) {
      tp++;
    } else {
      fp++;
    }

    const tpr = tp / totalPos;
    const fpr = fp / totalNeg;
    const prevTpr = prevTp / totalPos;
    const prevFpr = prevFp / totalNeg;

    auc += ((fpr - prevFpr) * (tpr + prevTpr)) / 2;
    prevTp = tp;
    prevFp = fp;
  }

  return auc;
}

export function brierScore(yTrue: number[], yProbas: number[]): number {
  return yTrue.reduce((s, y, i) => s + (y - yProbas[i]!) ** 2, 0) / yTrue.length;
}

// ---------------------------------------------------------------------------
// Cross-Validation
// ---------------------------------------------------------------------------

/**
 * Simple seeded pseudo-random number generator (LCG).
 */
function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0x100000000;
  };
}

function shuffleIndices(n: number, rng: () => number): number[] {
  const indices = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j]!, indices[i]!];
  }
  return indices;
}

export function kFoldSplit(
  n: number,
  k: number,
  seed = 42
): { train: number[]; test: number[] }[] {
  const rng = seededRng(seed);
  const indices = shuffleIndices(n, rng);

  const folds: { train: number[]; test: number[] }[] = [];
  const foldSize = Math.floor(n / k);

  for (let f = 0; f < k; f++) {
    const start = f * foldSize;
    const end = f === k - 1 ? n : start + foldSize;
    const test = indices.slice(start, end);
    const train = [...indices.slice(0, start), ...indices.slice(end)];
    folds.push({ train, test });
  }

  return folds;
}

export function kFoldCV(X: Matrix, y: Vector, k = 5, seed = 42): CrossValidationResult {
  const folds = kFoldSplit(X.length, k, seed);
  const scores: number[] = [];

  for (const { train, test } of folds) {
    const XTrain = train.map((i) => X[i]!);
    const yTrain = train.map((i) => y[i]!);
    const XTest = test.map((i) => X[i]!);
    const yTest = test.map((i) => y[i]!);

    const model = linearRegression(XTrain, yTrain);
    const yPred = predict(model, XTest);
    scores.push(rSquared(yTest, yPred));
  }

  const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
  const variance = scores.reduce((s, v) => s + (v - mean) ** 2, 0) / scores.length;
  const std = Math.sqrt(variance);

  return { scores, mean, std };
}

export function leaveOneOutCV(X: Matrix, y: Vector): CrossValidationResult {
  const n = X.length;
  const scores: number[] = [];

  for (let i = 0; i < n; i++) {
    const trainIdx = Array.from({ length: n }, (_, j) => j).filter((j) => j !== i);
    const XTrain = trainIdx.map((j) => X[j]!);
    const yTrain = trainIdx.map((j) => y[j]!);
    const XTest = [X[i]!];
    const yTest = [y[i]!];

    const model = linearRegression(XTrain, yTrain);
    const yPred = predict(model, XTest);
    scores.push(rSquared(yTest, yPred));
  }

  const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
  const variance = scores.reduce((s, v) => s + (v - mean) ** 2, 0) / scores.length;
  const std = Math.sqrt(variance);

  return { scores, mean, std };
}

export function trainTestSplit(
  X: Matrix,
  y: Vector,
  testSize = 0.2,
  seed = 42
): { XTrain: Matrix; XTest: Matrix; yTrain: Vector; yTest: Vector } {
  const n = X.length;
  const rng = seededRng(seed);
  const indices = shuffleIndices(n, rng);

  const nTest = Math.round(n * testSize);
  const testIdx = indices.slice(0, nTest);
  const trainIdx = indices.slice(nTest);

  return {
    XTrain: trainIdx.map((i) => X[i]!),
    XTest: testIdx.map((i) => X[i]!),
    yTrain: trainIdx.map((i) => y[i]!),
    yTest: testIdx.map((i) => y[i]!),
  };
}

// ---------------------------------------------------------------------------
// Feature Engineering
// ---------------------------------------------------------------------------

export function standardizeFeatures(X: Matrix): { X: Matrix; means: Vector; stds: Vector } {
  const n = X.length;
  const p = X[0]!.length;
  const means: Vector = new Array<number>(p).fill(0);
  const stds: Vector = new Array<number>(p).fill(1);

  for (let j = 0; j < p; j++) {
    const col = X.map((row) => row[j]!);
    means[j] = col.reduce((s, v) => s + v, 0) / n;
    const variance = col.reduce((s, v) => s + (v - means[j]!) ** 2, 0) / n;
    stds[j] = Math.sqrt(variance) || 1;
  }

  const Xnorm: Matrix = X.map((row) => row.map((v, j) => (v - means[j]!) / stds[j]!));
  return { X: Xnorm, means, stds };
}

export function normalizeFeatures(X: Matrix): { X: Matrix; mins: Vector; maxes: Vector } {
  const p = X[0]!.length;
  const mins: Vector = new Array<number>(p).fill(Infinity);
  const maxes: Vector = new Array<number>(p).fill(-Infinity);

  for (const row of X) {
    for (let j = 0; j < p; j++) {
      mins[j] = Math.min(mins[j]!, row[j]!);
      maxes[j] = Math.max(maxes[j]!, row[j]!);
    }
  }

  const Xnorm: Matrix = X.map((row) =>
    row.map((v, j) => {
      const range = maxes[j]! - mins[j]!;
      return range < 1e-12 ? 0 : (v - mins[j]!) / range;
    })
  );

  return { X: Xnorm, mins, maxes };
}

export function polynomialFeatures(X: Matrix, degree: number): Matrix {
  if (degree < 1) return X;
  if (degree === 1) return X;

  const n = X.length;
  const p = X[0]!.length;

  return X.map((row) => {
    const features: number[] = [...row];

    if (degree >= 2) {
      // Add degree-2 terms: x_i^2 and x_i * x_j for all i <= j
      for (let i = 0; i < p; i++) {
        features.push(row[i]! ** 2);
      }
      for (let i = 0; i < p; i++) {
        for (let j = i + 1; j < p; j++) {
          features.push(row[i]! * row[j]!);
        }
      }
    }

    if (degree >= 3) {
      // Add degree-3 terms: x_i^3, x_i^2 * x_j, x_i * x_j * x_k
      for (let i = 0; i < p; i++) {
        features.push(row[i]! ** 3);
      }
      for (let i = 0; i < p; i++) {
        for (let j = 0; j < p; j++) {
          if (i !== j) features.push(row[i]! ** 2 * row[j]!);
        }
      }
      for (let i = 0; i < p; i++) {
        for (let j = i + 1; j < p; j++) {
          for (let k = j + 1; k < p; k++) {
            features.push(row[i]! * row[j]! * row[k]!);
          }
        }
      }
    }

    return features;
  });

  // Suppress unused variable warning for n
  void n;
}

export function featureCorrelation(X: Matrix): Matrix {
  const n = X.length;
  const p = X[0]!.length;
  const means: Vector = new Array<number>(p).fill(0);
  const stds: Vector = new Array<number>(p).fill(0);

  for (let j = 0; j < p; j++) {
    const col = X.map((row) => row[j]!);
    means[j] = col.reduce((s, v) => s + v, 0) / n;
    stds[j] = Math.sqrt(col.reduce((s, v) => s + (v - means[j]!) ** 2, 0) / n);
  }

  const corrMatrix: Matrix = Array.from({ length: p }, () => new Array<number>(p).fill(0));

  for (let i = 0; i < p; i++) {
    for (let j = 0; j < p; j++) {
      if (i === j) {
        corrMatrix[i]![j] = 1;
      } else {
        const cov =
          X.reduce((s, row) => s + (row[i]! - means[i]!) * (row[j]! - means[j]!), 0) / n;
        const denom = stds[i]! * stds[j]!;
        corrMatrix[i]![j] = denom < 1e-12 ? 0 : cov / denom;
      }
    }
  }

  return corrMatrix;
}

export function varianceThreshold(
  X: Matrix,
  threshold = 0.01
): { X: Matrix; kept: number[] } {
  const n = X.length;
  const p = X[0]!.length;
  const kept: number[] = [];

  for (let j = 0; j < p; j++) {
    const col = X.map((row) => row[j]!);
    const mean = col.reduce((s, v) => s + v, 0) / n;
    const variance = col.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    if (variance >= threshold) {
      kept.push(j);
    }
  }

  const Xfiltered: Matrix = X.map((row) => kept.map((j) => row[j]!));
  return { X: Xfiltered, kept };
}

// ---------------------------------------------------------------------------
// Feature Selection
// ---------------------------------------------------------------------------

function pearsonCorrelation(x: Vector, y: Vector): number {
  const n = x.length;
  const xMean = x.reduce((s, v) => s + v, 0) / n;
  const yMean = y.reduce((s, v) => s + v, 0) / n;

  let cov = 0;
  let xVar = 0;
  let yVar = 0;

  for (let i = 0; i < n; i++) {
    cov += (x[i]! - xMean) * (y[i]! - yMean);
    xVar += (x[i]! - xMean) ** 2;
    yVar += (y[i]! - yMean) ** 2;
  }

  const denom = Math.sqrt(xVar * yVar);
  return denom < 1e-12 ? 0 : cov / denom;
}

export function pearsonFeatureImportance(X: Matrix, y: Vector): FeatureImportance[] {
  const p = X[0]!.length;
  const importances: FeatureImportance[] = [];

  for (let j = 0; j < p; j++) {
    const col = X.map((row) => row[j]!);
    const corr = pearsonCorrelation(col, y);
    importances.push({ index: j, importance: Math.abs(corr) });
  }

  return importances.sort((a, b) => b.importance - a.importance);
}

export function mutualInformationScore(x: Vector, y: Vector, bins = 10): number {
  const n = x.length;
  if (n === 0) return 0;

  const xMin = Math.min(...x);
  const xMax = Math.max(...x);
  const yMin = Math.min(...y);
  const yMax = Math.max(...y);

  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  const discretize = (val: number, minVal: number, range: number): number =>
    Math.min(Math.floor(((val - minVal) / range) * bins), bins - 1);

  // Build joint count matrix
  const joint: Matrix = Array.from({ length: bins }, () => new Array<number>(bins).fill(0));
  const xCounts: number[] = new Array<number>(bins).fill(0);
  const yCounts: number[] = new Array<number>(bins).fill(0);

  for (let i = 0; i < n; i++) {
    const xi = discretize(x[i]!, xMin, xRange);
    const yi = discretize(y[i]!, yMin, yRange);
    joint[xi]![yi]!++;
    xCounts[xi]!++;
    yCounts[yi]!++;
  }

  let mi = 0;
  for (let xi = 0; xi < bins; xi++) {
    for (let yi = 0; yi < bins; yi++) {
      const pxy = joint[xi]![yi]! / n;
      const px = xCounts[xi]! / n;
      const py = yCounts[yi]! / n;
      if (pxy > 0 && px > 0 && py > 0) {
        mi += pxy * Math.log(pxy / (px * py));
      }
    }
  }

  return mi;
}

export function selectKBest(
  X: Matrix,
  y: Vector,
  k: number
): { X: Matrix; selected: number[] } {
  const importances = pearsonFeatureImportance(X, y);
  const selected = importances
    .slice(0, k)
    .map((f) => f.index)
    .sort((a, b) => a - b);

  const Xselected: Matrix = X.map((row) => selected.map((j) => row[j]!));
  return { X: Xselected, selected };
}

export function recursiveFeatureElimination(
  X: Matrix,
  y: Vector,
  k: number,
  stepSize = 1
): number[] {
  let remaining = Array.from({ length: X[0]!.length }, (_, i) => i);

  while (remaining.length > k) {
    const Xcurrent = X.map((row) => remaining.map((j) => row[j]!));
    const model = ridgeRegression(Xcurrent, y, 1.0);

    // Find the weakest coefficient(s)
    const absCoeffs = model.coefficients.map((c, i) => ({ idx: i, abs: Math.abs(c) }));
    absCoeffs.sort((a, b) => a.abs - b.abs);

    const toRemove = Math.min(stepSize, remaining.length - k);
    const removeLocalIdx = absCoeffs.slice(0, toRemove).map((c) => c.idx);

    remaining = remaining.filter((_, localIdx) => !removeLocalIdx.includes(localIdx));
  }

  return remaining.sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------
// Sports-Specific Functions
// ---------------------------------------------------------------------------

export function teamEfficiencyRegression(features: Matrix, wins: Vector): LinearModel {
  return linearRegression(features, wins);
}

export function playerImpactScore(playerStats: Matrix, teamOutcome: Vector): Vector {
  const { X: Xstd } = standardizeFeatures(playerStats);
  const model = ridgeRegression(Xstd, teamOutcome, 1.0);
  return model.coefficients;
}

export function gameOutcomePrediction(
  homeFeatures: Vector,
  awayFeatures: Vector,
  model: LogisticModel
): { homeWinProb: number; awayWinProb: number } {
  const combinedFeatures = [...homeFeatures, ...awayFeatures];
  const prob = sigmoid(model.intercept + vecDot(model.coefficients, combinedFeatures));
  return { homeWinProb: prob, awayWinProb: 1 - prob };
}

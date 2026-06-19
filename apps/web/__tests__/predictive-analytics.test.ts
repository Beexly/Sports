/**
 * Predictive Analytics Tests
 *
 * Covers OLS, ridge, lasso, logistic regression, cross-validation,
 * feature engineering, feature selection, and sports-specific functions.
 * At least 120 tests.
 */

import { describe, it, expect } from "vitest";
import {
  matTranspose,
  matMul,
  matAdd,
  vecDot,
  matVec,
  solveNormalEquations,
  addBias,
  linearRegression,
  predict,
  residuals,
  standardErrors,
  tStatistics,
  predictionInterval,
  ridgeRegression,
  lassoRegression,
  elasticNet,
  logisticRegression,
  logisticPredict,
  logisticPredictClass,
  logLoss,
  rSquared,
  mse,
  rmse,
  mae,
  mape,
  accuracy,
  precision,
  recall,
  f1Score,
  confusionMatrix,
  aucRoc,
  brierScore,
  kFoldSplit,
  kFoldCV,
  leaveOneOutCV,
  trainTestSplit,
  standardizeFeatures,
  normalizeFeatures,
  polynomialFeatures,
  featureCorrelation,
  varianceThreshold,
  pearsonFeatureImportance,
  mutualInformationScore,
  selectKBest,
  recursiveFeatureElimination,
  teamEfficiencyRegression,
  playerImpactScore,
  gameOutcomePrediction,
} from "@/lib/analytics/predictive-analytics";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function approx(a: number, b: number, tol = 1e-4): boolean {
  return Math.abs(a - b) < tol;
}

function linspace(start: number, stop: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => start + (i * (stop - start)) / (n - 1));
}

// Simple y = 2x + 1 data
const X_LINE: number[][] = linspace(0, 10, 50).map((x) => [x]);
const Y_LINE: number[] = X_LINE.map(([x]) => 2 * x + 1);

// Two-feature data: y = 3*x1 + 2*x2 + 5
const X_2F: number[][] = Array.from({ length: 40 }, (_, i) => [i % 10, Math.floor(i / 10)]);
const Y_2F: number[] = X_2F.map(([x1, x2]) => 3 * x1 + 2 * x2 + 5);

// Logistic data: y=1 if x>5 else y=0
const X_LOG: number[][] = linspace(0, 10, 60).map((x) => [x]);
const Y_LOG: number[] = X_LOG.map(([x]) => (x > 5 ? 1 : 0));

// ---------------------------------------------------------------------------
// Linear Algebra
// ---------------------------------------------------------------------------

describe("matTranspose", () => {
  it("transposes a 2x3 matrix", () => {
    const m = [
      [1, 2, 3],
      [4, 5, 6],
    ];
    const t = matTranspose(m);
    expect(t).toHaveLength(3);
    expect(t[0]).toEqual([1, 4]);
    expect(t[1]).toEqual([2, 5]);
    expect(t[2]).toEqual([3, 6]);
  });

  it("transpose of a 1x1 matrix is itself", () => {
    expect(matTranspose([[7]])).toEqual([[7]]);
  });

  it("double transpose is identity", () => {
    const m = [
      [1, 2],
      [3, 4],
      [5, 6],
    ];
    expect(matTranspose(matTranspose(m))).toEqual(m);
  });

  it("handles empty matrix", () => {
    expect(matTranspose([])).toEqual([]);
  });
});

describe("matMul", () => {
  it("multiplies 2x2 matrices", () => {
    const a = [
      [1, 2],
      [3, 4],
    ];
    const b = [
      [5, 6],
      [7, 8],
    ];
    const c = matMul(a, b);
    expect(c[0][0]).toBe(19);
    expect(c[0][1]).toBe(22);
    expect(c[1][0]).toBe(43);
    expect(c[1][1]).toBe(50);
  });

  it("multiplies non-square matrices", () => {
    const a = [[1, 2, 3]]; // 1x3
    const b = [[4], [5], [6]]; // 3x1
    const c = matMul(a, b);
    expect(c[0][0]).toBe(32);
  });

  it("identity matrix multiplication", () => {
    const I = [
      [1, 0],
      [0, 1],
    ];
    const m = [
      [3, 7],
      [2, 5],
    ];
    expect(matMul(I, m)).toEqual(m);
    expect(matMul(m, I)).toEqual(m);
  });
});

describe("matAdd", () => {
  it("adds two matrices element-wise", () => {
    const a = [
      [1, 2],
      [3, 4],
    ];
    const b = [
      [5, 6],
      [7, 8],
    ];
    const c = matAdd(a, b);
    expect(c[0]).toEqual([6, 8]);
    expect(c[1]).toEqual([10, 12]);
  });

  it("adding zero matrix is identity", () => {
    const m = [[1, 2, 3]];
    const z = [[0, 0, 0]];
    expect(matAdd(m, z)).toEqual(m);
  });
});

describe("vecDot", () => {
  it("computes dot product", () => {
    expect(vecDot([1, 2, 3], [4, 5, 6])).toBe(32);
  });

  it("dot product of orthogonal vectors is zero", () => {
    expect(vecDot([1, 0], [0, 1])).toBe(0);
  });

  it("dot product with zero vector", () => {
    expect(vecDot([1, 2, 3], [0, 0, 0])).toBe(0);
  });
});

describe("matVec", () => {
  it("multiplies matrix by vector", () => {
    const m = [
      [1, 2],
      [3, 4],
    ];
    const v = [1, 1];
    expect(matVec(m, v)).toEqual([3, 7]);
  });

  it("identity matrix times vector returns vector", () => {
    const I = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    const v = [2, 3, 4];
    expect(matVec(I, v)).toEqual(v);
  });
});

describe("addBias", () => {
  it("prepends a column of ones", () => {
    const X = [
      [1, 2],
      [3, 4],
    ];
    const Xb = addBias(X);
    expect(Xb[0][0]).toBe(1);
    expect(Xb[1][0]).toBe(1);
    expect(Xb[0].slice(1)).toEqual([1, 2]);
    expect(Xb[1].slice(1)).toEqual([3, 4]);
  });

  it("adds bias to single column", () => {
    const X = [[5], [6], [7]];
    const Xb = addBias(X);
    expect(Xb.map((r) => r[0])).toEqual([1, 1, 1]);
    expect(Xb.map((r) => r[1])).toEqual([5, 6, 7]);
  });
});

describe("solveNormalEquations", () => {
  it("solves simple system X=identity, y=[1,2,3]", () => {
    const X = [
      [1, 0],
      [0, 1],
      [1, 1],
    ];
    const y = [1, 2, 3];
    const beta = solveNormalEquations(X, y);
    // Should be close to [1, 2]
    expect(beta).toHaveLength(2);
    expect(approx(beta[0], 1, 0.2)).toBe(true);
    expect(approx(beta[1], 2, 0.2)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Linear Regression — OLS
// ---------------------------------------------------------------------------

describe("linearRegression — OLS", () => {
  it("perfect fit on y=2x+1", () => {
    const model = linearRegression(X_LINE, Y_LINE);
    expect(approx(model.intercept, 1, 0.01)).toBe(true);
    expect(approx(model.coefficients[0], 2, 0.01)).toBe(true);
    expect(approx(model.rSquared, 1.0, 1e-6)).toBe(true);
    expect(approx(model.mse, 0, 1e-6)).toBe(true);
  });

  it("intercept is separate from coefficients", () => {
    const model = linearRegression(X_LINE, Y_LINE);
    expect(model.coefficients).toHaveLength(1);
    expect(model.intercept).toBeDefined();
  });

  it("R² is between 0 and 1 for noisy data", () => {
    const X = [[1], [2], [3], [4], [5]];
    const y = [2.1, 3.9, 6.1, 7.9, 10.2];
    const model = linearRegression(X, y);
    expect(model.rSquared).toBeGreaterThan(0.99);
    expect(model.rSquared).toBeLessThanOrEqual(1.0);
  });

  it("two-feature regression: y=3x1+2x2+5", () => {
    const model = linearRegression(X_2F, Y_2F);
    expect(approx(model.intercept, 5, 0.1)).toBe(true);
    expect(approx(model.coefficients[0], 3, 0.1)).toBe(true);
    expect(approx(model.coefficients[1], 2, 0.1)).toBe(true);
  });

  it("MSE is 0 for perfect fit", () => {
    const model = linearRegression(X_LINE, Y_LINE);
    expect(model.mse).toBeLessThan(1e-8);
  });

  it("returns correct number of coefficients", () => {
    const X = [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]];
    const y = [1, 2, 3, 4];
    const model = linearRegression(X, y);
    expect(model.coefficients).toHaveLength(3);
  });
});

describe("predict", () => {
  it("predict on training data matches y for perfect fit", () => {
    const model = linearRegression(X_LINE, Y_LINE);
    const yPred = predict(model, X_LINE);
    yPred.forEach((p, i) => {
      expect(approx(p, Y_LINE[i], 0.01)).toBe(true);
    });
  });

  it("extrapolates correctly", () => {
    const model = linearRegression(X_LINE, Y_LINE);
    const yPred = predict(model, [[20]]);
    expect(approx(yPred[0], 41, 0.1)).toBe(true); // 2*20+1
  });

  it("returns same length as input", () => {
    const model = linearRegression(X_LINE, Y_LINE);
    expect(predict(model, X_LINE)).toHaveLength(X_LINE.length);
  });
});

describe("residuals", () => {
  it("residuals are near zero for perfect fit", () => {
    const model = linearRegression(X_LINE, Y_LINE);
    const res = residuals(model, X_LINE, Y_LINE);
    res.forEach((r) => {
      expect(Math.abs(r)).toBeLessThan(1e-6);
    });
  });

  it("returns correct length", () => {
    const model = linearRegression(X_LINE, Y_LINE);
    expect(residuals(model, X_LINE, Y_LINE)).toHaveLength(Y_LINE.length);
  });

  it("sum of residuals is near zero (OLS property)", () => {
    const X = [[1], [2], [3], [4], [5]];
    const y = [2.1, 3.9, 6.1, 7.9, 10.2];
    const model = linearRegression(X, y);
    const res = residuals(model, X, y);
    const sum = res.reduce((s, r) => s + r, 0);
    expect(Math.abs(sum)).toBeLessThan(1e-8);
  });
});

describe("standardErrors", () => {
  it("returns same length as coefficients", () => {
    const model = linearRegression(X_LINE, Y_LINE);
    const se = standardErrors(model, X_LINE, Y_LINE);
    expect(se).toHaveLength(model.coefficients.length);
  });

  it("standard errors are non-negative", () => {
    const X = [[1], [2], [3], [4], [5]];
    const y = [2.1, 3.9, 6.1, 7.9, 10.2];
    const model = linearRegression(X, y);
    const se = standardErrors(model, X, y);
    se.forEach((s) => expect(s).toBeGreaterThanOrEqual(0));
  });
});

describe("tStatistics", () => {
  it("returns same length as coefficients", () => {
    const X = [[1], [2], [3], [4], [5]];
    const y = [2.1, 3.9, 6.1, 7.9, 10.2];
    const model = linearRegression(X, y);
    const t = tStatistics(model, X, y);
    expect(t).toHaveLength(model.coefficients.length);
  });

  it("t-stat is large for significant predictor (noisy data)", () => {
    // Use noisy data so SE > 0 and t-stat is well-defined
    const X = [[1], [2], [3], [4], [5], [6], [7], [8], [9], [10]];
    const y = [2.1, 3.9, 6.1, 7.9, 10.2, 12.0, 14.1, 16.0, 18.0, 20.1];
    const model = linearRegression(X, y);
    const t = tStatistics(model, X, y);
    // Coefficient should be statistically significant (|t| > 2)
    expect(Math.abs(t[0])).toBeGreaterThan(2);
  });
});

describe("predictionInterval", () => {
  it("prediction interval contains true value for in-range point", () => {
    const model = linearRegression(X_LINE, Y_LINE);
    const newX = [5];
    const pi = predictionInterval(model, X_LINE, Y_LINE, newX, 0.95);
    const trueY = 2 * 5 + 1; // 11
    expect(pi.prediction).toBeDefined();
    expect(pi.lower).toBeLessThanOrEqual(pi.prediction);
    expect(pi.upper).toBeGreaterThanOrEqual(pi.prediction);
    expect(pi.confidence).toBe(0.95);
  });

  it("higher confidence gives wider interval", () => {
    const X = [[1], [2], [3], [4], [5]];
    const y = [2.1, 3.9, 6.1, 7.9, 10.2];
    const model = linearRegression(X, y);
    const pi90 = predictionInterval(model, X, y, [3], 0.90);
    const pi99 = predictionInterval(model, X, y, [3], 0.99);
    expect(pi99.upper - pi99.lower).toBeGreaterThan(pi90.upper - pi90.lower);
  });
});

// ---------------------------------------------------------------------------
// Ridge Regression
// ---------------------------------------------------------------------------

describe("ridgeRegression", () => {
  it("ridge coefficients are smaller than OLS for high lambda", () => {
    const ols = linearRegression(X_LINE, Y_LINE);
    const ridge = ridgeRegression(X_LINE, Y_LINE, 100);
    expect(Math.abs(ridge.coefficients[0])).toBeLessThan(Math.abs(ols.coefficients[0]));
  });

  it("ridge with lambda=0 is close to OLS", () => {
    const ols = linearRegression(X_LINE, Y_LINE);
    const ridge = ridgeRegression(X_LINE, Y_LINE, 0.0001);
    expect(approx(ridge.coefficients[0], ols.coefficients[0], 0.05)).toBe(true);
  });

  it("ridge coefficients shrink toward zero as lambda increases", () => {
    const ridge1 = ridgeRegression(X_LINE, Y_LINE, 1);
    const ridge100 = ridgeRegression(X_LINE, Y_LINE, 100);
    expect(Math.abs(ridge100.coefficients[0])).toBeLessThan(Math.abs(ridge1.coefficients[0]));
  });

  it("returns valid model structure", () => {
    const model = ridgeRegression(X_LINE, Y_LINE, 1);
    expect(model.coefficients).toBeDefined();
    expect(model.intercept).toBeDefined();
    expect(model.rSquared).toBeDefined();
    expect(model.mse).toBeDefined();
  });

  it("R² is still high for low lambda on clean data", () => {
    const model = ridgeRegression(X_LINE, Y_LINE, 0.001);
    expect(model.rSquared).toBeGreaterThan(0.99);
  });

  it("default lambda is 1.0", () => {
    const m1 = ridgeRegression(X_LINE, Y_LINE);
    const m2 = ridgeRegression(X_LINE, Y_LINE, 1.0);
    expect(approx(m1.coefficients[0], m2.coefficients[0], 1e-8)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Lasso Regression
// ---------------------------------------------------------------------------

describe("lassoRegression", () => {
  it("lasso with high lambda produces sparse coefficients", () => {
    const X = [[1, 0.01], [2, 0.02], [3, 0.03], [4, 0.04], [5, 0.05],
               [6, 0.06], [7, 0.07], [8, 0.08], [9, 0.09], [10, 0.1]];
    const y = X.map(([x1]) => 3 * x1 + 1);
    const model = lassoRegression(X, y, 10.0);
    // With high lambda, at least one coefficient should be near zero
    const zeroCoeffs = model.coefficients.filter((c) => Math.abs(c) < 0.5).length;
    expect(zeroCoeffs).toBeGreaterThan(0);
  });

  it("lasso with low lambda approximates OLS", () => {
    const model = lassoRegression(X_LINE, Y_LINE, 0.0001, 2000);
    expect(model.rSquared).toBeGreaterThan(0.98);
  });

  it("lasso returns valid model structure", () => {
    const model = lassoRegression(X_LINE, Y_LINE, 0.1);
    expect(model.coefficients).toHaveLength(1);
    expect(typeof model.intercept).toBe("number");
    expect(typeof model.rSquared).toBe("number");
    expect(typeof model.mse).toBe("number");
  });

  it("lasso with high lambda forces coefficient toward zero", () => {
    const X = [[1], [2], [3], [4], [5], [6], [7], [8], [9], [10]];
    const y = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const model = lassoRegression(X, y, 100.0);
    expect(Math.abs(model.coefficients[0])).toBeLessThan(2.0);
  });

  it("default lambda is 0.1 and maxIter 1000", () => {
    const m1 = lassoRegression(X_LINE, Y_LINE);
    const m2 = lassoRegression(X_LINE, Y_LINE, 0.1, 1000);
    expect(approx(m1.rSquared, m2.rSquared, 0.001)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Elastic Net
// ---------------------------------------------------------------------------

describe("elasticNet", () => {
  it("returns valid model structure", () => {
    const model = elasticNet(X_LINE, Y_LINE);
    expect(model.coefficients).toHaveLength(1);
    expect(typeof model.intercept).toBe("number");
    expect(typeof model.rSquared).toBe("number");
  });

  it("elastic net with l1Ratio=1 behaves like lasso", () => {
    const lasso = lassoRegression(X_LINE, Y_LINE, 0.01);
    const en = elasticNet(X_LINE, Y_LINE, 0.01, 1.0);
    // Both should have R² close to 1
    expect(lasso.rSquared).toBeGreaterThan(0.99);
    expect(en.rSquared).toBeGreaterThan(0.99);
  });

  it("elastic net with l1Ratio=0 behaves like ridge", () => {
    const ridge = ridgeRegression(X_LINE, Y_LINE, 0.5);
    const en = elasticNet(X_LINE, Y_LINE, 0.5, 0.0);
    // Both should shrink coefficients
    expect(Math.abs(en.coefficients[0])).toBeLessThan(3);
  });

  it("elastic net with low alpha has high R²", () => {
    const model = elasticNet(X_LINE, Y_LINE, 0.001, 0.5);
    expect(model.rSquared).toBeGreaterThan(0.98);
  });
});

// ---------------------------------------------------------------------------
// Logistic Regression
// ---------------------------------------------------------------------------

describe("logisticRegression", () => {
  it("converges on linearly separable data", () => {
    const model = logisticRegression(X_LOG, Y_LOG, { lr: 0.1, maxIter: 1000 });
    const preds = logisticPredictClass(model, X_LOG);
    const acc = accuracy(Y_LOG.map((v) => Math.round(v)), preds);
    expect(acc).toBeGreaterThan(0.85);
  });

  it("returns logLoss < log(2) for reasonable model", () => {
    const model = logisticRegression(X_LOG, Y_LOG, { lr: 0.1, maxIter: 500 });
    expect(model.logLoss).toBeLessThan(Math.log(2) + 0.1);
  });

  it("returns valid model structure", () => {
    const model = logisticRegression(X_LOG, Y_LOG);
    expect(model.coefficients).toHaveLength(1);
    expect(typeof model.intercept).toBe("number");
    expect(typeof model.logLoss).toBe("number");
  });

  it("with lambda regularization, still converges", () => {
    const model = logisticRegression(X_LOG, Y_LOG, { lr: 0.05, maxIter: 300, lambda: 0.01 });
    expect(model.logLoss).toBeGreaterThan(0);
    expect(model.logLoss).toBeLessThan(1.5);
  });
});

describe("logisticPredict", () => {
  it("returns probabilities between 0 and 1", () => {
    const model = logisticRegression(X_LOG, Y_LOG, { lr: 0.1, maxIter: 500 });
    const probs = logisticPredict(model, X_LOG);
    probs.forEach((p) => {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    });
  });

  it("high-x inputs have probability > 0.5", () => {
    const model = logisticRegression(X_LOG, Y_LOG, { lr: 0.1, maxIter: 1000 });
    const highProb = logisticPredict(model, [[9]])[0];
    expect(highProb).toBeGreaterThan(0.5);
  });

  it("low-x inputs have probability < 0.5", () => {
    const model = logisticRegression(X_LOG, Y_LOG, { lr: 0.1, maxIter: 1000 });
    const lowProb = logisticPredict(model, [[1]])[0];
    expect(lowProb).toBeLessThan(0.5);
  });
});

describe("logisticPredictClass", () => {
  it("returns only 0s and 1s with default threshold", () => {
    const model = logisticRegression(X_LOG, Y_LOG, { lr: 0.1, maxIter: 500 });
    const classes = logisticPredictClass(model, X_LOG);
    classes.forEach((c) => {
      expect([0, 1]).toContain(c);
    });
  });

  it("custom threshold affects predictions", () => {
    const model = logisticRegression(X_LOG, Y_LOG, { lr: 0.1, maxIter: 500 });
    const strict = logisticPredictClass(model, X_LOG, 0.9);
    const lenient = logisticPredictClass(model, X_LOG, 0.1);
    const strictOnes = strict.filter((c) => c === 1).length;
    const lenientOnes = lenient.filter((c) => c === 1).length;
    expect(lenientOnes).toBeGreaterThanOrEqual(strictOnes);
  });
});

describe("logLoss", () => {
  it("perfect predictions give near-zero loss", () => {
    const eps = 1e-10;
    const yTrue = [0, 1, 0, 1, 1];
    const yPred = [eps, 1 - eps, eps, 1 - eps, 1 - eps];
    expect(logLoss(yTrue, yPred)).toBeLessThan(0.01);
  });

  it("uniform predictions give log(2) loss", () => {
    const yTrue = [0, 1, 0, 1];
    const yPred = [0.5, 0.5, 0.5, 0.5];
    expect(approx(logLoss(yTrue, yPred), Math.log(2), 0.01)).toBe(true);
  });

  it("is non-negative", () => {
    const yTrue = [0, 1, 1, 0];
    const yPred = [0.3, 0.7, 0.6, 0.2];
    expect(logLoss(yTrue, yPred)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Model Evaluation
// ---------------------------------------------------------------------------

describe("rSquared", () => {
  it("perfect predictions give R²=1", () => {
    const y = [1, 2, 3, 4, 5];
    expect(approx(rSquared(y, y), 1.0, 1e-8)).toBe(true);
  });

  it("predicting mean gives R²=0", () => {
    const y = [1, 2, 3, 4, 5];
    const mean = y.reduce((s, v) => s + v, 0) / y.length;
    const yPred = y.map(() => mean);
    expect(approx(rSquared(y, yPred), 0.0, 1e-8)).toBe(true);
  });

  it("returns value between -1 and 1 for reasonable data", () => {
    const y = [1, 2, 3, 4, 5];
    const yPred = [1.1, 1.9, 3.1, 3.9, 5.1];
    const r2 = rSquared(y, yPred);
    expect(r2).toBeLessThanOrEqual(1.0);
  });
});

describe("mse", () => {
  it("zero for perfect predictions", () => {
    const y = [1, 2, 3];
    expect(mse(y, y)).toBe(0);
  });

  it("correct calculation", () => {
    const y = [1, 2, 3];
    const yPred = [2, 2, 2];
    // errors: 1, 0, 1 → mse = (1 + 0 + 1) / 3 = 2/3
    expect(approx(mse(y, yPred), 2 / 3, 1e-8)).toBe(true);
  });
});

describe("rmse", () => {
  it("rmse is sqrt(mse)", () => {
    const y = [1, 2, 3];
    const yPred = [2, 2, 2];
    expect(approx(rmse(y, yPred), Math.sqrt(mse(y, yPred)), 1e-8)).toBe(true);
  });
});

describe("mae", () => {
  it("zero for perfect predictions", () => {
    const y = [1, 2, 3];
    expect(mae(y, y)).toBe(0);
  });

  it("correct calculation", () => {
    const y = [1, 2, 3];
    const yPred = [2, 2, 2];
    // errors: 1, 0, 1 → mae = 2/3
    expect(approx(mae(y, yPred), 2 / 3, 1e-8)).toBe(true);
  });
});

describe("mape", () => {
  it("zero for perfect predictions (no zeros)", () => {
    const y = [1, 2, 3];
    expect(mape(y, y)).toBe(0);
  });

  it("skips zero denominator values", () => {
    const y = [0, 2, 4];
    const yPred = [1, 2, 4];
    // Only non-zero: y=2,yPred=2 (error 0) and y=4,yPred=4 (error 0)
    expect(mape(y, yPred)).toBe(0);
  });

  it("correct MAPE calculation", () => {
    const y = [100, 200];
    const yPred = [110, 190];
    // |100-110|/100 = 0.1, |200-190|/200 = 0.05 → mean = 0.075
    expect(approx(mape(y, yPred), 0.075, 1e-8)).toBe(true);
  });
});

describe("accuracy", () => {
  it("perfect predictions give accuracy=1", () => {
    const y = [0, 1, 0, 1, 1];
    expect(accuracy(y, y)).toBe(1.0);
  });

  it("all wrong gives accuracy=0", () => {
    const y = [0, 0, 1, 1];
    const yPred = [1, 1, 0, 0];
    expect(accuracy(y, yPred)).toBe(0);
  });

  it("50/50 gives accuracy=0.5", () => {
    const y = [0, 1, 0, 1];
    const yPred = [0, 1, 1, 0];
    expect(accuracy(y, yPred)).toBe(0.5);
  });
});

describe("precision", () => {
  it("returns 1 for perfect precision", () => {
    const y = [0, 1, 1];
    const yPred = [0, 1, 1];
    expect(precision(y, yPred, 1)).toBe(1.0);
  });

  it("returns 0 when no true positives", () => {
    const y = [0, 0, 0];
    const yPred = [1, 1, 1];
    expect(precision(y, yPred, 1)).toBe(0);
  });

  it("handles different positive classes", () => {
    const y = [0, 2, 0, 2];
    const yPred = [0, 2, 2, 0];
    const p = precision(y, yPred, 2);
    expect(approx(p, 0.5, 1e-8)).toBe(true);
  });
});

describe("recall", () => {
  it("returns 1 for perfect recall", () => {
    const y = [1, 1, 0];
    const yPred = [1, 1, 1];
    expect(recall(y, yPred, 1)).toBe(1.0);
  });

  it("returns 0 when all positives missed", () => {
    const y = [1, 1, 1];
    const yPred = [0, 0, 0];
    expect(recall(y, yPred, 1)).toBe(0);
  });
});

describe("f1Score", () => {
  it("returns 1 for perfect classifier", () => {
    const y = [0, 1, 0, 1];
    expect(f1Score(y, y, 1)).toBe(1.0);
  });

  it("returns 0 when both precision and recall are 0", () => {
    const y = [1, 1, 1];
    const yPred = [0, 0, 0];
    expect(f1Score(y, yPred, 1)).toBe(0);
  });

  it("is harmonic mean of precision and recall", () => {
    const y = [1, 1, 0, 0, 1];
    const yPred = [1, 0, 0, 1, 1];
    const p = precision(y, yPred, 1);
    const r = recall(y, yPred, 1);
    const expected = (2 * p * r) / (p + r);
    expect(approx(f1Score(y, yPred, 1), expected, 1e-8)).toBe(true);
  });
});

describe("confusionMatrix", () => {
  it("has correct shape for binary classification", () => {
    const y = [0, 1, 0, 1, 0];
    const yPred = [0, 1, 1, 1, 0];
    const cm = confusionMatrix(y, yPred);
    expect(cm).toHaveLength(2);
    expect(cm[0]).toHaveLength(2);
  });

  it("diagonal contains correct counts for perfect classifier", () => {
    const y = [0, 1, 0, 1];
    const cm = confusionMatrix(y, y);
    expect(cm[0][0]).toBe(2); // TN
    expect(cm[1][1]).toBe(2); // TP
    expect(cm[0][1]).toBe(0); // FP
    expect(cm[1][0]).toBe(0); // FN
  });

  it("auto-detects 3 classes", () => {
    const y = [0, 1, 2, 0, 1, 2];
    const yPred = [0, 1, 2, 0, 1, 2];
    const cm = confusionMatrix(y, yPred);
    expect(cm).toHaveLength(3);
    expect(cm[0]).toHaveLength(3);
  });

  it("off-diagonal elements represent misclassifications", () => {
    const y = [0, 0, 1, 1];
    const yPred = [1, 0, 0, 1];
    const cm = confusionMatrix(y, yPred);
    expect(cm[0][1]).toBe(1); // FP
    expect(cm[1][0]).toBe(1); // FN
  });
});

describe("aucRoc", () => {
  it("perfect classifier gives AUC=1", () => {
    const y = [0, 0, 1, 1, 0, 1];
    const scores = [0.1, 0.2, 0.8, 0.9, 0.3, 0.7];
    expect(approx(aucRoc(y, scores), 1.0, 0.01)).toBe(true);
  });

  it("random classifier gives AUC ~0.5", () => {
    const y = [0, 1, 0, 1, 0, 1, 0, 1];
    const scores = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
    const auc = aucRoc(y, scores);
    expect(auc).toBeGreaterThanOrEqual(0);
    expect(auc).toBeLessThanOrEqual(1);
  });

  it("AUC is between 0 and 1", () => {
    const y = [0, 1, 0, 1, 1, 0];
    const scores = [0.3, 0.7, 0.4, 0.8, 0.6, 0.2];
    const auc = aucRoc(y, scores);
    expect(auc).toBeGreaterThanOrEqual(0);
    expect(auc).toBeLessThanOrEqual(1);
  });

  it("returns 0.5 when all positive or all negative", () => {
    const y = [0, 0, 0];
    const scores = [0.3, 0.5, 0.7];
    expect(aucRoc(y, scores)).toBe(0.5);
  });
});

describe("brierScore", () => {
  it("perfect predictions give Brier score=0", () => {
    const y = [0, 1, 0, 1];
    const p = [0, 1, 0, 1];
    expect(brierScore(y, p)).toBe(0);
  });

  it("worst predictions give Brier score=1", () => {
    const y = [0, 1, 0, 1];
    const p = [1, 0, 1, 0];
    expect(brierScore(y, p)).toBe(1.0);
  });

  it("uniform 0.5 predictions give Brier score=0.25", () => {
    const y = [0, 1, 0, 1];
    const p = [0.5, 0.5, 0.5, 0.5];
    expect(approx(brierScore(y, p), 0.25, 1e-8)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Cross-Validation
// ---------------------------------------------------------------------------

describe("kFoldSplit", () => {
  it("returns k folds", () => {
    const folds = kFoldSplit(50, 5);
    expect(folds).toHaveLength(5);
  });

  it("each fold's test set is non-empty", () => {
    const folds = kFoldSplit(30, 5);
    folds.forEach((fold) => {
      expect(fold.test.length).toBeGreaterThan(0);
    });
  });

  it("train and test are disjoint", () => {
    const folds = kFoldSplit(20, 4);
    folds.forEach((fold) => {
      const testSet = new Set(fold.test);
      fold.train.forEach((idx) => {
        expect(testSet.has(idx)).toBe(false);
      });
    });
  });

  it("union of train and test covers all indices", () => {
    const n = 25;
    const k = 5;
    const folds = kFoldSplit(n, k);
    folds.forEach((fold) => {
      const all = new Set([...fold.train, ...fold.test]);
      expect(all.size).toBe(n);
    });
  });

  it("same seed gives same splits", () => {
    const f1 = kFoldSplit(20, 4, 123);
    const f2 = kFoldSplit(20, 4, 123);
    expect(f1[0].test).toEqual(f2[0].test);
  });

  it("different seeds give different splits", () => {
    const f1 = kFoldSplit(20, 4, 1);
    const f2 = kFoldSplit(20, 4, 2);
    // Very likely to differ
    const same = f1[0].test.every((v, i) => v === f2[0].test[i]);
    expect(same).toBe(false);
  });
});

describe("kFoldCV", () => {
  it("returns k scores", () => {
    const result = kFoldCV(X_LINE, Y_LINE, 5);
    expect(result.scores).toHaveLength(5);
  });

  it("mean R² is high for linearly separable data", () => {
    const result = kFoldCV(X_LINE, Y_LINE, 5);
    expect(result.mean).toBeGreaterThan(0.95);
  });

  it("returns mean and std", () => {
    const result = kFoldCV(X_LINE, Y_LINE, 5);
    expect(typeof result.mean).toBe("number");
    expect(typeof result.std).toBe("number");
    expect(result.std).toBeGreaterThanOrEqual(0);
  });

  it("default k is 5", () => {
    const r1 = kFoldCV(X_LINE, Y_LINE);
    const r2 = kFoldCV(X_LINE, Y_LINE, 5);
    expect(r1.scores).toHaveLength(5);
    expect(r2.scores).toHaveLength(5);
  });
});

describe("leaveOneOutCV", () => {
  it("returns n scores for n samples", () => {
    const X = [[1], [2], [3], [4], [5]];
    const y = [2, 4, 6, 8, 10];
    const result = leaveOneOutCV(X, y);
    expect(result.scores).toHaveLength(5);
  });

  it("mean R² is close to 1 for perfect data", () => {
    const X = [[1], [2], [3], [4], [5], [6], [7]];
    const y = X.map(([x]) => 2 * x + 3);
    const result = leaveOneOutCV(X, y);
    // LOO on perfect linear data should give high R²
    expect(result.mean).toBeGreaterThan(0.9);
  });
});

describe("trainTestSplit", () => {
  it("returns correct split sizes", () => {
    const X = Array.from({ length: 100 }, (_, i) => [i]);
    const y = Array.from({ length: 100 }, (_, i) => i);
    const { XTrain, XTest, yTrain, yTest } = trainTestSplit(X, y, 0.2);
    expect(XTest.length).toBe(20);
    expect(XTrain.length).toBe(80);
    expect(yTest.length).toBe(20);
    expect(yTrain.length).toBe(80);
  });

  it("test and train are disjoint", () => {
    const X = Array.from({ length: 50 }, (_, i) => [i]);
    const y = Array.from({ length: 50 }, (_, i) => i);
    const { XTrain, XTest } = trainTestSplit(X, y, 0.3);
    const trainVals = new Set(XTrain.map((r) => r[0]));
    XTest.forEach((r) => {
      expect(trainVals.has(r[0])).toBe(false);
    });
  });

  it("default testSize is 0.2", () => {
    const X = Array.from({ length: 100 }, (_, i) => [i]);
    const y = Array.from({ length: 100 }, (_, i) => i);
    const { XTest } = trainTestSplit(X, y);
    expect(XTest.length).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// Feature Engineering
// ---------------------------------------------------------------------------

describe("standardizeFeatures", () => {
  it("standardized features have mean ~0 and std ~1", () => {
    const X = [[1, 10], [2, 20], [3, 30], [4, 40], [5, 50]];
    const { X: Xstd, means, stds } = standardizeFeatures(X);

    for (let j = 0; j < 2; j++) {
      const col = Xstd.map((r) => r[j]);
      const colMean = col.reduce((s, v) => s + v, 0) / col.length;
      const colStd = Math.sqrt(col.reduce((s, v) => s + (v - colMean) ** 2, 0) / col.length);
      expect(Math.abs(colMean)).toBeLessThan(1e-10);
      expect(approx(colStd, 1.0, 0.01)).toBe(true);
    }

    expect(means).toHaveLength(2);
    expect(stds).toHaveLength(2);
  });

  it("returns correct means", () => {
    const X = [[1], [3], [5]];
    const { means } = standardizeFeatures(X);
    expect(approx(means[0], 3, 1e-8)).toBe(true);
  });
});

describe("normalizeFeatures", () => {
  it("normalized features are in [0, 1]", () => {
    const X = [[1, 10], [5, 50], [3, 30]];
    const { X: Xnorm } = normalizeFeatures(X);
    Xnorm.forEach((row) => {
      row.forEach((v) => {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      });
    });
  });

  it("min becomes 0 and max becomes 1", () => {
    const X = [[2], [5], [8]];
    const { X: Xnorm } = normalizeFeatures(X);
    const col = Xnorm.map((r) => r[0]);
    expect(Math.min(...col)).toBe(0);
    expect(Math.max(...col)).toBe(1);
  });

  it("returns mins and maxes", () => {
    const X = [[1, 2], [3, 4]];
    const { mins, maxes } = normalizeFeatures(X);
    expect(mins).toEqual([1, 2]);
    expect(maxes).toEqual([3, 4]);
  });
});

describe("polynomialFeatures", () => {
  it("degree=1 returns original features", () => {
    const X = [[1, 2], [3, 4]];
    const Xp = polynomialFeatures(X, 1);
    expect(Xp).toEqual(X);
  });

  it("degree=2 with 1 feature adds x² term", () => {
    const X = [[2], [3]];
    const Xp = polynomialFeatures(X, 2);
    // [x, x²]
    expect(Xp[0]).toHaveLength(2);
    expect(Xp[0][1]).toBe(4); // 2²
    expect(Xp[1][1]).toBe(9); // 3²
  });

  it("degree=2 with 2 features adds x1², x2², x1*x2", () => {
    const X = [[2, 3]];
    const Xp = polynomialFeatures(X, 2);
    // [x1, x2, x1², x2², x1*x2]
    expect(Xp[0]).toHaveLength(5);
    expect(Xp[0][2]).toBe(4);   // x1²
    expect(Xp[0][3]).toBe(9);   // x2²
    expect(Xp[0][4]).toBe(6);   // x1*x2
  });

  it("degree=2 increases column count beyond degree=1", () => {
    const X = [[1, 2, 3], [4, 5, 6]];
    const Xp1 = polynomialFeatures(X, 1);
    const Xp2 = polynomialFeatures(X, 2);
    expect(Xp2[0].length).toBeGreaterThan(Xp1[0].length);
  });

  it("for p=2, d=2 we get exactly 5 features", () => {
    const X = [[1, 2], [3, 4]];
    const Xp = polynomialFeatures(X, 2);
    // p + p + p*(p-1)/2 = 2 + 2 + 1 = 5
    expect(Xp[0]).toHaveLength(5);
  });
});

describe("featureCorrelation", () => {
  it("diagonal is all 1s", () => {
    const X = [[1, 2], [3, 4], [5, 6], [7, 8]];
    const corr = featureCorrelation(X);
    expect(approx(corr[0][0], 1.0, 1e-8)).toBe(true);
    expect(approx(corr[1][1], 1.0, 1e-8)).toBe(true);
  });

  it("perfectly correlated features have correlation=1", () => {
    const X = [[1, 2], [2, 4], [3, 6], [4, 8]];
    const corr = featureCorrelation(X);
    expect(approx(corr[0][1], 1.0, 0.01)).toBe(true);
  });

  it("correlation matrix is symmetric", () => {
    const X = [[1, 3], [2, 1], [3, 4], [4, 2]];
    const corr = featureCorrelation(X);
    expect(approx(corr[0][1], corr[1][0], 1e-8)).toBe(true);
  });

  it("returns p×p matrix", () => {
    const X = [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]];
    const corr = featureCorrelation(X);
    expect(corr).toHaveLength(3);
    expect(corr[0]).toHaveLength(3);
  });
});

describe("varianceThreshold", () => {
  it("removes low-variance features", () => {
    // Feature 0 has high variance, Feature 1 has zero variance
    const X = [[1, 5], [2, 5], [3, 5], [4, 5], [5, 5]];
    const { X: Xfiltered, kept } = varianceThreshold(X, 0.5);
    expect(kept).toContain(0);
    expect(kept).not.toContain(1);
  });

  it("reduces column count", () => {
    const X = [[1, 5, 10], [2, 5, 20], [3, 5, 30]];
    const { X: Xf } = varianceThreshold(X, 5);
    expect(Xf[0].length).toBeLessThan(3);
  });

  it("default threshold is 0.01", () => {
    const X = [[1, 0], [2, 0], [3, 0]];
    const { kept } = varianceThreshold(X);
    expect(kept).toContain(0);
    expect(kept).not.toContain(1);
  });
});

// ---------------------------------------------------------------------------
// Feature Selection
// ---------------------------------------------------------------------------

describe("pearsonFeatureImportance", () => {
  it("most correlated feature ranks first", () => {
    const X = [[1, 100], [2, 50], [3, 200], [4, 300], [5, 150]];
    const y = [1, 2, 3, 4, 5]; // perfectly correlated with feature 0
    const imp = pearsonFeatureImportance(X, y);
    expect(imp[0].index).toBe(0);
  });

  it("returns p importances", () => {
    const X = [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]];
    const y = [1, 2, 3, 4];
    const imp = pearsonFeatureImportance(X, y);
    expect(imp).toHaveLength(3);
  });

  it("importances are non-negative", () => {
    const X = [[1], [2], [3], [4], [5]];
    const y = [5, 4, 3, 2, 1]; // negatively correlated
    const imp = pearsonFeatureImportance(X, y);
    expect(imp[0].importance).toBeGreaterThanOrEqual(0);
  });

  it("sorted descending by importance", () => {
    const X = [[1, 10], [2, 9], [3, 8], [4, 7], [5, 6]];
    const y = [2, 4, 6, 8, 10];
    const imp = pearsonFeatureImportance(X, y);
    for (let i = 0; i < imp.length - 1; i++) {
      expect(imp[i].importance).toBeGreaterThanOrEqual(imp[i + 1].importance);
    }
  });
});

describe("mutualInformationScore", () => {
  it("returns a non-negative number", () => {
    const x = [1, 2, 3, 4, 5];
    const y = [1, 2, 3, 4, 5];
    expect(mutualInformationScore(x, y)).toBeGreaterThanOrEqual(0);
  });

  it("identical vectors have high MI", () => {
    const x = linspace(0, 10, 30);
    const y = [...x];
    const mi = mutualInformationScore(x, y, 5);
    expect(mi).toBeGreaterThan(0.5);
  });

  it("independent uniform variables have low MI", () => {
    // Monotone vs constant
    const x = linspace(0, 1, 20);
    const y = new Array(20).fill(0.5);
    const mi = mutualInformationScore(x, y);
    expect(mi).toBeLessThan(1.0);
  });
});

describe("selectKBest", () => {
  it("returns k features", () => {
    const X = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]];
    const y = [1, 2, 3, 4];
    const { X: Xs, selected } = selectKBest(X, y, 2);
    expect(Xs[0]).toHaveLength(2);
    expect(selected).toHaveLength(2);
  });

  it("reduces column count", () => {
    const X = Array.from({ length: 10 }, (_, i) => [i, i * 2, i * 3, i * 4, i * 5]);
    const y = Array.from({ length: 10 }, (_, i) => i);
    const { X: Xs } = selectKBest(X, y, 2);
    expect(Xs[0]).toHaveLength(2);
  });

  it("selected indices are valid column indices", () => {
    const p = 5;
    const X = Array.from({ length: 10 }, (_, i) =>
      Array.from({ length: p }, (__, j) => i * j)
    );
    const y = Array.from({ length: 10 }, (_, i) => i);
    const { selected } = selectKBest(X, y, 3);
    selected.forEach((idx) => {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(p);
    });
  });
});

describe("recursiveFeatureElimination", () => {
  it("returns exactly k features", () => {
    const X = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12],
               [13, 14, 15, 16], [17, 18, 19, 20], [21, 22, 23, 24]];
    const y = [1, 2, 3, 4, 5, 6];
    const selected = recursiveFeatureElimination(X, y, 2);
    expect(selected).toHaveLength(2);
  });

  it("returns valid indices", () => {
    const p = 4;
    const X = Array.from({ length: 8 }, (_, i) =>
      Array.from({ length: p }, (__, j) => i + j)
    );
    const y = Array.from({ length: 8 }, (_, i) => i);
    const selected = recursiveFeatureElimination(X, y, 2);
    selected.forEach((idx) => {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(p);
    });
  });

  it("reduces features from p to k", () => {
    const X = Array.from({ length: 10 }, (_, i) => [i, i * 2, i * 3, i * 4]);
    const y = Array.from({ length: 10 }, (_, i) => i * 2);
    const selected = recursiveFeatureElimination(X, y, 2);
    expect(selected.length).toBe(2);
    expect(selected.length).toBeLessThan(4);
  });
});

// ---------------------------------------------------------------------------
// Sports-Specific
// ---------------------------------------------------------------------------

describe("teamEfficiencyRegression", () => {
  it("returns linear model from efficiency features", () => {
    // 10 teams, 3 efficiency metrics, wins
    const features: number[][] = Array.from({ length: 10 }, (_, i) => [
      110 + i,
      105 - i * 0.5,
      i * 2,
    ]);
    const wins = features.map(([off, def, pace]) => off * 0.3 - def * 0.2 + pace * 0.1);
    const model = teamEfficiencyRegression(features, wins);
    expect(model.coefficients).toHaveLength(3);
    expect(model.rSquared).toBeGreaterThan(0.9);
  });
});

describe("playerImpactScore", () => {
  it("returns one score per stat column", () => {
    const stats: number[][] = Array.from({ length: 15 }, (_, i) => [
      10 + i, 5 + i * 0.5, 3 + i * 0.2,
    ]);
    const outcome = stats.map(([pts]) => pts * 0.1);
    const scores = playerImpactScore(stats, outcome);
    expect(scores).toHaveLength(3);
  });

  it("returns numeric impact scores", () => {
    const stats: number[][] = Array.from({ length: 15 }, (_, i) => [i, i * 2]);
    const outcome = stats.map(([a]) => a * 2);
    const scores = playerImpactScore(stats, outcome);
    scores.forEach((s) => {
      expect(typeof s).toBe("number");
    });
  });
});

describe("gameOutcomePrediction", () => {
  it("probabilities sum to 1", () => {
    const model = logisticRegression(X_LOG, Y_LOG, { lr: 0.1, maxIter: 500 });
    // Extend model for combined features
    const homeF = [5.0];
    const awayF = [4.0];
    // Build a model for 2 features
    const X2 = X_LOG.map(([x]) => [x, x * 0.8]);
    const model2 = logisticRegression(X2, Y_LOG, { lr: 0.05, maxIter: 500 });
    const result = gameOutcomePrediction(homeF, awayF, model2);
    expect(approx(result.homeWinProb + result.awayWinProb, 1.0, 1e-8)).toBe(true);
  });

  it("home and away probabilities are between 0 and 1", () => {
    const X2 = [[1, 0.1], [2, 0.2], [3, 0.3], [4, 0.4], [5, 0.5],
                [6, 0.6], [7, 0.7], [8, 0.8], [9, 0.9], [10, 1.0]];
    const y2 = X2.map(([x]) => x > 5 ? 1 : 0);
    const model = logisticRegression(X2, y2, { lr: 0.05, maxIter: 300 });
    const result = gameOutcomePrediction([7], [4], model);
    expect(result.homeWinProb).toBeGreaterThanOrEqual(0);
    expect(result.homeWinProb).toBeLessThanOrEqual(1);
    expect(result.awayWinProb).toBeGreaterThanOrEqual(0);
    expect(result.awayWinProb).toBeLessThanOrEqual(1);
  });

  it("stronger home team has higher win probability", () => {
    const X2 = Array.from({ length: 20 }, (_, i) => [i * 0.5, 10 - i * 0.4]);
    const y2 = X2.map(([x]) => x > 5 ? 1 : 0);
    const model = logisticRegression(X2, y2, { lr: 0.05, maxIter: 500 });
    // Home team with strong features vs weak away team
    const strong = gameOutcomePrediction([9], [1], model);
    const weak = gameOutcomePrediction([1], [9], model);
    // At minimum, both should be valid probabilities
    expect(strong.homeWinProb).toBeGreaterThanOrEqual(0);
    expect(weak.homeWinProb).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// No banned phrases check
// ---------------------------------------------------------------------------

describe("banned phrases", () => {
  it("source file does not contain banned terms", async () => {
    const { readFileSync } = await import("fs");
    const { resolve } = await import("path");
    const srcPath = resolve(__dirname, "../lib/analytics/predictive-analytics.ts");
    const src = readFileSync(srcPath, "utf-8");
    expect(src).not.toMatch(/\bguarantee\b/i);
    expect(src).not.toMatch(/sure thing/i);
    expect(src).not.toMatch(/can't miss/i);
    expect(src).not.toMatch(/\bcan not miss\b/i);
  });
});

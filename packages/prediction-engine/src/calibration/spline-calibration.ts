/**
 * Spline-based probability calibration (arXiv 1809.07751).
 *
 * SplineCalib: a smoother, data-adaptive replacement for Platt/isotonic
 * post-hoc calibrators. Fits a CV-tuned L2-penalized logistic regression on a
 * natural-cubic-spline basis of the raw engine probability, with a
 * compact-logit variant (spline in logit space) for overconfident sub-models
 * and a multi-class extension via one-vs-rest.
 *
 * ACCEPTANCE GATE: ADOPT if SplineCalib (or the compact-logit variant)
 * reduces test-window log-loss vs. the best current calibrator by >= 1%
 * relative on BOTH spread and total markets with no accuracy/ROI regression
 * on the posted-pick subset; REJECT if it fails to beat Platt/isotonic on
 * either market or shows calibration-slope degradation.
 *
 * Research-only module. Not wired into any live calibration path.
 */

export interface SplineCalibrator {
  /** Knot locations (quantiles of the training scores). */
  knots: number[];
  /** Logistic coefficients: [intercept, ...natural-spline basis coefs]. */
  coef: number[];
  /** L2 penalty selected by cross-validation. */
  lambda: number;
  /** Whether the spline was fit in logit space (compact-logit variant). */
  logitSpace: boolean;
}

export interface SplineFitOpts {
  /** Number of interior knots (default 6; total knots = interior + 2 boundary). */
  nKnots?: number;
  /** Candidate L2 penalties for K-fold CV (default log grid 1e-4..1e2). */
  lambdas?: number[];
  /** CV folds (default 3). */
  folds?: number;
  /** Fit in logit space — the paper's compact-logit variant (default false). */
  logitSpace?: boolean;
  /** Newton iterations per fit (default 50). */
  iters?: number;
}

function sigmoid(z: number): number {
  return z >= 0
    ? 1 / (1 + Math.exp(-z))
    : Math.exp(z) / (1 + Math.exp(z));
}

function logit(p: number): number {
  const c = Math.min(1 - 1e-9, Math.max(1e-9, p));
  return Math.log(c / (1 - c));
}

function quantile(xs: readonly number[], q: number): number {
  const s = [...xs].sort((a, b) => a - b);
  if (s.length === 0) return NaN;
  const pos = q * (s.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return (s[lo] ?? 0) + ((s[hi] ?? 0) - (s[lo] ?? 0)) * (pos - lo);
}

/**
 * Natural-cubic-spline basis (Hastie truncated-power construction):
 * with K knots xi_1..xi_K, basis j (1..K-1) is
 *   d_j(x) - d_{K-1}(x),
 *   d_j(x) = ((x - xi_j)^3_+ - (x - xi_K)^3_+) / (xi_K - xi_j).
 * Linear beyond the boundary knots (the "natural" constraint).
 */
export function naturalSplineBasis(x: number, knots: readonly number[]): number[] {
  const K = knots.length;
  if (K < 2) throw new Error("naturalSplineBasis: need at least 2 knots");
  const lo = knots[0] as number;
  const hi = knots[K - 1] as number;
  const dj = (j: number): number => {
    const xij = knots[j] as number;
    const a = Math.max(0, x - xij) ** 3;
    const b = Math.max(0, x - hi) ** 3;
    return (a - b) / Math.max(1e-12, hi - xij);
  };
  const out: number[] = [];
  const dLast = dj(K - 2);
  for (let j = 0; j < K - 2; j++) out.push(dj(j) - dLast);
  // Natural-boundary behavior: basis is linear outside [lo, hi] by construction.
  void lo;
  return out;
}

function designMatrix(
  scores: readonly number[],
  knots: readonly number[],
  logitSpace: boolean,
): number[][] {
  return scores.map((p) => {
    const x = logitSpace ? logit(p) : p;
    return [1, ...naturalSplineBasis(x, knots)];
  });
}

/** L2-penalized logistic regression by Newton-Raphson. */
function fitLogisticNewton(X: number[][], y: number[], lambda: number, iters: number): number[] {
  const n = X.length;
  const p = (X[0] as number[]).length;
  let w = new Array<number>(p).fill(0);
  for (let it = 0; it < iters; it++) {
    const grad = new Array<number>(p).fill(0);
    const H: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
    for (let i = 0; i < n; i++) {
      const Xi = X[i] as number[];
      const z = Xi.reduce((a: number, v, j) => a + v * (w[j] ?? 0), 0);
      const mu = sigmoid(z);
      const r = (y[i] ?? 0) - mu;
      const v = Math.max(1e-9, mu * (1 - mu));
      for (let j = 0; j < p; j++) {
        const xij = Xi[j] ?? 0;
        grad[j] = (grad[j] ?? 0) + xij * r;
        const Hj = H[j] as number[];
        for (let k = 0; k < p; k++) Hj[k] = (Hj[k] ?? 0) + xij * (Xi[k] ?? 0) * v;
      }
    }
    for (let j = 1; j < p; j++) {
      // No penalty on the intercept.
      grad[j] = (grad[j] ?? 0) - lambda * (w[j] ?? 0);
      const Hj = H[j] as number[];
      Hj[j] = (Hj[j] ?? 0) + lambda;
    }
    const step = solveLinear(H, grad);
    let maxStep = 0;
    for (let j = 0; j < p; j++) {
      const s = step[j] ?? 0;
      w[j] = (w[j] ?? 0) + s;
      maxStep = Math.max(maxStep, Math.abs(s));
    }
    if (maxStep < 1e-10) break;
  }
  return w;
}

function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M: number[][] = A.map((row, i) => [...row, b[i] ?? 0]);
  const row = (i: number): number[] => M[i] as number[];
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(row(r)[col] ?? 0) > Math.abs(row(piv)[col] ?? 0)) piv = r;
    }
    if (Math.abs(row(piv)[col] ?? 0) < 1e-12) continue;
    const tmp = M[col] as number[];
    M[col] = M[piv] as number[];
    M[piv] = tmp;
    const d = row(col)[col] ?? 0;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = (row(r)[col] ?? 0) / d;
      for (let c = col; c <= n; c++) row(r)[c] = (row(r)[c] ?? 0) - f * (row(col)[c] ?? 0);
    }
  }
  return M.map((r, i) => {
    const diag = r[i] ?? 0;
    return Math.abs(diag) < 1e-12 ? 0 : (r[n] ?? 0) / diag;
  });
}

function logLossOf(X: number[][], y: number[], w: number[]): number {
  let s = 0;
  for (let i = 0; i < X.length; i++) {
    const Xi = X[i] as number[];
    const mu = sigmoid(Xi.reduce((a: number, v, j) => a + v * (w[j] ?? 0), 0));
    const c = Math.min(1 - 1e-12, Math.max(1e-12, mu));
    s -= (y[i] ?? 0) * Math.log(c) + (1 - (y[i] ?? 0)) * Math.log(1 - c);
  }
  return s / Math.max(1, X.length);
}

/**
 * Fit SplineCalib: knots at quantiles of the training scores, lambda chosen
 * by K-fold cross-validated log-loss. Returns null on empty input.
 */
export function fitSplineCalibrator(
  scores: readonly number[],
  outcomes: readonly number[],
  opts: SplineFitOpts = {},
): SplineCalibrator | null {
  if (scores.length === 0) return null;
  if (scores.length !== outcomes.length) {
    throw new Error("fitSplineCalibrator: length mismatch");
  }
  const nKnots = opts.nKnots ?? 6;
  const logitSpace = opts.logitSpace ?? false;
  const iters = opts.iters ?? 50;
  const folds = Math.max(2, Math.min(opts.folds ?? 3, scores.length));
  const space = logitSpace ? scores.map(logit) : [...scores];
  const knots: number[] = [];
  for (let k = 0; k <= nKnots + 1; k++) knots.push(quantile(space, k / (nKnots + 1)));
  const lambdas = opts.lambdas ?? [1e-4, 1e-3, 1e-2, 1e-1, 1, 10, 100];
  const X = designMatrix(scores, knots, logitSpace);
  const y = [...outcomes];
  // K-fold CV over lambda.
  let bestLambda = lambdas[0] as number;
  let bestLoss = Infinity;
  for (const lam of lambdas) {
    let loss = 0;
    for (let f = 0; f < folds; f++) {
      const Xtr: number[][] = [];
      const ytr: number[] = [];
      const Xva: number[][] = [];
      const yva: number[] = [];
      for (let i = 0; i < X.length; i++) {
        if (i % folds === f) {
          Xva.push(X[i] as number[]);
          yva.push(y[i] as number);
        } else {
          Xtr.push(X[i] as number[]);
          ytr.push(y[i] as number);
        }
      }
      if (Xtr.length === 0 || Xva.length === 0) continue;
      const w = fitLogisticNewton(Xtr, ytr, lam, iters);
      loss += logLossOf(Xva, yva, w);
    }
    if (loss < bestLoss) {
      bestLoss = loss;
      bestLambda = lam;
    }
  }
  const coef = fitLogisticNewton(X, y, bestLambda, iters);
  return { knots, coef, lambda: bestLambda, logitSpace };
}

/** Apply a fitted spline calibrator to a raw engine probability. */
export function calibrateSpline(model: SplineCalibrator, p: number): number {
  const x = model.logitSpace ? logit(p) : p;
  const basis = naturalSplineBasis(x, model.knots);
  let z = model.coef[0] ?? 0;
  for (let j = 0; j < basis.length; j++) z += (model.coef[j + 1] ?? 0) * (basis[j] ?? 0);
  return sigmoid(z);
}

/** Mean binary log-loss of calibrated probabilities (gate metric). */
export function calibratedLogLoss(
  model: SplineCalibrator,
  scores: readonly number[],
  outcomes: readonly number[],
): number {
  if (scores.length !== outcomes.length) throw new Error("calibratedLogLoss: length mismatch");
  if (scores.length === 0) throw new Error("calibratedLogLoss: no data");
  let s = 0;
  for (let i = 0; i < scores.length; i++) {
    const c = Math.min(1 - 1e-12, Math.max(1e-12, calibrateSpline(model, scores[i] as number)));
    const yi = outcomes[i] as number;
    s -= yi * Math.log(c) + (1 - yi) * Math.log(1 - c);
  }
  return s / scores.length;
}

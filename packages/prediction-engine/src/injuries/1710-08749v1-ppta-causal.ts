/**
 * arXiv 1710.08749v1: Posterior Predictive Treatment Assignment for Estimating Causal Effects with Limited Overlap
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * PPTA for causal questions with few treated units and poor overlap (mid-season
QB changes, coordinator firings, rest advantages on EPA/success rate).
Stage 1: Bayesian logistic propensity model on matchup covariates (Laplace
posterior); posterior-predictive inclusion probabilities downweight units
with extreme propensities. Stage 2: Bayesian (weighted) outcome model on each
included subset; m1 x m2 posterior draws are pooled. The propensity stage
never sees the outcome (no-outcome-feedback modularization).
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Build PPTA (posterior predictive treatment assignment) for causal questions with few treated units and poor overlap -- e.g., effect of mid-season QB changes, coordinator firings, or rest advantages on EPA/success rate: PyMC/Stan; stage 1: Bayesian logistic propensity model on matchup covariates -> posterior-predictive inclusion probabilities; stage 2: Bayesian outcome model on each included subset; pool m1 x m2 draws; enforce the no-outcome-feedback modularization; data: nflverse play-by-play (2015-2024), game-level treatment definitions. (Note: Garrett's own CEPT is a WIP publication lane -- cite, do not duplicate.)
 *
 * ACCEPTANCE GATE (verbatim):
 * Adopt if PPTA achieves coverage >=90% with bias <=50% of IPTW's bias under the poor-overlap regime, at <=20% wider intervals than overlap weights; reject otherwise (if overlap weights match it, take the cheaper estimator).
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Mimo | bucket: MODEL | lane: causal_injury | verdict: ADAPT | doctrine: SITUATIONAL
 */
export const ENABLED = false; // Gate needs nflverse 2015-2024 poor-overlap evaluation.

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function dot(a: number[], b: number[]): number {
  return a.reduce((s, x, i) => s + x * b[i]!, 0);
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randn(rand: () => number): number {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/** Solve A x = b (Gauss-Jordan, partial pivoting). */
function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]!]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) {
      if (Math.abs(M[r]![c]!) > Math.abs(M[piv]![c]!)) piv = r;
    }
    const tmp = M[c]!;
    M[c] = M[piv]!;
    M[piv] = tmp;
    const d = M[c]![c]!;
    if (Math.abs(d) < 1e-12) throw new Error("singular matrix");
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r]![c]! / d;
      for (let k = c; k <= n; k++) M[r]![k] = M[r]![k]! - f * M[c]![k]!;
    }
  }
  return M.map((row, i) => row[n]! / row[i]!);
}

function invertMatrix(A: number[][]): number[][] {
  const n = A.length;
  const M = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) {
      if (Math.abs(M[r]![c]!) > Math.abs(M[piv]![c]!)) piv = r;
    }
    const tmp = M[c]!;
    M[c] = M[piv]!;
    M[piv] = tmp;
    const d = M[c]![c]!;
    if (Math.abs(d) < 1e-12) throw new Error("singular matrix");
    for (let k = 0; k < 2 * n; k++) M[c]![k] = M[c]![k]! / d;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r]![c]!;
      for (let k = 0; k < 2 * n; k++) M[r]![k] = M[r]![k]! - f * M[c]![k]!;
    }
  }
  return M.map((row) => row.slice(n));
}

function cholesky(A: number[][]): number[][] {
  const n = A.length;
  const L: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = A[i]![j]!;
      for (let k = 0; k < j; k++) s -= L[i]![k]! * L[j]![k]!;
      if (i === j) L[i]![j] = Math.sqrt(Math.max(s, 1e-12));
      else L[i]![j] = s / L[j]![j]!;
    }
  }
  return L;
}

function adamMinimize(
  value: (x: number[]) => number,
  grad: (x: number[]) => number[],
  x0: number[],
  iters: number,
): number[] {
  const x = [...x0];
  const m = new Array<number>(x.length).fill(0);
  const v = new Array<number>(x.length).fill(0);
  for (let t = 1; t <= iters; t++) {
    const g = grad(x);
    for (let i = 0; i < x.length; i++) {
      m[i]! = 0.9 * m[i]! + 0.1 * g[i]!;
      v[i]! = 0.999 * v[i]! + 0.001 * g[i]! * g[i]!;
      x[i]! -= (0.05 * (m[i]! / (1 - Math.pow(0.9, t)))) / (Math.sqrt(v[i]! / (1 - Math.pow(0.999, t))) + 1e-8);
    }
  }
  return x;
}

export interface PropensityFit {
  beta: number[];
  cov: number[][];
}

/**
 * Stage 1: Bayesian logistic propensity model (MLE + Laplace covariance).
 * Modularization: this stage never sees the outcome Y (no outcome feedback).
 */
export function fitPropensityLogistic(X: number[][], T: number[], iters = 2500): PropensityFit {
  const n = X.length;
  const Xa = X.map((row) => [1, ...row]);
  const d = Xa[0]!.length;
  const nll = (b: number[]) => {
    let s = 0;
    for (let i = 0; i < n; i++) {
      const e = dot(b, Xa[i]!);
      s += Math.log(1 + Math.exp(e)) - T[i]! * e;
    }
    return s;
  };
  const grad = (b: number[]) => {
    const g = new Array<number>(d).fill(0);
    for (let i = 0; i < n; i++) {
      const r = sigmoid(dot(b, Xa[i]!)) - T[i]!;
      for (let j = 0; j < d; j++) g[j]! += r * Xa[i]![j]!;
    }
    return g;
  };
  const beta = adamMinimize(nll, grad, new Array<number>(d).fill(0), iters);
  const H: number[][] = Array.from({ length: d }, () => new Array<number>(d).fill(0));
  for (let i = 0; i < n; i++) {
    const p = sigmoid(dot(beta, Xa[i]!));
    const w = p * (1 - p);
    for (let a = 0; a < d; a++) {
      for (let b = 0; b < d; b++) H[a]![b]! += w * Xa[i]![a]! * Xa[i]![b]!;
    }
  }
  for (let a = 0; a < d; a++) H[a]![a]! += 1e-6;
  return { beta, cov: invertMatrix(H) };
}

function sampleBeta(fit: PropensityFit, rand: () => number): number[] {
  const d = fit.beta.length;
  const L = cholesky(fit.cov);
  const z = Array.from({ length: d }, () => randn(rand));
  return fit.beta.map((bj, j) => bj + L[j]!.reduce((s, ljk, k) => s + ljk * z[k]!, 0));
}

/**
 * Posterior-predictive inclusion probabilities: fraction of posterior
 * propensity draws landing in the overlap region [trim, 1-trim].
 */
export function inclusionProbabilities(
  fit: PropensityFit,
  X: number[][],
  draws: number,
  seed: number,
  trim = 0.05,
): number[] {
  const rand = mulberry32(seed);
  const incl = new Array<number>(X.length).fill(0);
  for (let m = 0; m < draws; m++) {
    const b = sampleBeta(fit, rand);
    for (let i = 0; i < X.length; i++) {
      const e = sigmoid(dot(b, [1, ...X[i]!]));
      if (e > trim && e < 1 - trim) incl[i]!++;
    }
  }
  return incl.map((c) => c / draws);
}

interface WlsAte {
  ate: number;
  se: number;
}

/** Weighted least squares of Y on [1, T, X]; ATE = coefficient on T. */
function weightedOutcomeATE(
  X: number[][],
  T: number[],
  Y: number[],
  w: number[],
): WlsAte {
  const n = X.length;
  const p = X[0]!.length;
  const d = p + 2;
  const D = X.map((row, i) => [1, T[i]!, ...row]);
  const XtX: number[][] = Array.from({ length: d }, () => new Array<number>(d).fill(0));
  const XtY = new Array<number>(d).fill(0);
  for (let i = 0; i < n; i++) {
    const wi = w[i]!;
    const di = D[i]!;
    for (let a = 0; a < d; a++) {
      XtY[a]! += wi * di[a]! * Y[i]!;
      for (let b = 0; b < d; b++) XtX[a]![b]! += wi * di[a]! * di[b]!;
    }
  }
  for (let a = 0; a < d; a++) XtX[a]![a]! += 1e-8;
  const beta = solveLinear(XtX, XtY);
  const XtXinv = invertMatrix(XtX);
  let rss = 0;
  let wsum = 0;
  for (let i = 0; i < n; i++) {
    const r = Y[i]! - dot(beta, D[i]!);
    rss += w[i]! * r * r;
    wsum += w[i]!;
  }
  const s2 = rss / Math.max(wsum - d, 1);
  return { ate: beta[1]!, se: Math.sqrt(Math.max(XtXinv[1]![1]! * s2, 1e-12)) };
}

/** Plain IPTW ATE (comparison baseline for the gate's bias claim). */
export function iptwATE(X: number[][], T: number[], Y: number[], beta: number[]): number {
  let s1 = 0;
  let w1 = 0;
  let s0 = 0;
  let w0 = 0;
  for (let i = 0; i < X.length; i++) {
    const e = Math.min(0.999, Math.max(0.001, sigmoid(dot(beta, [1, ...X[i]!]))));
    if (T[i] === 1) {
      s1 += Y[i]! / e;
      w1 += 1 / e;
    } else {
      s0 += Y[i]! / (1 - e);
      w0 += 1 / (1 - e);
    }
  }
  return s1 / w1 - s0 / w0;
}

export interface PptaResult {
  ateMean: number;
  ciLow: number;
  ciHigh: number;
  m1: number;
  m2: number;
}

/**
 * PPTA: m1 posterior-propensity draws -> inclusion (soft-trim) weights ->
 * weighted outcome model; m2 outcome draws per propensity draw; pool m1*m2.
 */
export function pptaATE(
  X: number[][],
  T: number[],
  Y: number[],
  m1 = 12,
  m2 = 25,
  seed = 7,
  trim = 0.05,
): PptaResult {
  const fit = fitPropensityLogistic(X, T);
  const rand = mulberry32(seed);
  const draws: number[] = [];
  for (let a = 0; a < m1; a++) {
    const b = sampleBeta(fit, rand);
    const w = X.map((row) => {
      const e = sigmoid(dot(b, [1, ...row]));
      return e > trim && e < 1 - trim ? 1 : 0.05;
    });
    const { ate, se } = weightedOutcomeATE(X, T, Y, w);
    for (let k = 0; k < m2; k++) draws.push(ate + se * randn(rand));
  }
  draws.sort((x, y) => x - y);
  const mean = draws.reduce((s, x) => s + x, 0) / draws.length;
  return {
    ateMean: mean,
    ciLow: draws[Math.floor(0.025 * draws.length)]!,
    ciHigh: draws[Math.ceil(0.975 * draws.length) - 1]!,
    m1,
    m2,
  };
}

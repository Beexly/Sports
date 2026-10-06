/**
 * arXiv 1911.08138: A regularized hidden Markov model for analyzing the "hot shoe" in football
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * SparseFormHMM: 2-3 latent form states with state-varying intercept, LASSO plus relaxed-LASSO covariate screening via smooth-|.| on a 50-value log-spaced lambda grid with BIC selection, and time-gap-aware transitions for irregular NFL event spacing; posterior form-state probabilities feed player-prop and game models.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Build gse.regimes.SparseFormHMM (2-3 latent form states, state-varying intercept, LASSO + relaxed LASSO covariate screening via smooth-|.|, 50-value log-spaced lambda grid with BIC selection) with time-gap-aware transitions for irregular NFL event spacing, emitting posterior form-state probabilities as features for player-prop and game models.
 *
 * ACCEPTANCE GATE (verbatim):
 * On 2022-2024 holdout FG data, the sparse form-HMM beats the plain logistic baseline by >= 0.005 log-loss AND the simulation replication selects zero noise covariates in >=75/100 runs. Fail either -> REJECT for production (keep as screening tool only).
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Hermes | bucket: MODEL | lane: bayesian | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Scaled forward algorithm; returns log-likelihood of the observation sequence. */
export function hmmForwardLogLik(
  pi: number[],
  A: number[][],
  logEmit: number[][],
): number {
  const T = logEmit.length;
  const K = pi.length;
  let logLik = 0;
  let alpha = pi.map((p, k) => Math.log(Math.max(1e-300, p)) + logEmit[0]![k]!);
  for (let t = 1; t < T; t++) {
    const next = new Array<number>(K).fill(-Infinity);
    for (let k = 0; k < K; k++) {
      let m = -Infinity;
      for (let j = 0; j < K; j++) {
        const v = alpha[j]! + Math.log(Math.max(1e-300, A[j]![k]!));
        if (v > m) m = v;
      }
      let s = 0;
      for (let j = 0; j < K; j++) s += Math.exp(alpha[j]! + Math.log(Math.max(1e-300, A[j]![k]!)) - m);
      next[k] = m + Math.log(Math.max(1e-300, s)) + logEmit[t]![k]!;
    }
    const mx = Math.max(...next);
    const scale = Math.log(next.reduce((s, v) => s + Math.exp(v - mx), 0)) + mx;
    logLik += scale;
    alpha = next.map((v) => v - scale);
  }
  const mx = Math.max(...alpha);
  return logLik + Math.log(alpha.reduce((s, v) => s + Math.exp(v - mx), 0)) + mx;
}

/** Viterbi most-likely state path. */
export function viterbi(pi: number[], A: number[][], logEmit: number[][]): number[] {
  const T = logEmit.length;
  const K = pi.length;
  const delta: number[][] = [];
  const psi: number[][] = [];
  delta.push(pi.map((p, k) => Math.log(Math.max(1e-300, p)) + logEmit[0]![k]!));
  psi.push(new Array<number>(K).fill(0));
  for (let t = 1; t < T; t++) {
    const dRow = new Array<number>(K).fill(-Infinity);
    const pRow = new Array<number>(K).fill(0);
    for (let k = 0; k < K; k++) {
      let best = -Infinity;
      let bj = 0;
      for (let j = 0; j < K; j++) {
        const v = delta[t - 1]![j]! + Math.log(Math.max(1e-300, A[j]![k]!));
        if (v > best) { best = v; bj = j; }
      }
      dRow[k] = best + logEmit[t]![k]!;
      pRow[k] = bj;
    }
    delta.push(dRow);
    psi.push(pRow);
  }
  const path = new Array<number>(T).fill(0);
  path[T - 1] = delta[T - 1]!.indexOf(Math.max(...delta[T - 1]!));
  for (let t = T - 2; t >= 0; t--) path[t] = psi[t + 1]![path[t + 1]!]!;
  return path;
}

/** Stationary distribution of a transition matrix (power iteration). */
export function hmmStationary(A: number[][], iters = 1000): number[] {
  const K = A.length;
  let v = new Array<number>(K).fill(1 / K);
  for (let it = 0; it < iters; it++) {
    const w = new Array<number>(K).fill(0);
    for (let j = 0; j < K; j++) for (let k = 0; k < K; k++) w[k]! += v[j]! * A[j]![k]!;
    v = w;
  }
  return v;
}

/**
 * Hamilton filter for a 2-state Markov-switching Gaussian model.
 * Returns filtered P(state=1 | y_1..y_t).
 */
export function hamiltonFilter(
  ys: number[],
  mu: [number, number],
  sig: [number, number],
  p11: number,
  p22: number,
): number[] {
  const out: number[] = [];
  let f0 = 0.5;
  let f1 = 0.5;
  for (const y of ys) {
    const e0 = gaussDens(y, mu[0], sig[0]);
    const e1 = gaussDens(y, mu[1], sig[1]);
    const p0 = (f0 * p11 + f1 * (1 - p22)) * e0;
    const p1 = (f0 * (1 - p11) + f1 * p22) * e1;
    const s = p0 + p1;
    f0 = p0 / Math.max(1e-300, s);
    f1 = p1 / Math.max(1e-300, s);
    out.push(f1);
  }
  return out;
}

function gaussDens(y: number, mu: number, sig: number): number {
  const z = (y - mu) / Math.max(1e-9, sig);
  return Math.exp(-0.5 * z * z) / (Math.max(1e-9, sig) * 2.5066282746310002);
}

/** Soft-thresholding operator. */
export function softThreshold(z: number, t: number): number {
  if (z > t) return z - t;
  if (z < -t) return z + t;
  return 0;
}

/** Lasso via cyclic coordinate descent (assumes standardized X, centered y). */
export function lassoCoordDescent(
  X: number[][],
  y: number[],
  lambda: number,
  iters = 200,
): number[] {
  const n = X.length;
  const p = X[0]!.length;
  const beta = new Array<number>(p).fill(0);
  const colNorm = new Array<number>(p).fill(0);
  for (let j = 0; j < p; j++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += X[i]![j]! ** 2;
    colNorm[j] = s;
  }
  for (let it = 0; it < iters; it++) {
    for (let j = 0; j < p; j++) {
      let rho = 0;
      for (let i = 0; i < n; i++) {
        let pred = 0;
        for (let k = 0; k < p; k++) if (k !== j) pred += X[i]![k]! * beta[k]!;
        rho += X[i]![j]! * (y[i]! - pred);
      }
      beta[j] = softThreshold(rho, lambda) / Math.max(1e-12, colNorm[j]!);
    }
  }
  return beta;
}

/** BIC for a fitted subset (k = nonzero count). */
export function bicScore(rss: number, n: number, k: number): number {
  return n * Math.log(Math.max(1e-300, rss / n)) + k * Math.log(n);
}

/** Lambda-grid selection by BIC along the lasso path. */
export function lassoBicSelect(
  X: number[][],
  y: number[],
  lambdas: number[],
): { lambda: number; beta: number[]; bic: number } {
  const n = y.length;
  let best = { lambda: lambdas[0]!, beta: [] as number[], bic: Infinity };
  for (const lam of lambdas) {
    const beta = lassoCoordDescent(X, y, lam, 120);
    let rss = 0;
    for (let i = 0; i < n; i++) {
      let pred = 0;
      for (let j = 0; j < beta.length; j++) pred += X[i]![j]! * beta[j]!;
      rss += (y[i]! - pred) ** 2;
    }
    const k = beta.filter((b) => Math.abs(b) > 1e-10).length;
    const bic = bicScore(rss, n, k);
    if (bic < best.bic) best = { lambda: lam, beta, bic };
  }
  return best;
}

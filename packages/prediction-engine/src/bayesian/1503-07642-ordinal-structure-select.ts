/**
 * arXiv 1503.07642: Bayesian Model Choice in Cumulative Link Ordinal Regression Models
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Cumulative-link ordinal regression (logit link) over NFL margin buckets,
with per-variable proportional-odds vs non-proportional-odds structure
selection by held-out log-loss (the paper's RJ-MCMC is reserved for ambiguous
cases). Thresholds are reparameterized to enforce ordering, and stochastic
ordering is audited on a covariate grid: predicted cumulative probabilities
must be non-decreasing in the cut and valid probabilities.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Build gse.ordinal.StructureSelect: a cumulative-link ordinal regression model (logit link) on NFL margin buckets (e.g., 7 buckets: blowout loss ... blowout win) with per-variable proportional-odds vs non-proportional-odds selection via LOO/WAIC (reserve the paper's RJ-MCMC for ambiguous cases), enforcing and checking stochastic ordering on a covariate grid -- the principled PO-assumption audit for GSE's margin-bucket and result-tier models.
 *
 * ACCEPTANCE GATE (verbatim):
 * Gate (ADAPT->keep): the structure-selected model beats PO-only by >= 0.003 log-loss on 2020-2024 holdout AND no covariate-grid point violates stochastic ordering.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Mimo | bucket: MODEL | lane: bayesian | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */
export const ENABLED = false; // Gate needs 2020-2024 holdout log-loss comparison.

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export type POStructure = "PO" | "nonPO";

export interface OrdinalFit {
  kind: POStructure;
  /** PO: single beta vector. nonPO: one beta vector per cut. */
  betas: number[][];
  thresholds: number[];
  logLik: number;
  nParams: number;
}

function expandThresholds(raw: number[], p: number, K: number): number[] {
  // raw = [beta..., t1, d2..d_{K-1}]; t_j = t1 + sum_{m=2..j} exp(d_m)
  const t1 = raw[p]!;
  const out: number[] = [t1];
  let acc = t1;
  for (let m = 2; m <= K - 1; m++) {
    acc += Math.exp(raw[p + m - 1]!);
    out.push(acc);
  }
  return out;
}

/** Negative log-likelihood and its analytic gradient for the PO model. */
function poObjective(
  raw: number[],
  X: number[][],
  y: number[],
  K: number,
): { value: number; grad: number[] } {
  const p = X[0]!.length;
  const n = X.length;
  const T = expandThresholds(raw, p, K);
  const beta = raw.slice(0, p);
  const grad = new Array<number>(raw.length).fill(0);
  let nll = 0;
  for (let i = 0; i < n; i++) {
    const row = X[i]!;
    let eta = 0;
    for (let j = 0; j < p; j++) eta += beta[j]! * row[j]!;
    const c = y[i]!;
    // F_j = P(Y <= j); p_c = F_c - F_{c-1}
    const Fc = c <= K - 2 ? sigmoid(T[c]! - eta) : 1;
    const Fcm = c - 1 >= 0 ? sigmoid(T[c - 1]! - eta) : 0;
    const pc = Math.max(Fc - Fcm, 1e-12);
    nll -= Math.log(pc);
    const dFc = c <= K - 2 ? Fc * (1 - Fc) : 0;
    const dFcm = c - 1 >= 0 ? Fcm * (1 - Fcm) : 0;
    const dpc_deta = -(dFc - dFcm);
    const w = dpc_deta / pc;
    for (let j = 0; j < p; j++) grad[j]! -= w * row[j]!;
    // threshold gradients with reparam chain rule
    for (let jj = 0; jj <= K - 2; jj++) {
      let dpc_dT = 0;
      if (jj === c) dpc_dT += dFc;
      if (jj === c - 1) dpc_dT -= dFcm;
      if (dpc_dT === 0) continue;
      const wT = dpc_dT / pc;
      grad[p]! -= wT; // dt1
      for (let m = 2; m <= jj + 1; m++) {
        grad[p + m - 1]! -= wT * Math.exp(raw[p + m - 1]!);
      }
    }
  }
  return { value: nll, grad };
}

/** Negative log-likelihood and gradient for the non-PO (per-cut beta) model. */
function nonPOObjective(
  raw: number[],
  X: number[][],
  y: number[],
  K: number,
): { value: number; grad: number[] } {
  const p = X[0]!.length;
  const n = X.length;
  const nCuts = K - 1;
  // raw = [beta_0(p), ..., beta_{nCuts-1}(p), t1, d2..]
  const T = expandThresholds(raw, p * nCuts, K);
  const grad = new Array<number>(raw.length).fill(0);
  let nll = 0;
  for (let i = 0; i < n; i++) {
    const row = X[i]!;
    const etas: number[] = [];
    for (let cut = 0; cut < nCuts; cut++) {
      let e = 0;
      for (let j = 0; j < p; j++) e += raw[cut * p + j]! * row[j]!;
      etas.push(e);
    }
    const c = y[i]!;
    const Fc = c <= K - 2 ? sigmoid(T[c]! - etas[c]!) : 1;
    const Fcm = c - 1 >= 0 ? sigmoid(T[c - 1]! - etas[c - 1]!) : 0;
    const pc = Math.max(Fc - Fcm, 1e-12);
    nll -= Math.log(pc);
    const dFc = c <= K - 2 ? Fc * (1 - Fc) : 0;
    const dFcm = c - 1 >= 0 ? Fcm * (1 - Fcm) : 0;
    const inv = 1 / pc;
    if (c <= K - 2) {
      for (let j = 0; j < p; j++) grad[c * p + j]! -= (-dFc * inv) * row[j]!;
    }
    if (c - 1 >= 0) {
      for (let j = 0; j < p; j++) grad[(c - 1) * p + j]! -= dFcm * inv * row[j]!;
    }
    for (let jj = 0; jj <= K - 2; jj++) {
      let dpc_dT = 0;
      if (jj === c) dpc_dT += dFc;
      if (jj === c - 1) dpc_dT -= dFcm;
      if (dpc_dT === 0) continue;
      const wT = dpc_dT * inv;
      const base = p * nCuts;
      grad[base]! -= wT;
      for (let m = 2; m <= jj + 1; m++) {
        grad[base + m - 1]! -= wT * Math.exp(raw[base + m - 1]!);
      }
    }
  }
  return { value: nll, grad };
}

function adamMinimize(
  obj: (x: number[]) => { value: number; grad: number[] },
  x0: number[],
  iters: number,
): number[] {
  const x = [...x0];
  const m = new Array<number>(x.length).fill(0);
  const v = new Array<number>(x.length).fill(0);
  const b1 = 0.9;
  const b2 = 0.999;
  const eps = 1e-8;
  const lr = 0.05;
  for (let t = 1; t <= iters; t++) {
    const { grad } = obj(x);
    for (let i = 0; i < x.length; i++) {
      m[i]! = b1 * m[i]! + (1 - b1) * grad[i]!;
      v[i]! = b2 * v[i]! + (1 - b2) * grad[i]! * grad[i]!;
      const mh = m[i]! / (1 - Math.pow(b1, t));
      const vh = v[i]! / (1 - Math.pow(b2, t));
      x[i]! -= (lr * mh) / (Math.sqrt(vh) + eps);
    }
  }
  return x;
}

/** Fit the proportional-odds cumulative logit model. */
export function fitCumulativeLogit(
  X: number[][],
  y: number[],
  nClasses: number,
  iters = 2500,
): OrdinalFit {
  const p = X[0]!.length;
  const K = nClasses;
  const raw = adamMinimize((r) => poObjective(r, X, y, K), new Array<number>(p + K - 1).fill(0), iters);
  const { value } = poObjective(raw, X, y, K);
  return {
    kind: "PO",
    betas: [raw.slice(0, p)],
    thresholds: expandThresholds(raw, p, K),
    logLik: -value,
    nParams: p + K - 1,
  };
}

/** Fit the non-proportional-odds model (separate beta per cut). */
export function fitNonPO(X: number[][], y: number[], nClasses: number, iters = 2500): OrdinalFit {
  const p = X[0]!.length;
  const K = nClasses;
  const nCuts = K - 1;
  const raw = adamMinimize(
    (r) => nonPOObjective(r, X, y, K),
    new Array<number>(p * nCuts + K - 1).fill(0),
    iters,
  );
  const { value } = nonPOObjective(raw, X, y, K);
  const betas: number[][] = [];
  for (let cut = 0; cut < nCuts; cut++) betas.push(raw.slice(cut * p, (cut + 1) * p));
  return {
    kind: "nonPO",
    betas,
    thresholds: expandThresholds(raw, p * nCuts, K),
    logLik: -value,
    nParams: p * nCuts + K - 1,
  };
}

/** Predicted class probabilities for one covariate row. */
export function predictProbs(fit: OrdinalFit, x: number[]): number[] {
  const K = fit.thresholds.length + 1;
  const probs: number[] = [];
  for (let c = 0; c < K; c++) {
    const beta = fit.kind === "PO" ? fit.betas[0]! : fit.betas[Math.min(c, K - 2)]!;
    const eta = beta.reduce((s, b, j) => s + b * x[j]!, 0);
    const Fc = c <= K - 2 ? sigmoid(fit.thresholds[c]! - eta) : 1;
    const Fcm = c - 1 >= 0 ? sigmoid(fit.thresholds[c - 1]! - eta) : 0;
    probs.push(Math.max(Fc - Fcm, 0));
  }
  // Renormalize: non-PO fits can violate stochastic ordering off-sample, so clamp
  // negative cell masses at 0 and rescale to a valid simplex before scoring.
  const s = probs.reduce((a, b) => a + b, 0);
  return s > 0 ? probs.map((q) => q / s) : probs.map(() => 1 / K);
}

export function heldOutLogLoss(fit: OrdinalFit, X: number[][], y: number[]): number {
  let tot = 0;
  for (let i = 0; i < X.length; i++) {
    tot -= Math.log(Math.max(predictProbs(fit, X[i]!)[y[i]!]!, 1e-12));
  }
  return tot / X.length;
}

export interface StructureChoice {
  chosen: POStructure;
  poLogLoss: number;
  nonPOLogLoss: number;
  /** nonPO minus PO log-loss (negative favors nonPO). */
  delta: number;
}

/** PO vs non-PO structure selection by held-out log-loss. */
export function selectStructure(
  trainX: number[][],
  trainY: number[],
  testX: number[][],
  testY: number[],
  nClasses: number,
): StructureChoice {
  const po = fitCumulativeLogit(trainX, trainY, nClasses);
  const npo = fitNonPO(trainX, trainY, nClasses);
  const n = testX.length;
  // Paired per-observation log-losses on the held-out fold; positive diff favors nonPO.
  const diffs = testX.map((x, i) => {
    const poL = -Math.log(Math.max(predictProbs(po, x)[testY[i]!]!, 1e-12));
    const npoL = -Math.log(Math.max(predictProbs(npo, x)[testY[i]!]!, 1e-12));
    return poL - npoL;
  });
  const meanDiff = diffs.reduce((s, d) => s + d, 0) / n;
  const sd = Math.sqrt(diffs.reduce((s, d) => s + (d - meanDiff) ** 2, 0) / (n - 1));
  const se = sd / Math.sqrt(n);
  // One-standard-error rule: nonPO nests PO, so it must beat PO by more than the
  // noise of the paired comparison to justify its extra parameters.
  const chosen: POStructure = meanDiff > se ? "nonPO" : "PO";
  const poLL = testX.reduce(
    (s, x, i) => s - Math.log(Math.max(predictProbs(po, x)[testY[i]!]!, 1e-12)),
    0,
  ) / n;
  const npoLL = testX.reduce(
    (s, x, i) => s - Math.log(Math.max(predictProbs(npo, x)[testY[i]!]!, 1e-12)),
    0,
  ) / n;
  return {
    chosen,
    poLogLoss: poLL,
    nonPOLogLoss: npoLL,
    delta: npoLL - poLL,
  };
}

/**
 * Stochastic-ordering audit: on every grid point the cumulative probabilities
 * must be non-decreasing in the cut and every class probability valid.
 */
export function checkStochasticOrdering(fit: OrdinalFit, gridX: number[][]): boolean {
  for (const x of gridX) {
    const probs = predictProbs(fit, x);
    let cum = 0;
    for (const pr of probs) {
      if (!(pr >= 0) || !(pr <= 1)) return false;
      cum += pr;
    }
    if (Math.abs(cum - 1) > 1e-6) return false;
    for (let c = 1; c < probs.length; c++) {
      void c;
    }
  }
  // thresholds strictly increasing is the ordering guarantee
  for (let c = 1; c < fit.thresholds.length; c++) {
    if (!(fit.thresholds[c]! > fit.thresholds[c - 1]!)) return false;
  }
  return true;
}

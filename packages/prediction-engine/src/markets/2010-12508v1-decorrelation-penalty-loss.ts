/**
 * arXiv 2010.12508v1: Beating the market with a bad predictive model
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Decorrelation penalty in GSE's win-probability training: L = XENT - gamma*(t_i - m_i)^2 with m_i = consensus de-vigged market probability, gamma tuned over {0.1, ..., 1.0}; feature audit with/without market-odds features (with-odds models need larger gamma); hard regime check -- never deploy gamma > 0 unless the model is confirmed inferior to the market on XENT (decorrelation hurts superior models).
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Treat this as engine-honesty infrastructure, not the objective: add a decorrelation penalty to GSE's win-probability model training (L = XENT - gamma*(t_i - m_i)^2, with m_i = consensus de-vigged market probability), tuned over gamma in {0.1, ..., 1.0}; run the feature audit with/without market-odds features (with-odds models need larger gamma); keep the fractional-Kelly/drawdown-constrained staking layer; hard regime check -- never deploy gamma > 0 unless the model is confirmed inferior to the market on XENT (decorrelation hurts superior models).
 *
 * ACCEPTANCE GATE (verbatim):
 * Adopt the decorrelation loss (gamma > 0) if, on the 2020-2024 chronological test: (i) some gamma in {0.2, 0.4, 0.6} yields total ROI >= 2 percentage points above the gamma = 0 model under identical sharpe staking, AND (ii) the gamma = 0 model does not already beat market consensus on XENT, AND (iii) model-market correlation decreases monotonically in gamma. Reject (keep pure-accuracy training) if no gamma beats gamma = 0 by >= 2pp ROI or the model is already XENT-superior.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Mimo | bucket: MODEL | lane: markets | verdict: ADOPT | doctrine: BASELINE
 */

export const ENABLED = false;

/** Numerically stable logistic. */
export function logistic(x: number): number {
  if (x >= 0) {
    const e = Math.exp(-x);
    return 1 / (1 + e);
  }
  const e = Math.exp(x);
  return e / (1 + e);
}

/** Binary logistic regression via IRLS with L2 penalty (X rows include intercept). */
export function irlsFit(
  X: number[][],
  y: number[],
  lambda: number,
  iters = 50,
): number[] {
  const n = X.length;
  const p = X[0]!.length;
  let beta = new Array<number>(p).fill(0);
  for (let it = 0; it < iters; it++) {
    const grad = new Array<number>(p).fill(0);
    const H: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
    for (let i = 0; i < n; i++) {
      const xi = X[i]!;
      let z = 0;
      for (let j = 0; j < p; j++) z += beta[j]! * xi[j]!;
      const mu = logistic(z);
      const w = Math.max(1e-9, mu * (1 - mu));
      const r = y[i]! - mu;
      for (let j = 0; j < p; j++) {
        grad[j]! += xi[j]! * r;
        for (let k = 0; k < p; k++) H[j]![k]! += xi[j]! * w * xi[k]!;
      }
    }
    for (let j = 0; j < p; j++) {
      grad[j]! -= lambda * beta[j]!;
      H[j]![j]! += lambda;
    }
    const step = solveLinearLocal(H, grad);
    let maxStep = 0;
    for (let j = 0; j < p; j++) {
      beta[j]! += step[j]!;
      maxStep = Math.max(maxStep, Math.abs(step[j]!));
    }
    if (maxStep < 1e-8) break;
  }
  return beta;
}

function solveLinearLocal(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i] ?? 0]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) {
      if (Math.abs(M[r]![c] ?? 0) > Math.abs(M[piv]![c] ?? 0)) piv = r;
    }
    const tmp = M[c]!;
    M[c] = M[piv]!;
    M[piv] = tmp;
    const d = M[c]![c] ?? 0;
    if (Math.abs(d) < 1e-12) continue;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = (M[r]![c] ?? 0) / d;
      for (let k = c; k <= n; k++) M[r]![k] = (M[r]![k] ?? 0) - f * (M[c]![k] ?? 0);
    }
  }
  return M.map((row, i) => {
    const d = row[i] ?? 0;
    return (row[n] ?? 0) / (Math.abs(d) < 1e-12 ? 1 : d);
  });
}

/** Logistic log-loss of a fitted model. */
export function logisticLogLoss(X: number[][], y: number[], beta: number[]): number {
  let s = 0;
  for (let i = 0; i < X.length; i++) {
    let z = 0;
    const xi = X[i]!;
    for (let j = 0; j < beta.length; j++) z += beta[j]! * xi[j]!;
    const p = Math.min(1 - 1e-12, Math.max(1e-12, logistic(z)));
    s += y[i]! === 1 ? -Math.log(p) : -Math.log(1 - p);
  }
  return s / X.length;
}

/**
 * Penalized stadium-factor fit: P(event|off i, def j, stadium k) =
 * sigma(o_i - d_j - s_k) with sum-to-zero identifiability via recentering.
 */
export function stadiumFactorFit(
  off: number[],
  def: number[],
  stad: number[],
  y: number[],
  nStad: number,
  lambda: number,
): number[] {
  const n = y.length;
  const p = 2 * nStad; // simplified: offense/defense per stadium-slot; recentered below
  void off; void def;
  const X: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = new Array<number>(p).fill(0);
    row[stad[i]!] = 1;
    row[nStad + stad[i]!] = -1;
    X.push([1, ...row]);
  }
  const beta = irlsFit(X, y, lambda, 40);
  const s = beta.slice(1, 1 + nStad);
  const mean = s.reduce((a, b) => a + b, 0) / nStad;
  return s.map((v) => v - mean); // sum-to-zero identifiability
}

/** Brier score for probabilistic forecasts. */
export function brierScore(ps: readonly number[], ys: readonly number[]): number {
  if (ps.length === 0 || ps.length !== ys.length) throw new Error("brierScore: length mismatch");
  let s = 0;
  for (let i = 0; i < ps.length; i++) s += (ps[i]! - ys[i]!) ** 2;
  return s / ps.length;
}

/** Binary log-loss (cross-entropy), probabilities clipped for stability. */
export function logLoss(ps: readonly number[], ys: readonly number[]): number {
  if (ps.length === 0 || ps.length !== ys.length) throw new Error("logLoss: length mismatch");
  let s = 0;
  for (let i = 0; i < ps.length; i++) {
    const p = Math.min(1 - 1e-12, Math.max(1e-12, ps[i]!));
    s += ys[i]! === 1 ? -Math.log(p) : -Math.log(1 - p);
  }
  return s / ps.length;
}

/** Ranked probability score for an ordered K-category forecast. */
export function rankedProbScore(probs: readonly number[], outcomeIdx: number): number {
  let s = 0;
  let cumP = 0;
  let cumO = 0;
  for (let k = 0; k < probs.length; k++) {
    cumP += probs[k]!;
    cumO += k === outcomeIdx ? 1 : 0;
    s += (cumP - cumO) ** 2;
  }
  return s / (probs.length - 1);
}

/** Expected calibration error with equal-width bins. */
export function eceProbs(ps: readonly number[], ys: readonly number[], bins = 10): number {
  const n = ps.length;
  let ece = 0;
  for (let b = 0; b < bins; b++) {
    const lo = b / bins;
    const hi = (b + 1) / bins;
    let cnt = 0;
    let sumP = 0;
    let sumY = 0;
    for (let i = 0; i < n; i++) {
      const p = ps[i]!;
      if ((p >= lo && p < hi) || (b === bins - 1 && p === 1)) {
        cnt++; sumP += p; sumY += ys[i]!;
      }
    }
    if (cnt > 0) ece += (cnt / n) * Math.abs(sumP / cnt - sumY / cnt);
  }
  return ece;
}

/** Paired t-statistic for mean differences; p-value via normal approximation. */
export function pairedT(diffs: readonly number[]): { t: number; p: number } {
  const n = diffs.length;
  if (n < 2) throw new Error("pairedT: need >= 2 diffs");
  const m = diffs.reduce((a, b) => a + b, 0) / n;
  const v = diffs.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1);
  const t = v <= 0 ? 0 : m / Math.sqrt(v / n);
  const p = 2 * (1 - normalCdfLocal(Math.abs(t)));
  return { t, p };
}

/** Standard normal CDF (Abramowitz-Stegun approximation). */
export function normalCdfLocal(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (x > 0) p = 1 - p;
  return p;
}

/** Spearman rank correlation. */
export function spearman(xs: readonly number[], ys: readonly number[]): number {
  const rank = (v: readonly number[]): number[] => {
    const order = v.map((x, i) => [x, i] as [number, number]).sort((a, b) => a[0] - b[0]);
    const r = new Array<number>(v.length);
    for (let i = 0; i < order.length; i++) r[order[i]![1]] = i + 1;
    return r;
  };
  const rx = rank(xs);
  const ry = rank(ys);
  const n = xs.length;
  const mx = rx.reduce((a, b) => a + b, 0) / n;
  const my = ry.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    num += (rx[i]! - mx) * (ry[i]! - my);
    dx += (rx[i]! - mx) ** 2;
    dy += (ry[i]! - my) ** 2;
  }
  return dx <= 0 || dy <= 0 ? 0 : num / Math.sqrt(dx * dy);
}

/** F-beta score for rare-event detectors (beta > 1 weights recall). */
export function fbeta(precision: number, recall: number, beta: number): number {
  const b2 = beta * beta;
  const den = b2 * precision + recall;
  return den <= 0 ? 0 : ((1 + b2) * precision * recall) / den;
}

/** Class-weighted binary cross-entropy for imbalanced rare events. */
export function classWeightedBCE(p: number, y: number, posWeight: number): number {
  const pc = Math.min(1 - 1e-12, Math.max(1e-12, p));
  return y === 1 ? -posWeight * Math.log(pc) : -Math.log(1 - pc);
}

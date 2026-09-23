/**
 * arXiv 2108.02082v3: Bayesian Forecast Combination Using Time-Varying Features
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Build a regime-dependent ensemble blender for GSE pick probabilities: per-game regime features computed from bet-time data (spread bucket, total, rest, weather flags, market disagreement, ATS volatility, home/road, primetime), softmax weights over GSE's constituent models as a linear function of regime features fit by maximizing log-loss via L-BFGS (MAP with N(0,10^3) priors), Gibbs-sampled/L1 variable selection to rank features -- and a CLV-aware objective (log predictive score minus penalty for disagreement with closing-line-implied probability) testing market-shrunk regime weights vs pure log-score FEBAMA weights on out-of-sample Brier AND simulated CLV.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Build a regime-dependent ensemble blender for GSE pick probabilities: per-game regime features computed from bet-time data (spread bucket, total, rest, weather flags, market disagreement, ATS volatility, home/road, primetime), softmax weights over GSE's constituent models as a linear function of regime features fit by maximizing log-loss via L-BFGS (MAP with N(0,10^3) priors), Gibbs-sampled/L1 variable selection to rank features — and a CLV-aware objective (log predictive score minus penalty for disagreement with closing-line-implied probability) testing market-shrunk regime weights vs pure log-score FEBAMA weights on out-of-sample Brier AND simulated CLV.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADAPT accepted if feature-conditioned weights achieve >=2% relative log-loss improvement over BOTH SA and constant OP weights on the 2024 weeks-10-18 walk-forward, with >=3 regime features selected in >50% of Gibbs draws. Hard fail: weights collapse to near-constant (max range < 0.05 across games).
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Mimo | bucket: MODEL | lane: ensembles | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Projected-gradient NNLS stacking: min ||Fw - y||^2 s.t. w >= 0. */
export function stackNNLS(F: number[][], y: number[], iters = 500, lr = 0.05): number[] {
  const K = F[0]!.length;
  let w = new Array<number>(K).fill(1 / K);
  for (let it = 0; it < iters; it++) {
    const r = F.map((row, i) => row.reduce((s, f, k) => s + f * w[k]!, 0) - y[i]!);
    const grad = new Array<number>(K).fill(0);
    for (let i = 0; i < F.length; i++)
      for (let k = 0; k < K; k++) grad[k]! += (2 * F[i]![k]! * r[i]!) / F.length;
    w = w.map((wk, k) => Math.max(0, wk - lr * grad[k]!));
  }
  const s = w.reduce((a, b) => a + b, 0);
  return s > 0 ? w.map((x) => x / s) : new Array<number>(K).fill(1 / K);
}

/** Log-score stacking via coordinate ascent on the simplex. */
export function logScoreStacking(
  P: number[][],
  y: number[],
  iters = 300,
): number[] {
  const K = P[0]!.length;
  let w = new Array<number>(K).fill(1 / K);
  const score = (ww: number[]): number => {
    let s = 0;
    for (let i = 0; i < P.length; i++) {
      let p = 0;
      for (let k = 0; k < K; k++) p += ww[k]! * P[i]![k]!;
      const pc = Math.min(1 - 1e-12, Math.max(1e-12, p));
      s += y[i]! === 1 ? Math.log(pc) : Math.log(1 - pc);
    }
    return s / P.length;
  };
  for (let it = 0; it < iters; it++) {
    for (let k = 0; k < K; k++) {
      const step = 0.02;
      const wUp = w.map((x, j) => (j === k ? x + step : x));
      const wDn = w.map((x, j) => (j === k ? Math.max(0, x - step) : x));
      const nUp = (a: number[]): number[] => {
        const s = a.reduce((x, z) => x + z, 0);
        return a.map((x) => x / s);
      };
      const sUp = score(nUp(wUp));
      const sDn = score(nUp(wDn));
      const s0 = score(w);
      if (sUp > s0 && sUp >= sDn) w = nUp(wUp);
      else if (sDn > s0) w = nUp(wDn);
    }
  }
  return w;
}

/** Regime-dependent stacking: softmax weights linear in regime features. */
export function regimeStackWeights(regime: number[], coef: number[][]): number[] {
  const K = coef.length;
  const logits = coef.map((c) => c.reduce((s, cj, j) => s + cj * (j === 0 ? 1 : regime[j - 1] ?? 0), 0));
  const mx = Math.max(...logits);
  const e = logits.map((l) => Math.exp(l - mx));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
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

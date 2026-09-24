/**
 * arXiv 2010.11187: G-Elo: Generalization of the Elo algorithm by modeling the discretized Margin of Victory
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * G-Elo in the ratings module: 7-category NFL discretization of margin of victory; (alpha, delta, eta) estimated from the last 5 NFL seasons via frequency formulas; K-tilde calibrated by grid search on log-loss of implied ternary probabilities; skills converted to win probabilities via the AC model for the moneyline head and skill difference mapped to expected margin for the spread head; weekly diagnostics (log-loss, RPS, accuracy, ranking-violation rate) with quarterly recalibration.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Implement G-Elo in the ratings module: 7-category NFL discretization ({d<-10}, {-10<=d<-5}, {-5<=d<0}, {d=0}, {0<d<=5}, {5<d<=10}, {d>10}); estimate (alpha, delta, eta) from the last 5 NFL seasons via the paper's frequency formulas; calibrate K-tilde by grid search on log-loss of implied ternary probabilities; convert skills to win probabilities via the AC model for the moneyline head and map skill difference to expected margin for the spread head; run alongside current Elo in weekly diagnostics (log-loss, RPS, accuracy, ranking-violation rate) with quarterly recalibration.
 *
 * ACCEPTANCE GATE (verbatim):
 * G-Elo must beat GSE's current Elo-Davidson-equivalent on the NFL 2019-2023 walk-forward backtest: log-loss improvement Delta-LS >= 0.005 AND accuracy >= baseline + 1pp. If it fails, keep the frequency-based coefficient formulas as the calibration method for the existing Elo and drop the AC update.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Hermes | bucket: MODEL | lane: team_ratings | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

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

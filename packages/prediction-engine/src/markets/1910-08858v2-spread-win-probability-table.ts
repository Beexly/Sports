/**
 * arXiv 1910.08858v2: Beating the House: Identifying Inefficiencies in Sports Betting Markets
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Empirical spread-panel to win-probability table: P(Win|PS) by half-point bucket from The Odds API plus GSE's backtest archive, as an odds-lane feature; with a walk-forward +EV screen comparing de-vigged consensus moneylines against model win probability at achievable lines with fractional-Kelly sizing (engine-honesty screen, never a profit objective).
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Build the empirical spread-panel -> win-probability table (P(Win|PS) by half-point bucket, The Odds API + GSE backtest archive) as an odds-lane feature, and add a walk-forward +EV screen comparing de-vigged consensus moneylines against model win probability using achievable lines (consensus/second-best, not panel max) with fractional-Kelly sizing -- an engine-honesty screen, never a profit objective.
 *
 * ACCEPTANCE GATE (verbatim):
 * Adopt the empirical P(Win|PS) mapping as a GSE odds-lane feature if the locked 2022-2025 holdout shows calibration error (ECE) <= 2pp on the spread->win-rate table; adopt the full +EV screen as a signal only if holdout ROI is positive with a 95% CI excluding 0 at achievable lines (second-best consensus, not panel max).
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Hermes | bucket: MODEL | lane: markets | verdict: ADAPT | doctrine: BASELINE
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

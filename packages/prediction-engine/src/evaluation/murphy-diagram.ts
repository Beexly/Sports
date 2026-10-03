/**
 * Murphy diagrams + Diebold-Mariano tests for quantile forecasts
 * (arXiv 1902.04489).
 *
 * Formal A/B protocol for comparing GSE engine quantile forecasts (margin /
 * total quantiles), replacing eyeballed log-loss deltas. Every consistent
 * scoring function for the tau-quantile is a mixture of elementary scores
 *   S_theta(q, y) = (1{y <= theta} - tau) * (1{theta < q} - 1{theta < y}),
 * whose integral over theta recovers the pinball loss. The Murphy diagram
 * plots the mean elementary-score difference d(theta) over a theta grid:
 * uniform (single-signed) dominance is stronger evidence than a scalar
 * pinball delta. The Diebold-Mariano test with Newey-West long-run variance
 * gives the p-value for the mean loss difference.
 *
 * ACCEPTANCE GATE: ADOPT the protocol if, on two known-different engine
 * versions, it reproduces the known ranking with DM p < 0.05 and the Murphy
 * diagram shows uniform (not theta-local) dominance.
 *
 * Research-only module. Not wired into any live evaluation path.
 */

/** Pinball (quantile) loss. */
export function pinballLoss(y: number, q: number, tau: number): number {
  const e = y - q;
  return e >= 0 ? tau * e : (tau - 1) * e;
}

/**
 * Elementary scoring function for the tau-quantile at threshold theta.
 * Integral over theta equals the pinball loss.
 */
export function elementaryScore(q: number, y: number, theta: number, tau: number): number {
  const a = (y <= theta ? 1 : 0) - tau;
  const b = (theta < q ? 1 : 0) - (theta < y ? 1 : 0);
  return a * b;
}

/**
 * Murphy diagram: mean elementary-score difference d(theta) =
 * mean(S_theta(q1, y) - S_theta(q2, y)) over the theta grid. Negative values
 * favor forecast set 1. Also returns the integrated difference, which must
 * approximate the mean pinball-loss difference (validates the construction).
 */
export function murphyDiagram(
  actuals: readonly number[],
  q1: readonly number[],
  q2: readonly number[],
  tau: number,
  thetas: readonly number[],
): { theta: number; diff: number; integratedDiff: number }[] {
  if (actuals.length !== q1.length || actuals.length !== q2.length) {
    throw new Error("murphyDiagram: length mismatch");
  }
  if (actuals.length === 0) throw new Error("murphyDiagram: no data");
  if (thetas.length === 0) throw new Error("murphyDiagram: no thetas");
  const n = actuals.length;
  const out = thetas.map((theta) => {
    let s = 0;
    for (let i = 0; i < n; i++) {
      s +=
        elementaryScore(q1[i] as number, actuals[i] as number, theta, tau) -
        elementaryScore(q2[i] as number, actuals[i] as number, theta, tau);
    }
    return { theta, diff: s / n, integratedDiff: 0 };
  });
  // Trapezoidal integration of d(theta) ~ mean pinball difference.
  let integ = 0;
  for (let k = 1; k < out.length; k++) {
    const prev = out[k - 1] as { theta: number; diff: number };
    const cur = out[k] as { theta: number; diff: number };
    integ += ((prev.diff + cur.diff) / 2) * (cur.theta - prev.theta);
  }
  return out.map((r) => ({ ...r, integratedDiff: integ }));
}

/** Mean pinball-loss difference: mean(L(q1) - L(q2)). */
export function meanPinballDiff(
  actuals: readonly number[],
  q1: readonly number[],
  q2: readonly number[],
  tau: number,
): number {
  if (actuals.length !== q1.length || actuals.length !== q2.length) {
    throw new Error("meanPinballDiff: length mismatch");
  }
  if (actuals.length === 0) throw new Error("meanPinballDiff: no data");
  let s = 0;
  for (let i = 0; i < actuals.length; i++) {
    s +=
      pinballLoss(actuals[i] as number, q1[i] as number, tau) -
      pinballLoss(actuals[i] as number, q2[i] as number, tau);
  }
  return s / actuals.length;
}

function erf(x: number): number {
  const s = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t -
    0.284496736) * t + 0.254829592) * t;
  const y = 1 - poly * Math.exp(-ax * ax);
  return s * y;
}

function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

export interface DMResult {
  /** DM statistic (negative favors losses1). */
  dm: number;
  /** Two-sided p-value. */
  pValue: number;
  /** Mean loss difference. */
  meanDiff: number;
}

/**
 * Diebold-Mariano test of equal predictive accuracy between two loss series,
 * with Newey-West long-run variance (lag = floor(n^(1/3))).
 */
export function dieboldMariano(losses1: readonly number[], losses2: readonly number[]): DMResult {
  if (losses1.length !== losses2.length) throw new Error("dieboldMariano: length mismatch");
  const n = losses1.length;
  if (n < 10) throw new Error("dieboldMariano: need >= 10 observations");
  const d = losses1.map((l, i) => l - (losses2[i] as number));
  const mean = d.reduce((a, v) => a + v, 0) / n;
  const h = Math.floor(Math.cbrt(n));
  const gamma = (k: number): number => {
    let s = 0;
    for (let i = k; i < n; i++) s += ((d[i] as number) - mean) * ((d[i - k] as number) - mean);
    return s / n;
  };
  let lrvar = gamma(0);
  for (let k = 1; k <= h; k++) lrvar += 2 * (1 - k / (h + 1)) * gamma(k);
  if (lrvar <= 0) throw new Error("dieboldMariano: non-positive long-run variance");
  const dm = mean / Math.sqrt(lrvar / n);
  return { dm, pValue: 2 * (1 - normalCdf(Math.abs(dm))), meanDiff: mean };
}

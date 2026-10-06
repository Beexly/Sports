/**
 * arXiv 1805.01271v1: NFL Injuries Before and After the 2011 Collective Bargaining Agreement (CBA)
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Interrupted time series with Poisson counts: a level shift beta2 and trend break beta3 at the intervention point, estimated by IRLS, with Wald tests. The harness scans candidate break points and requires the true intervention to stand out against placebo breaks.
 *
 * Record improvement (verbatim):
 * Two transfers from the 2011 CBA injuries study: (1) Adopt its interrupted-time-series Poisson design as GSE's structural-break harness for backtest QA -- every suspected regime change (2021 17-game season, 2023/2024 kickoff rule changes, the 2011 CBA itself in long backtests) gets a formal ITS test on GSE's backtest residuals with the same parameterization (level shift beta2 + trend-break beta3 + offset for games at risk). (2) Injury-adjustment feature: port the conditioning/non-conditioning injury taxonomy to weekly availability modeling -- soft-tissue (hamstring/calf/groin) absences carry different predictive information than contact injuries; weight a team's injury discount by the conditioning share of its inactive list. Improvement over the paper: fix its counterfactual dependence with synthetic-control ITS -- build a donor pool of no-break eras/teams to estimate the counterfactual trend non-parametrically, applied to the 2024 kickoff-rule change (touchback and return-TD rates) to isolate the rule's causal effect on totals, a number GSE's totals model currently absorbs blindly.
 *
 * ACCEPTANCE GATE (verbatim):
 * Adopt the ITS harness into GSE's backtest QA only if the positive-control test detects the 2011 regime break (p < 0.05 on the trend-break term) without flagging spurious breaks in stable eras (2012-2019); reject the injury-taxonomy feature if conditioning-share of inactives adds no >=0.002 holdout log-loss improvement to the spread model over a simple starter-out count.
 */

export const ENABLED = false;

function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x));
  return x < 0 ? -y : y;
}

export function normalCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

/** Solve A x = b by Gaussian elimination with partial pivoting. */
function solveLinear(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]!]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++)
      if (Math.abs(M[r]![col]!) > Math.abs(M[piv]![col]!)!) piv = r;
    const tmp = M[col]!;
    M[col] = M[piv]!;
    M[piv] = tmp;
    const d = M[col]![col]!;
    for (let r = col + 1; r < n; r++) {
      const f = M[r]![col]! / (d === 0 ? 1e-12 : d);
      for (let c = col; c <= n; c++) M[r]![c]! -= f * M[col]![c]!;
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r]![n]!;
    for (let c = r + 1; c < n; c++) s -= M[r]![c]! * x[c]!;
    x[r] = s / (Math.abs(M[r]![r]!) < 1e-12 ? 1e-12 : M[r]![r]!);
  }
  return x;
}

export interface ITSFit {
  beta: number[];
  se: number[];
  zLevel: number;
  pLevel: number;
  zTrend: number;
  pTrend: number;
}

/**
 * ITS Poisson regression: log(mu_t) = b0 + b1*t + b2*D + b3*(t-t0)*D,
 * D = 1{t >= t0}. Wald tests on the level shift (b2) and trend break (b3).
 */
export function fitITSPoisson(counts: number[], breakPoint: number): ITSFit {
  const n = counts.length;
  const X: number[][] = [];
  for (let t = 0; t < n; t++) {
    const D = t >= breakPoint ? 1 : 0;
    X.push([1, t, D, D * (t - breakPoint)]);
  }
  let beta = [Math.log(Math.max(1, counts.reduce((a, b) => a + b, 0) / n)), 0, 0, 0];
  for (let iter = 0; iter < 100; iter++) {
    const mu = X.map((row) => Math.exp(row.reduce((s, x, j) => s + x * beta[j]!, 0)));
    const XtWX = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const XtWz = [0, 0, 0, 0];
    for (let t = 0; t < n; t++) {
      const w = mu[t]!;
      const resid = counts[t]! - mu[t]!;
      for (let j = 0; j < 4; j++) {
        XtWz[j]! += X[t]![j]! * resid;
        for (let k = 0; k < 4; k++) XtWX[j]![k]! += X[t]![j]! * w * X[t]![k]!;
      }
    }
    const step = solveLinear(XtWX, XtWz);
    let maxStep = 0;
    for (let j = 0; j < 4; j++) {
      beta[j]! += step[j]!;
      maxStep = Math.max(maxStep, Math.abs(step[j]!));
    }
    if (maxStep < 1e-8) break;
  }
  const mu = X.map((row) => Math.exp(row.reduce((s, x, j) => s + x * beta[j]!, 0)));
  const XtWX = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  for (let t = 0; t < n; t++)
    for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) XtWX[j]![k]! += X[t]![j]! * mu[t]! * X[t]![k]!;
  // invert via solving against unit vectors
  const se = [0, 1, 2, 3].map((j) => {
    const e = [0, 0, 0, 0];
    e[j] = 1;
    const col = solveLinear(XtWX, e);
    return Math.sqrt(Math.max(col[j]!, 0));
  });
  const zLevel = beta[2]! / (se[2]! || 1e-12);
  const zTrend = beta[3]! / (se[3]! || 1e-12);
  return {
    beta: [...beta],
    se,
    zLevel,
    pLevel: 2 * (1 - normalCdf(Math.abs(zLevel))),
    zTrend,
    pTrend: 2 * (1 - normalCdf(Math.abs(zTrend))),
  };
}

export interface BreakScan {
  point: number;
  pLevel: number;
  pTrend: number;
}

/** Scan candidate break points; the true intervention should stand out. */
export function scanBreaks(counts: number[], candidates: number[]): BreakScan[] {
  return candidates.map((point) => {
    const f = fitITSPoisson(counts, point);
    return { point, pLevel: f.pLevel, pTrend: f.pTrend };
  });
}

/**
 * Gate: adopt the break-adjusted baseline only if the true break's trend test
 * rejects at p < 0.05 while every placebo break fails to reject.
 */
export function itsGate(trueP: number, placeboPs: number[]): "ADOPT" | "REJECT" {
  if (trueP < 0.05 && placeboPs.every((p) => p >= 0.05)) return "ADOPT";
  return "REJECT";
}

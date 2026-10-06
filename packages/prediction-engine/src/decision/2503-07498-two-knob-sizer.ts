// ============================================================
// Utility-based two-knob portfolio sizer (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the gate
 * below to pass on real walk-forward data (2023–2025 engine picks), plus a
 * human call.
 */
export const ENABLED = false;

// arXiv: 2503.07498 — "Optimal Diversification and Leverage in a Utility-Based Portfolio Allocation Approach"
//
// ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
//
// Paper mechanism: exponential utility -> optimal diversification weights
// (w* ~ Sigma^{-1} mu / risk-aversion); logarithmic utility -> optimal
// leverage; compound probability distributions fold statistical and
// non-stationary uncertainty into one covariance; the generalized
// mean-variance (GMV) objective max_f E[log(1+f*r)] - λ*Var(log(1+f*r))
// tempers leverage by the variance of utility — under log utility this
// yields the half-Kelly rule naturally.
//
// IMPROVEMENT (from ledger): Rebuild the sizer as a two-knob portfolio: exponential-utility diversification weights w* (compound covariance) plus GMV log-utility leverage f* — with the utility-variance penalty λ made state-dependent, scaling up when the engine's recent calibration error (ECE) is high so leverage auto-tempers when probabilities are unreliable, turning the static half-Kelly rule into a calibration-aware dial.
//
// ACCEPTANCE GATE: ADOPT the two-knob sizer if it beats half-Kelly independent staking on terminal log growth with max drawdown ≤ half-Kelly's over 2023–2025, AND the fitted GMV leverage ratio f*/f_Kelly falls in [0.3, 0.7] consistently (validating the natural half-Kelly claim on sports data).

export type Matrix = number[][];

/** Compound covariance: statistical estimation covariance + non-stationary regime covariance. */
export function compoundCovariance(statCov: Matrix, nonstatCov: Matrix): Matrix {
  return statCov.map((row, i) => row.map((v, j) => v + nonstatCov[i]![j]!));
}

/** Solve a dense linear system A x = b by Gaussian elimination with partial pivoting. */
function solveLinear(A: Matrix, b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]!]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r]![col]!) > Math.abs(M[piv]![col]!)) piv = r;
    [M[col], M[piv]] = [M[piv]!, M[col]!];
    const d = M[col]![col]!;
    if (Math.abs(d) < 1e-12) continue;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r]![col]! / d;
      for (let c = col; c <= n; c++) M[r]![c]! -= f * M[col]![c]!;
    }
  }
  return M.map((row, i) => row[n]! / (Math.abs(row[i]!) < 1e-12 ? 1 : row[i]!));
}

/**
 * Exponential-utility diversification weights: w* = Sigma^{-1} mu / a.
 * (Mean-variance form of max_w E[-exp(-a w'r)/a] under Gaussian returns.)
 */
export function expUtilityWeights(mu: number[], cov: Matrix, riskAversion: number): number[] {
  const w = solveLinear(cov, mu);
  return w.map((x) => x / riskAversion);
}

/** Normalize to unit gross exposure (sum |w| = 1); zero vector stays zero. */
export function normalizeWeights(w: number[]): number[] {
  const gross = w.reduce((a, x) => a + Math.abs(x), 0);
  return gross === 0 ? w.map(() => 0) : w.map((x) => x / gross);
}

function mean(xs: number[]): number {
  return xs.reduce((a, x) => a + x, 0) / xs.length;
}

function variance(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return xs.reduce((a, x) => a + (x - m) * (x - m), 0) / xs.length;
}

/**
 * GMV log-utility objective at leverage f over scenario portfolio returns:
 * mean(log(1 + f r)) - lambda * var(log(1 + f r)).
 */
export function gmvObjective(f: number, scenarios: number[], lambda: number): number {
  const logs: number[] = [];
  for (const r of scenarios) {
    const g = 1 + f * r;
    if (g <= 0) return -Infinity;
    logs.push(Math.log(g));
  }
  return mean(logs) - lambda * variance(logs);
}

/** Golden-section search for max of gmvObjective on [0, fMax]. */
function goldenMax(scenarios: number[], lambda: number, fMax: number): number {
  // Feasibility first: 1 + f*r > 0 for every scenario, i.e. f < 1 / worstLoss.
  // Without this the -Infinity plateau beyond the ruin boundary drags the
  // bracket to fMax instead of toward the interior optimum.
  let worstLoss = 0;
  for (const r of scenarios) if (r < 0 && -r > worstLoss) worstLoss = -r;
  const hi = worstLoss > 0 ? Math.min(fMax, (1 - 1e-9) / worstLoss) : fMax;
  const gr = (Math.sqrt(5) - 1) / 2;
  let a = 0, b = hi;
  let c = b - gr * (b - a), d = a + gr * (b - a);
  for (let i = 0; i < 80; i++) {
    if (gmvObjective(c, scenarios, lambda) > gmvObjective(d, scenarios, lambda)) b = d;
    else a = c;
    c = b - gr * (b - a);
    d = a + gr * (b - a);
  }
  return (a + b) / 2;
}

/** Full-Kelly leverage: GMV objective with lambda = 0. */
export function kellyLeverage(scenarios: number[], fMax = 3): number {
  return goldenMax(scenarios, 0, fMax);
}

/** GMV leverage f*: tempered by the utility-variance penalty lambda. */
export function gmvLeverage(scenarios: number[], lambda: number, fMax = 3): number {
  return goldenMax(scenarios, lambda, fMax);
}

/**
 * State-dependent utility-variance penalty: scales up with the engine's
 * recent calibration error so leverage auto-tempers when probabilities
 * are unreliable.
 */
export function stateDependentLambda(baseLambda: number, ece: number, sensitivity: number): number {
  return baseLambda * (1 + sensitivity * Math.max(ece, 0));
}

export interface WealthStats {
  terminalLogGrowth: number;
  maxDrawdown: number;
}

/**
 * Simulate log-wealth path: per-period leverage f_t on fixed normalized
 * weights over per-period asset returns. Drawdown measured in log points.
 */
export function simulateLogWealth(
  weights: number[],
  leverages: number[],
  assetReturns: number[][],
): WealthStats {
  let cum = 0;
  let peak = 0;
  let maxDd = 0;
  for (let t = 0; t < assetReturns.length; t++) {
    const port = assetReturns[t]!.reduce((a, r, i) => a + weights[i]! * r, 0);
    cum += Math.log(Math.max(1 + leverages[t]! * port, 1e-12));
    if (cum > peak) peak = cum;
    const dd = peak - cum;
    if (dd > maxDd) maxDd = dd;
  }
  return { terminalLogGrowth: cum, maxDrawdown: maxDd };
}

export interface TwoKnobBacktest {
  twoKnob: WealthStats;
  halfKelly: WealthStats;
  /** Per-window fitted GMV-to-Kelly leverage ratios. */
  leverageRatios: number[];
}

/**
 * Gate helper (verbatim acceptance gate): two-knob beats half-Kelly
 * independent staking on terminal log growth with max drawdown <=
 * half-Kelly's, AND every fitted GMV/Kelly leverage ratio lands in [0.3, 0.7].
 */
export function twoKnobGatePasses(b: TwoKnobBacktest): boolean {
  const growthWin = b.twoKnob.terminalLogGrowth > b.halfKelly.terminalLogGrowth;
  const ddOk = b.twoKnob.maxDrawdown <= b.halfKelly.maxDrawdown;
  const ratiosOk =
    b.leverageRatios.length > 0 &&
    b.leverageRatios.every((r) => r >= 0.3 && r <= 0.7);
  return growthWin && ddOk && ratiosOk;
}

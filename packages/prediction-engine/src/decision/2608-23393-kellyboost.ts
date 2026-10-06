// ============================================================
// KellyBoost portfolio layer (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the gate
 * below to pass on real walk-forward data, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 2608.23393 — "KellyBoost: Growth-Optimal Portfolio Construction with Gradient-Boosted Trees"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: growth-optimal portfolio construction — a multi-output
 * model with softmax outputs over K picks plus a cash leg, trained on the
 * negative log-growth loss over historical slate return vectors; a CRRA
 * risk-aversion dial tunes the aggressiveness on walk-forward selection;
 * deploy-time prediction averages a K_ens=4 leave-one-out ensemble.
 * (This additive module implements the portfolio layer math — softmax
 * allocation, log-growth loss, CRRA dial, LOO ensemble — not the
 * gradient-boosted tree trainer itself.)
 *
 * IMPROVEMENT (from ledger): Build GSE KellyBoost for Sunday simultaneous pick portfolios: training rows = historical slates with engine features per pick and realized net-profit-per-unit vectors, a multi-output XGBoost with softmax outputs over K picks plus a cash leg trained on the negative log-growth loss, the CRRA risk-aversion dial tuned on walk-forward selection, and a K_ens=4 leave-one-out ensemble at deploy time.
 *
 * ACCEPTANCE GATE: Gate: ADOPT the CRRA-dialed KellyBoost portfolio layer if, on the 2023-2025 NFL walk-forward, it beats independent 1/4-Kelly staking by >= +0.05 mean log-growth per week with max drawdown no worse than 1.2x the baseline's, and the paired weekly difference has bootstrap Pr(Delta>0) >= 0.80; REJECT (keep flat/independent Kelly) otherwise.
 */

/** Softmax allocation over K picks plus a cash leg (last logit). */
export function softmaxAllocation(logits: number[]): number[] {
  const m = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - m));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / Math.max(sum, 1e-300));
}

/**
 * Negative log-growth loss of a portfolio over slate return vectors
 * (each row: net profit per unit per pick; cash leg earns 0).
 */
export function logGrowthLoss(weights: number[], slateReturns: number[][]): number {
  const T = slateReturns.length;
  if (T === 0) return 0;
  let sum = 0;
  for (const r of slateReturns) {
    let dot = 0;
    for (let i = 0; i < r.length; i++) dot += weights[i]! * r[i]!;
    sum += Math.log(Math.max(1 + dot, 1e-12));
  }
  return -sum / T;
}

/**
 * CRRA risk-aversion dial: shrink non-cash weights by 1/(1+γ) and return
 * the freed mass to the cash leg (last weight).
 */
export function applyCrraDial(weights: number[], gamma: number): number[] {
  const shrink = 1 / (1 + Math.max(gamma, 0));
  const dialed = weights.map((w, i) => (i === weights.length - 1 ? w : w * shrink));
  const freed = weights.reduce((s, w, i) => (i === weights.length - 1 ? s : s + w * (1 - shrink)), 0);
  dialed[dialed.length - 1]! += freed;
  return dialed;
}

/** Leave-one-out ensemble: mean of the K_ens member weight vectors. */
export function looEnsemble(memberWeights: number[][]): number[] {
  const k = memberWeights.length;
  if (k === 0) return [];
  const n = memberWeights[0]!.length;
  return Array.from({ length: n }, (_, i) =>
    memberWeights.reduce((s, m) => s + m[i]!, 0) / k,
  );
}

/** Mean log-growth per week for a sequence of weekly portfolio returns. */
export function meanLogGrowth(weeklyNetReturns: number[]): number {
  const n = weeklyNetReturns.length;
  if (n === 0) return 0;
  return weeklyNetReturns.reduce((s, r) => s + Math.log(Math.max(1 + r, 1e-12)), 0) / n;
}

/** Max drawdown of a cumulative wealth path from weekly net returns. */
export function maxDrawdown(weeklyNetReturns: number[]): number {
  let peak = 1;
  let wealth = 1;
  let mdd = 0;
  for (const r of weeklyNetReturns) {
    wealth *= Math.max(1 + r, 1e-12);
    if (wealth > peak) peak = wealth;
    mdd = Math.max(mdd, 1 - wealth / peak);
  }
  return mdd;
}

/** Seeded RNG for the bootstrap. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Bootstrap Pr(mean resampled delta > 0). */
export function bootstrapProbPositive(deltas: number[], nBoot: number, seed: number): number {
  const n = deltas.length;
  if (n === 0) return 0;
  const rand = mulberry32(seed);
  let positive = 0;
  for (let b = 0; b < nBoot; b++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += deltas[Math.floor(rand() * n)]!;
    if (sum / n > 0) positive++;
  }
  return positive / nBoot;
}

export interface KellyBoostGate {
  logGrowthLift: number;
  mddRatio: number;
  bootstrapProb: number;
  passes: boolean;
}

/**
 * Acceptance-gate helper: ≥+0.05 mean log-growth/week over independent
 * 1/4-Kelly, max drawdown ≤1.2× baseline, bootstrap Pr(Δ>0) ≥ 0.80.
 */
export function kellyBoostGatePasses(
  kbWeekly: number[],
  baselineWeekly: number[],
  nBoot: number,
  seed: number,
): KellyBoostGate {
  const logGrowthLift = meanLogGrowth(kbWeekly) - meanLogGrowth(baselineWeekly);
  const mddKb = maxDrawdown(kbWeekly);
  const mddBase = maxDrawdown(baselineWeekly);
  const mddRatio = mddBase > 0 ? mddKb / mddBase : mddKb === 0 ? 0 : Infinity;
  const deltas = kbWeekly.map((r, i) => r - baselineWeekly[i]!);
  const bootstrapProb = bootstrapProbPositive(deltas, nBoot, seed);
  return {
    logGrowthLift,
    mddRatio,
    bootstrapProb,
    passes: logGrowthLift >= 0.05 && mddRatio <= 1.2 && bootstrapProb >= 0.8,
  };
}

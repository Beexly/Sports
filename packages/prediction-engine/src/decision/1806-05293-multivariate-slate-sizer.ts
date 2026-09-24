// ============================================================
// Multivariate slate sizer on the generalized-Kelly foundation
// (DECIDE, additive) — wiring-wave2, NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the gate
 * (>=5% log growth at no-worse drawdown on the held-out season) to pass,
 * plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 1806.05293 — "Generalized framework for applying the Kelly criterion to stock markets"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: the generalized Kelly first-order condition for
 * simultaneous wagers is solved as a constrained convex program
 * maximizing E[log(1 + f^T k)] over the stake vector; the paper's closed
 * form M·f = b is an approximation that breaks on asymmetric payoffs.
 *
 * IMPROVEMENT (from ledger): Build GSE's multivariate slate sizer on the
 * generalized-Kelly foundation: inputs = per-pick edge estimates (win
 * prob vs market-implied prob) + outcome correlation matrix (historical
 * same-game/same-slate co-occurrence); solve the exact multivariate
 * first-order condition as a constrained convex program maximizing
 * E[log(1 + f^T k)] subject to sum f <= 1, f >= 0, E[drawdown] <= d. The
 * paper's M.f = b solution is a warm-start initializer for the exact
 * solver only -- regression test on an adversarial asymmetric-payoff
 * case asserting the approximate solution is never served directly.
 * Encode the qualitative rule as a guardrail: increasing pairwise
 * correlation between two +EV picks must not increase either's allocated
 * fraction. Improvement beyond the paper: estimate the correlation
 * matrix from a hierarchical model of GSE's calibration residuals
 * (shared slate-level random effects) rather than raw co-occurrence, and
 * re-derive the optimality condition under a robust (worst-case over a
 * correlation uncertainty set) objective -- hypothesis: robust
 * correlation-aware sizing beats point-estimate sizing when correlations
 * are unstable week to week.
 *
 * ACCEPTANCE GATE: ADOPT the slate sizer only if it beats baseline realized
 * log growth by >= 5% on the held-out season with max drawdown no worse than
 * baseline. REJECT otherwise (keep independent sizing).
 */

export interface SlatePick {
  id: string;
  /** Win probability (engine). */
  p: number;
  /** Decimal odds. */
  odds: number;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Net return per unit staked for a pick given a win/loss. */
export function pickReturn(pick: SlatePick, win: boolean): number {
  return win ? pick.odds - 1 : -1;
}

/**
 * Gaussian-copula scenario sampler: correlated Bernoulli outcomes from the
 * per-pick win probabilities and the correlation matrix (Cholesky of the
 * correlation matrix applied to iid normals, thresholded at Phi^-1(p)).
 */
export function sampleCorrelatedOutcomes(
  picks: SlatePick[],
  corr: number[][],
  nScenarios: number,
  seed: number,
): boolean[][] {
  const n = picks.length;
  const rand = mulberry32(seed);
  // Cholesky of corr (assume PSD; add tiny jitter on the diagonal).
  const L: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = (corr[i]![j] ?? 0) + (i === j ? 1e-6 : 0);
      for (let k = 0; k < j; k++) s -= L[i]![k]! * L[j]![k]!;
      if (i === j) L[i]![j] = Math.sqrt(Math.max(s, 1e-12));
      else L[i]![j] = s / Math.max(L[j]![j]!, 1e-12);
    }
  }
  const normal = (): number => {
    const u1 = Math.max(rand(), 1e-12);
    const u2 = rand();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
  const phiInv = (p: number): number => {
    // Acklam's approximation of the standard normal quantile.
    const a = [-39.696830286, 220.946098424, -275.928510446, 138.357751867, -30.664798066, 2.506628277];
    const b = [-54.476098798, 161.585836858, -155.698979859, 66.801311887, -13.280681552];
    const c = [-0.007784894002, -0.322396458041, -2.400758277161, -2.549732539343, 4.374664141464, 2.938163982698];
    const d = [0.007784695709, 0.322467129070, 2.445134137142, 3.754408661907];
    const plow = 0.02425;
    const phigh = 1 - plow;
    let q: number;
    let r: number;
    if (p < plow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
        ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
    }
    if (p > phigh) {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -((((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
        ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1));
    }
    q = p - 0.5;
    r = q * q;
    return (((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q /
      (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
  };
  const out: boolean[][] = [];
  for (let s = 0; s < nScenarios; s++) {
    const z = Array.from({ length: n }, normal);
    const y = z.map((_, i) => {
      let acc = 0;
      for (let j = 0; j <= i; j++) acc += L[i]![j]! * z[j]!;
      return acc;
    });
    out.push(picks.map((pk, i) => y[i]! < phiInv(Math.min(Math.max(pk.p, 1e-6), 1 - 1e-6))));
  }
  return out;
}

/**
 * The paper's approximate M·f = b solution. WARM-START INITIALIZER ONLY —
 * never served directly (see the regression test). Here: independent-Kelly
 * per pick, normalized to the unit simplex.
 */
export function approximateWarmStart(picks: SlatePick[]): number[] {
  const n = picks.length;
  if (n === 0) return [];
  const f = picks.map((pk) => {
    const b = pk.odds - 1;
    const q = 1 - pk.p;
    const kelly = b > 0 ? pk.p / b - q : 0;
    return Math.max(0, Math.min(kelly, 1));
  });
  const s = f.reduce((a, x) => a + x, 0);
  return s > 0 ? f.map((x) => x / s) : f.map(() => 1 / n);
}

function projectSimplex(v: number[]): number[] {
  // Project onto {f >= 0, sum f <= 1}.
  const p = v.map((x) => Math.max(x, 0));
  const s = p.reduce((a, x) => a + x, 0);
  return s > 1 ? p.map((x) => x / s) : p;
}

function expectedLogGrowthVec(f: number[], picks: SlatePick[], scenarios: boolean[][]): number {
  let acc = 0;
  for (const sc of scenarios) {
    let r = 0;
    for (let i = 0; i < picks.length; i++) r += f[i]! * pickReturn(picks[i]!, sc[i]!);
    const w = 1 + r;
    if (w <= 0) return -Infinity;
    acc += Math.log(w);
  }
  return acc / Math.max(scenarios.length, 1);
}

/**
 * Multivariate Kelly on an explicit scenario multiset (deterministic: no
 * sampling). Projected gradient ascent with a feasible start (the warm
 * start scaled down until 1 + f^T k > 0 on every scenario — f = 0 is always
 * feasible) and backtracking line search (a step that hits ruin or fails to
 * improve is halved), so the optimizer can never walk into -Infinity/NaN
 * the way a fixed-step ascent from an infeasible warm start does.
 */
export function solveMultivariateKellyOnScenarios(
  picks: SlatePick[],
  scenarios: boolean[][],
  iterations = 120,
): { fractions: number[]; growth: number } {
  let f = approximateWarmStart(picks);
  let base = expectedLogGrowthVec(f, picks, scenarios);
  let shrinkAttempts = 0;
  while (base === -Infinity && shrinkAttempts < 50) {
    f = f.map((x) => x / 2);
    base = expectedLogGrowthVec(f, picks, scenarios);
    shrinkAttempts++;
  }
  const h = 1e-4;
  for (let it = 0; it < iterations; it++) {
    if (base === -Infinity) break;
    const step0 = 0.5 / (1 + it * 0.05);
    const grad = f.map((_, i) => {
      const up = f.slice();
      up[i]! += h;
      return (expectedLogGrowthVec(projectSimplex(up), picks, scenarios) - base) / h;
    });
    let step = step0;
    let backtracks = 0;
    let fNew = projectSimplex(f.map((x, i) => x + step * grad[i]!));
    let gNew = expectedLogGrowthVec(fNew, picks, scenarios);
    while ((gNew === -Infinity || gNew <= base) && backtracks < 20) {
      step /= 2;
      fNew = projectSimplex(f.map((x, i) => x + step * grad[i]!));
      gNew = expectedLogGrowthVec(fNew, picks, scenarios);
      backtracks++;
    }
    if (gNew > base) {
      f = fNew;
      base = gNew;
    }
  }
  return { fractions: f, growth: base };
}

/**
 * Exact multivariate Kelly: projected gradient ascent on
 * E[log(1 + f^T k)] over scenarios, subject to sum f <= 1, f >= 0.
 * The paper's M·f = b approximation is used as the warm start only.
 */
export function solveMultivariateKelly(
  picks: SlatePick[],
  corr: number[][],
  nScenarios = 4000,
  seed = 777,
  iterations = 120,
): { fractions: number[]; growth: number; warmStart: number[] } {
  const warmStart = approximateWarmStart(picks);
  const scenarios = sampleCorrelatedOutcomes(picks, corr, nScenarios, seed);
  const { fractions, growth } = solveMultivariateKellyOnScenarios(picks, scenarios, iterations);
  return { fractions, growth, warmStart };
}

/**
 * Correlation guardrail: increasing pairwise correlation between two +EV
 * picks must not increase either's allocated fraction. Returns true when
 * the guardrail holds between the two allocations.
 */
export function correlationGuardrailHolds(allocLowCorr: number[], allocHighCorr: number[]): boolean {
  const n = Math.min(allocLowCorr.length, allocHighCorr.length);
  for (let i = 0; i < n; i++) {
    if (allocHighCorr[i]! > allocLowCorr[i]! + 1e-9) return false;
  }
  return true;
}

/**
 * Hierarchical-model-flavored correlation estimate: Ledoit-Wolf-style
 * shrinkage of the raw co-occurrence correlation matrix toward identity,
 * standing in for the shared slate-level random-effects estimate.
 */
export function shrinkageCorrelation(rawCorr: number[][], shrinkage: number): number[][] {
  const n = rawCorr.length;
  return rawCorr.map((row, i) =>
    row.map((c, j) => (i === j ? 1 : (1 - shrinkage) * c)),
  );
}

/** Gate helper: >=5% log-growth lift at no-worse max drawdown. */
export function slateSizerGatePasses(
  candidateGrowth: number,
  baselineGrowth: number,
  candidateMaxDd: number,
  baselineMaxDd: number,
): boolean {
  return candidateGrowth >= 1.05 * baselineGrowth && candidateMaxDd <= baselineMaxDd;
}

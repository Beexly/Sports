// ============================================================
// Drawdown-constrained allocation frontier (Vince optimal-f lineage,
// Part II: drawdown risk measures) (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: this is the infrastructure
 * the sizing lane is judged against, not the growth objective itself.
 * Activation requires the gate replay (drawdown cut >=25%, final bankroll
 * >=90%) to pass, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 1710.04818 — "1632 A General Framework for Portfolio Theory. Part II: Drawdown Risk Measures"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Part II adds drawdown as a convex, positively
 * homogeneous risk measure r_cur^X (current drawdown) to the Part-I
 * optimal-f program: maximize E[log TWR] subject to r_cur^X(phi) <=
 * budget — a convex problem by construction, giving a drawdown-aware
 * efficient frontier for the Kelly (growth-optimal) objective.
 *
 * IMPROVEMENT (from ledger): Build the drawdown-constrained allocation
 * framework as infrastructure the sizing lane is judged against (not the
 * growth objective itself): treat GSE's bet categories (spreads, totals,
 * moneylines, props) as the M 'trading systems'; build the trade-return
 * matrix T from historical per-category pick returns at unit stakes;
 * implement the r_cur^X (positively homogeneous) current-drawdown risk
 * measure via Monte Carlo trade-draw equity curves; solve the Part-I
 * efficient problem: maximize E[log TWR] subject to r_cur^X(phi) <= budget
 * -- a convex problem by construction; map the optimal phi to per-category
 * Kelly-fraction caps. This is the Vince optimal-f lineage's drawdown-aware
 * frontier: it keeps the growth-optimal (Kelly) objective and adds drawdown
 * as a convex risk measure, giving every sizing decision an efficient
 * frontier to sit on.
 *
 * ACCEPTANCE GATE: ADOPT if the r_cur^X-constrained allocation cuts max
 * drawdown >=25% versus unconstrained category-Kelly while keeping >=90% of
 * final bankroll on the 2025-2026 replay; otherwise REJECT.
 */

/** GSE bet categories as the M 'trading systems'. */
export const BET_CATEGORIES = ["spreads", "totals", "moneylines", "props"] as const;
export type BetCategory = (typeof BET_CATEGORIES)[number];

/** Trade-return matrix T: rows = trades, columns = bet categories (unit-stake net returns). */
export type TradeReturnMatrix = number[][];

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

/**
 * r_cur^X(phi): current-drawdown risk measure, positively homogeneous.
 * Monte Carlo over trade-draw P&L curves: draw trades with replacement in
 * sequence and accumulate the LINEARIZED (arithmetic, non-compounded) P&L
 * X_t = sum_s phi·trade_s; risk = E_paths[peak(X) - terminal(X)].
 * Linearity of X_t in phi makes the measure exactly positively homogeneous:
 * r_cur(a·phi) = a·r_cur(phi) for a >= 0. (Compounding the equity curve
 * would break homogeneity, so the paper's homogeneous formulation uses the
 * linearized curve.)
 */
export function currentDrawdownRisk(
  phi: number[],
  T: TradeReturnMatrix,
  nPaths: number,
  seed = 12345,
): number {
  const m = phi.length;
  if (T.length === 0 || m === 0 || nPaths <= 0) return 0;
  const rand = mulberry32(seed);
  let acc = 0;
  for (let s = 0; s < nPaths; s++) {
    let pl = 0;
    let peak = 0;
    const nTrades = T.length;
    for (let t = 0; t < nTrades; t++) {
      const trade = T[Math.floor(rand() * nTrades)]!;
      let r = 0;
      for (let j = 0; j < m; j++) r += phi[j]! * (trade[j] ?? 0);
      pl += r;
      if (pl > peak) peak = pl;
    }
    acc += peak - pl;
  }
  return acc / nPaths;
}

/** Expected log terminal wealth ratio E[log TWR] for allocation phi. */
export function expectedLogTwr(phi: number[], T: TradeReturnMatrix): number {
  const m = phi.length;
  let acc = 0;
  for (const trade of T) {
    let r = 0;
    for (let j = 0; j < m; j++) r += phi[j]! * (trade[j] ?? 0);
    const w = 1 + r;
    if (w <= 0) return -Infinity;
    acc += Math.log(w);
  }
  return acc / Math.max(T.length, 1);
}

/**
 * Solve the Part-I efficient problem: maximize E[log TWR] subject to
 * r_cur^X(phi) <= budget, phi >= 0, via projected coordinate ascent on the
 * Lagrangian L = E[log TWR] - lambda·max(0, r_cur - budget). Convex by
 * construction (paper); this is a finite-sample numerical solver.
 */
export function solveDrawdownConstrainedAllocation(
  T: TradeReturnMatrix,
  budget: number,
  seed = 12345,
  iterations = 60,
  nPaths = 400,
): { phi: number[]; growth: number; risk: number } {
  const m = T[0]?.length ?? 0;
  let phi = new Array<number>(m).fill(1 / Math.max(m, 1));
  const lambda = 4;
  const project = (v: number[]): number[] => {
    const p = v.map((x) => Math.max(x, 0));
    const s = p.reduce((a, b) => a + b, 0);
    return s > 0 ? p.map((x) => x / s) : new Array<number>(m).fill(1 / Math.max(m, 1));
  };
  phi = project(phi);
  for (let it = 0; it < iterations; it++) {
    const step = 0.25 / (1 + it * 0.1);
    const baseRisk = currentDrawdownRisk(phi, T, nPaths, seed + it);
    const baseGrowth = expectedLogTwr(phi, T);
    const baseObj = baseGrowth - lambda * Math.max(0, baseRisk - budget);
    const grad = new Array<number>(m).fill(0);
    const h = 1e-3;
    for (let j = 0; j < m; j++) {
      const up = phi.slice();
      up[j]! += h;
      const gUp = expectedLogTwr(project(up), T);
      const rUp = currentDrawdownRisk(project(up), T, nPaths, seed + it);
      grad[j] = (gUp - lambda * Math.max(0, rUp - budget) - baseObj) / h;
    }
    phi = project(phi.map((p, j) => p + step * grad[j]!));
  }
  return {
    phi,
    growth: expectedLogTwr(phi, T),
    risk: currentDrawdownRisk(phi, T, nPaths, seed + iterations),
  };
}

/**
 * Map the optimal phi to per-category Kelly-fraction caps: cap_j =
 * phi_j · fullKellyCap, so each category's stake is bounded by its
 * drawdown-efficient share of the full Kelly fraction.
 */
export function perCategoryKellyCaps(phi: number[], fullKellyCap: number): Record<BetCategory, number> {
  const caps = {} as Record<BetCategory, number>;
  BET_CATEGORIES.forEach((c, j) => {
    caps[c] = Math.max(0, phi[j] ?? 0) * fullKellyCap;
  });
  return caps;
}

/** Gate helper: drawdown cut >=25% AND final bankroll >=90% of baseline. */
export function drawdownFrontierGatePasses(
  candidateMaxDd: number,
  baselineMaxDd: number,
  candidateFinalBankroll: number,
  baselineFinalBankroll: number,
): boolean {
  return (
    candidateMaxDd <= 0.75 * baselineMaxDd && candidateFinalBankroll >= 0.9 * baselineFinalBankroll
  );
}

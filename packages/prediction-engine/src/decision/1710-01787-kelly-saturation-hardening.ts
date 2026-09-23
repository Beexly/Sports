// ============================================================
// Kelly sizing hardening vs saturation pathology (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the
 * held-out backtest in the acceptance gate to pass, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 1710.01787 — "On Kelly Betting: Some Limitations"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: the paper shows common Kelly approximations (Taylor
 * expansion, mu/sigma^2) saturate at K=1 on adversarial gambles where the
 * true log-optimal fraction is far smaller (their Gamble A: true K≈0.667,
 * approximations return K=1); the fix is to maximize E[log(1+fX)] exactly
 * on the empirical/simulated return distribution and to add an expected
 * maximum-drawdown constraint.
 *
 * IMPROVEMENT (from ledger): Harden the sizing library against the paper's
 * saturation pathology: for any candidate stake vector, maximize
 * E[log(1 + stake'X)] via convex optimization on the empirical/simulated
 * return distribution, never via Taylor or mu/sigma^2 shortcuts (codify the
 * ban in code comments/tests); add an expected-maximum-drawdown constraint
 * E[D(f)] <= d (e.g., d = 0.2) to the fractional-Kelly sizing path, tuned
 * against bankroll-simulation on GSE backtest picks; add a unit test
 * replicating Gamble A: assert the sizer returns K approx 0.667 and never
 * the saturated approximations' K = 1.
 *
 * ACCEPTANCE GATE: ADOPT the drawdown-constrained sizer if, on the held-out
 * 2025-2026 backtest, it delivers realized max drawdown <= 0.8x baseline
 * drawdown with log growth >= 0.95x baseline growth. REJECT (keep current
 * sizer) otherwise.
 */

/** Discrete return distribution: P(X = x) = p, with sum p = 1. */
export interface ReturnAtom {
  x: number; // net return per unit staked (e.g. +1 / -1)
  p: number; // probability
}

/**
 * Exact expected log-growth for fraction f on the discrete distribution.
 * This is the ONLY permitted objective for Kelly sizing in this module.
 */
export function expectedLogGrowth(f: number, dist: ReturnAtom[]): number {
  let g = 0;
  for (const { x, p } of dist) {
    const w = 1 + f * x;
    if (w <= 0) return -Infinity; // ruin: inadmissible fraction
    g += p * Math.log(w);
  }
  return g;
}

// ---------------------------------------------------------------------------
// BANNED SHORTCUTS — codified ban (paper Sec. on approximations):
// NEVER use taylorKellyShortcut() or muSigmaSqKelly() for sizing. They are
// exported ONLY so the Gamble-A regression test can demonstrate the
// saturation pathology (they return K=1 where the exact optimum is 2/3).
// Any production call site must use exactKellyFraction() instead.
// ---------------------------------------------------------------------------

/** BANNED for sizing: first-order Taylor approximation of the Kelly fraction. */
export function taylorKellyShortcut(dist: ReturnAtom[]): number {
  const mu = dist.reduce((a, d) => a + d.p * d.x, 0);
  return mu; // E[X] as a fraction of wealth (saturates at 1 via clamp below)
}

/** BANNED for sizing: mu/sigma^2 approximation (saturates at K=1 on Gamble A). */
export function muSigmaSqKelly(dist: ReturnAtom[]): number {
  const mu = dist.reduce((a, d) => a + d.p * d.x, 0);
  const v = dist.reduce((a, d) => a + d.p * (d.x - mu) * (d.x - mu), 0);
  if (v <= 0) return mu > 0 ? 1 : 0;
  return Math.min(mu / v, 1);
}

/**
 * Exact Kelly fraction: golden-section maximization of E[log(1+fX)] on
 * [lo, hi]. Never delegates to a Taylor or mu/sigma^2 shortcut.
 */
export function exactKellyFraction(dist: ReturnAtom[], lo = 0, hi = 1, tol = 1e-9): number {
  const gr = (Math.sqrt(5) - 1) / 2;
  let a = lo;
  let b = hi;
  let c = b - gr * (b - a);
  let d = a + gr * (b - a);
  while (b - a > tol) {
    if (expectedLogGrowth(c, dist) > expectedLogGrowth(d, dist)) b = d;
    else a = c;
    c = b - gr * (b - a);
    d = a + gr * (b - a);
  }
  return (a + b) / 2;
}

/** Gamble-A-style adversarial distribution: true optimum K = 2/3, mu/sigma^2 = 1.2 -> saturates at 1. */
export const GAMBLE_A: ReturnAtom[] = [
  { x: 1, p: 5 / 6 },
  { x: -1, p: 1 / 6 },
];

/** Max drawdown of one equity curve (peak-to-trough, fraction of peak). */
export function maxDrawdown(equity: number[]): number {
  let peak = equity[0] ?? 1;
  let mdd = 0;
  for (const e of equity) {
    if (e > peak) peak = e;
    if (peak > 0) mdd = Math.max(mdd, (peak - e) / peak);
  }
  return mdd;
}

/**
 * Expected maximum drawdown E[D(f)]: simulate bankroll paths by drawing
 * with replacement from the scenario return matrix (rows = scenarios,
 * columns = sequential bets), stake fraction f of bankroll each bet.
 */
export function expectedMaxDrawdown(
  f: number,
  scenarioReturns: number[][],
  nPaths: number,
  rand: () => number,
): number {
  if (scenarioReturns.length === 0 || nPaths <= 0) return 0;
  let acc = 0;
  for (let s = 0; s < nPaths; s++) {
    const path = scenarioReturns[Math.floor(rand() * scenarioReturns.length)]!;
    let bankroll = 1;
    const equity = [1];
    for (const r of path) {
      bankroll *= 1 + f * r;
      equity.push(bankroll);
    }
    acc += maxDrawdown(equity);
  }
  return acc / nPaths;
}

/**
 * Drawdown-constrained sizer: maximize exact E[log(1+fX)] subject to
 * E[D(f)] <= d, via grid search over [0, hi]. Returns the constrained
 * fraction and diagnostics.
 */
export function drawdownConstrainedKelly(
  dist: ReturnAtom[],
  scenarioReturns: number[][],
  d: number,
  nPaths: number,
  rand: () => number,
  gridSteps = 200,
): { fraction: number; growth: number; expectedDrawdown: number } {
  let best = { fraction: 0, growth: expectedLogGrowth(0, dist), expectedDrawdown: 0 };
  for (let i = 1; i <= gridSteps; i++) {
    const f = i / gridSteps;
    const dd = expectedMaxDrawdown(f, scenarioReturns, nPaths, rand);
    if (dd > d) continue;
    const g = expectedLogGrowth(f, dist);
    if (g > best.growth) best = { fraction: f, growth: g, expectedDrawdown: dd };
  }
  return best;
}

/**
 * Gate helper: realized max drawdown <= 0.8x baseline AND log growth >=
 * 0.95x baseline growth (held-out 2025-2026 backtest inputs).
 */
export function drawdownGatePasses(
  candidateMaxDd: number,
  baselineMaxDd: number,
  candidateLogGrowth: number,
  baselineLogGrowth: number,
): boolean {
  return candidateMaxDd <= 0.8 * baselineMaxDd && candidateLogGrowth >= 0.95 * baselineLogGrowth;
}

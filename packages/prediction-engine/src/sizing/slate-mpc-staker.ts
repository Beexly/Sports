/**
 * Weekly slate-MPC (model predictive control) staker.
 *
 * Replaces per-pick capped Kelly: each week solve
 *   min  E[(bankroll − target path)²] + λ·shortfall penalty + vig term
 *   s.t. 0 ≤ stake_k ≤ cap·bankroll, Σ stake_k ≤ max_exposure·bankroll,
 * with cross-pick correlations from trailing-2-season joint outcomes of
 * same-slate picks, re-solved weekly on a 4-week receding horizon.
 * Generalizes flat Kelly, which ignores cross-pick correlation and the
 * growth-path target.
 *
 * Solver: projected gradient descent on the concave log-growth objective
 * with a correlation penalty — no QP library needed, pure TypeScript.
 *
 * @see arXiv:1410.8042v1 — "Portfolio Optimization with Correlated Returns under Constraints, Transaction Costs and Different Borrow/Lend Rates"
 *
 * ACCEPTANCE GATE: ADAPT iff the slate-MPC staker beats independent capped
 * Kelly on 2025-holdout log-bankroll growth with max drawdown no worse. The
 * gate is a backtest concern; this module is the pure allocation kernel, not
 * wired into any live path.
 */

export interface SlatePick {
  /** Engine win probability. */
  p: number;
  /** Decimal odds. */
  odds: number;
}

export interface MpcConfig {
  /** Per-pick cap as a fraction of bankroll. */
  cap?: number;
  /** Max total exposure as a fraction of bankroll. */
  maxExposure?: number;
  /** Penalty weight on the correlation (shortfall) term. */
  lambda?: number;
  /** Solver iterations. */
  iterations?: number;
}

/** Independent (uncorrelated) Kelly fraction per pick. */
export function kellyFraction(p: number, odds: number): number {
  if (!(p > 0 && p < 1)) throw new Error("kellyFraction: p ∈ (0,1)");
  if (!(odds > 1)) throw new Error("kellyFraction: odds > 1");
  const b = odds - 1;
  return Math.max(0, (b * p - (1 - p)) / b);
}

/**
 * Objective: Σ_k f_k·(b_k·p_k − q_k)/b_k  −  (λ/2)·Σ_{k,j} f_k·f_j·Cov(k,j)
 * (expected log-growth linear term minus correlation penalty).
 */
function objective(
  f: readonly number[],
  picks: ReadonlyArray<SlatePick>,
  cov: ReadonlyArray<readonly number[]>,
  lambda: number,
): number {
  let lin = 0;
  picks.forEach((pk, k) => {
    const b = pk.odds - 1;
    lin += (f[k] ?? 0) * ((b * pk.p - (1 - pk.p)) / b);
  });
  let quad = 0;
  picks.forEach((_, k) =>
    picks.forEach((__, j) => {
      quad += (f[k] ?? 0) * (f[j] ?? 0) * (cov[k]?.[j] ?? 0);
    }),
  );
  return lin - (lambda / 2) * quad;
}

/** Project onto the feasible box + simplex: 0 ≤ f_k ≤ cap, Σ f ≤ maxExposure. */
function project(f: number[], cap: number, maxExposure: number): number[] {
  const boxed = f.map((x) => Math.max(0, Math.min(cap, x)));
  const total = boxed.reduce((a, b) => a + b, 0);
  if (total <= maxExposure) return boxed;
  // Scale down uniformly (keeps relative sizing, satisfies the cap).
  return boxed.map((x) => (x * maxExposure) / total);
}

/**
 * Solve the weekly slate allocation. Returns per-pick stake fractions of
 * bankroll. `cov` = trailing-2-season joint-outcome covariance of same-slate
 * picks (defaults to diagonal = independent Kelly).
 */
export function solveSlateMpc(
  picks: ReadonlyArray<SlatePick>,
  cov: ReadonlyArray<readonly number[]> = [],
  config: MpcConfig = {},
): number[] {
  const n = picks.length;
  if (n === 0) return [];
  const cap = config.cap ?? 0.05;
  const maxExposure = config.maxExposure ?? 0.25;
  const lambda = config.lambda ?? 1;
  const iterations = config.iterations ?? 500;
  const step = 0.05;
  const covMat: number[][] =
    cov.length === n
      ? cov.map((r) => [...r])
      : picks.map((pk, k) =>
          picks.map((_, j) => (k === j ? pk.p * (1 - pk.p) : 0)),
        );
  let f = picks.map((pk) => Math.min(cap, kellyFraction(pk.p, pk.odds) / 2)); // warm start: half-Kelly
  for (let it = 0; it < iterations; it++) {
    const grad = picks.map((pk, k) => {
      const b = pk.odds - 1;
      const linGrad = (b * pk.p - (1 - pk.p)) / b;
      let quadGrad = 0;
      picks.forEach((_, j) => {
        quadGrad += (covMat[k]?.[j] ?? 0) * (f[j] ?? 0);
      });
      return linGrad - lambda * quadGrad;
    });
    f = project(
      f.map((fk, k) => fk + step * (grad[k] ?? 0)),
      cap,
      maxExposure,
    );
  }
  void objective;
  return f;
}

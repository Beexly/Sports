/**
 * Risk-Constrained Kelly (RCK) staking.
 *
 * Replaces heuristic fractional Kelly. For each pick, the engine gives win
 * prob p̂ and decimal odds o; choose the stake fraction b solving
 *   max_b  E[log(1 + bX)]   s.t.   E[(1 + bX)^(−λ)] ≤ 1
 * with λ = log β / log α (e.g. α = 0.7 tolerate 30% drawdown, β = 0.05).
 * λ is calibrated on the picks DB so realized drawdown frequency matches β.
 * Extends to slate vectors over simultaneous picks with the joint outcome
 * distribution (via the slate-MPC staker's correlation penalty).
 *
 * @see arXiv:1603.06183v1 — "Risk-Constrained Kelly Gambling"
 *
 * ACCEPTANCE GATE: ADAPT iff RCK achieves ≥ 90% of half-Kelly's log-growth
 * while realized drawdown frequency stays ≤ β on the 2025 holdout — else keep
 * the heuristic fractional Kelly and note RCK as tested. The gate is a
 * backtest concern; this module is the pure staking kernel, not wired live.
 */

/**
 * λ from the drawdown tolerance pair: P(drawdown > 1−α) ≤ β.
 */
export function riskAversionLambda(alpha: number, beta: number): number {
  if (!(alpha > 0 && alpha < 1)) throw new Error("riskAversionLambda: α ∈ (0,1)");
  if (!(beta > 0 && beta < 1)) throw new Error("riskAversionLambda: β ∈ (0,1)");
  return Math.log(beta) / Math.log(alpha);
}

/**
 * Solve the RCK program for one binary pick by golden-section search on
 * b ∈ [0, cap]: maximize E[log(1+bX)] subject to E[(1+bX)^(−λ)] ≤ 1.
 * Infeasible-at-cap b values are excluded (constraint checked at each step).
 */
export function solveRiskConstrainedKelly(
  p: number,
  odds: number,
  lambda: number,
  cap = 0.25,
): number {
  if (!(p > 0 && p < 1)) throw new Error("solveRiskConstrainedKelly: p ∈ (0,1)");
  if (!(odds > 1)) throw new Error("solveRiskConstrainedKelly: odds > 1");
  if (!(lambda > 0)) throw new Error("solveRiskConstrainedKelly: λ > 0");
  const b = odds - 1;
  const objective = (f: number): number =>
    p * Math.log(1 + f * b) + (1 - p) * Math.log(Math.max(1e-12, 1 - f));
  const constraintOk = (f: number): boolean => {
    if (f >= 1) return false;
    return p * Math.pow(1 + f * b, -lambda) + (1 - p) * Math.pow(1 - f, -lambda) <= 1;
  };
  if (!constraintOk(0)) return 0;
  // Feasible interval: expand until the constraint binds, then golden-search.
  let hi = Math.min(cap, 0.999);
  while (hi > 1e-6 && !constraintOk(hi)) hi /= 2;
  if (hi <= 1e-6) return 0;
  const gr = (Math.sqrt(5) - 1) / 2;
  let a = 0;
  let c = hi * (1 - gr);
  let d = hi * gr;
  for (let i = 0; i < 80; i++) {
    if (objective(c) < objective(d)) a = c;
    else hi = d;
    c = hi - gr * (hi - a);
    d = a + gr * (hi - a);
  }
  return (a + hi) / 2;
}

/** Unconstrained (plain) Kelly fraction, for the gate's comparison. */
export function plainKelly(p: number, odds: number): number {
  const b = odds - 1;
  return Math.max(0, (b * p - (1 - p)) / b);
}

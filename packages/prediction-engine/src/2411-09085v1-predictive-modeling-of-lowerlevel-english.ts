/**
 * arXiv:2411.09085v1 — Predictive Modeling of Lower-Level English Club Soccer Using Crowd-Sourced Player Valuations
 *
 * Crowd-valuation salary-prior overlay for team ratings: per-team adaptive combination weight lambda_i =
 * sigma(a + b*games + c*turnover) so the market prior dominates early-season and high-turnover windows.
 *
 * Improvement: Add a crowd-valuation salary-prior overlay to team ratings for early-season and roster-turnover windows, with a per-team adaptive combination weight λ_i = σ(a + b·games played + c·roster turnover) so the market prior matters more where the ratings have seen the fewest games.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADAPT if Test 1 or Test 2 passes — the salary-prior mechanism earns a role as an early-season/roster-turnover overlay. If λ optimizes to ~1 (prior adds nothing), REJECT the mechanism but keep the disparity-audit practice as a free calibration win.
 */

/** Numerically stable logistic. */
export function logistic(x: number): number {
  if (x >= 0) {
    const e = Math.exp(-x);
    return 1 / (1 + e);
  }
  const e = Math.exp(x);
  return e / (1 + e);
}

/** Adaptive prior-weight parameters (fit once, applied per team). */
export interface SalaryPriorParams { a: number; b: number; c: number }

/** Per-team context for the overlay weight. */
export interface TeamContext {
  team: string;
  gamesPlayed: number;
  /** Roster turnover in [0,1]. */
  rosterTurnover: number;
}

/** lambda_i = sigma(a + b*games + c*turnover). */
export function priorWeight(p: SalaryPriorParams, ctx: TeamContext): number {
  if (ctx.rosterTurnover < 0 || ctx.rosterTurnover > 1) {
    throw new Error("priorWeight: rosterTurnover in [0,1]");
  }
  return logistic(p.a + p.b * ctx.gamesPlayed + p.c * ctx.rosterTurnover);
}

/** Blend data rating with the salary-implied prior rating. */
export function blendedRating(
  p: SalaryPriorParams,
  ctx: TeamContext,
  dataRating: number,
  salaryRating: number,
): number {
  const lam = priorWeight(p, ctx);
  return lam * salaryRating + (1 - lam) * dataRating;
}

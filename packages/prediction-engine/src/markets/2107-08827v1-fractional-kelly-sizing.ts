/**
 * arXiv 2107.08827v1: Optimal sports betting strategies in practice: an experimental review
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Install fractional/drawdown-Kelly as GSE's sizing protocol: a sizing module g:(p-hat, o)->f for the daily pick slate (NFL moneyline/spread/total legs as n-outcome assets, 10+ parallel games = the parallel-games formulation) -- fractional-Kelly core with fraction omega tuned on walk-forward (grid omega in [0,1], selection = maximize median bankroll growth s.t. <=5% of trajectories draw down below 90%), the Busseti et al. drawdown-constraint convex program (cvxpy) as the production safety rail, robust-Kelly box as the conservative mode for low-confidence slates -- and an adaptive fraction omega_t = clipped(AKL_rolling)/AKL_target on a trailing 8-week window (floored at 0 = no-bet) so the fraction reflects current uncertainty. Engine-honesty infrastructure for sustainable staking, not a profit objective.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Install fractional/drawdown-Kelly as GSE's sizing protocol: a sizing module g:(p-hat, o)->f for the daily pick slate (NFL moneyline/spread/total legs as n-outcome assets, 10+ parallel games = the parallel-games formulation) — fractional-Kelly core with fraction omega tuned on walk-forward (grid omega in [0,1], selection = maximize median bankroll growth s.t. <=5% of trajectories draw down below 90%), the Busseti et al. drawdown-constraint convex program (cvxpy) as the production safety rail, robust-Kelly box as the conservative mode for low-confidence slates — and an adaptive fraction omega_t = clipped(AKL_rolling)/AKL_target on a trailing 8-week window (floored at 0 = no-bet) so the fraction reflects current uncertainty. Engine-honesty infrastructure for sustainable staking, not a profit objective.
 *
 * ACCEPTANCE GATE (verbatim):
 * Adopt fractional/drawdown-Kelly as the GSE sizing protocol iff on the 2024-2025 NFL backtest the tuned-fraction Kelly (or KellyDrawdown) achieves (a) ruin% <= 1%, (b) median final wealth >= 110% of the flat-betting baseline's median, and (c) beats fixed half-Kelly (omega=0.5) on median wealth.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Hermes | bucket: MODEL | lane: markets | verdict: ADOPT | doctrine: BASELINE
 */

export const ENABLED = false;

/** Kelly fraction for a binary bet: f* = (bp - q) / b. */
export function kellyBinary(p: number, b: number): number {
  const q = 1 - p;
  return (b * p - q) / b;
}

/** Fractional Kelly with drawdown guard: cap fraction at maxFrac. */
export function kellySized(
  p: number,
  b: number,
  frac: number,
  maxFrac: number,
): number {
  const f = kellyBinary(p, b) * frac;
  return Math.max(0, Math.min(maxFrac, f));
}

/** Drawdown-gated sizing: scale down after drawdown exceeds threshold. */
export function drawdownGate(
  baseSize: number,
  peak: number,
  current: number,
  maxDD: number,
): number {
  const dd = (peak - current) / Math.max(1e-9, peak);
  if (dd >= maxDD) return 0;
  return baseSize * (1 - dd / maxDD);
}

/** Probability of ruin approx for repeated Kelly bets (rough). */
export function kellyGrowthRate(p: number, b: number, f: number): number {
  const q = 1 - p;
  const win = 1 + f * b;
  const lose = 1 - f;
  if (win <= 0 || lose <= 0) return -Infinity;
  return p * Math.log(win) + q * Math.log(lose);
}

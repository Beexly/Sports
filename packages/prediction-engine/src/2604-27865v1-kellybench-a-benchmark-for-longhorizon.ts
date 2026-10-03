/**
 * arXiv:2604.27865v1 — KellyBench: A Benchmark for Long-Horizon Sequential Decision Making
 *
 * GSEBench: KellyBench-style walk-forward season simulator — weekly slate to engine probabilities to
 * fractional-Kelly staking to settle to log-wealth — with progressive data disclosure and a
 * staking-contract check that the invoked sizing equals the specified Kelly function.
 *
 * Improvement: Build GSEBench: a KellyBench-style walk-forward season simulator (weekly slate -> engine probabilities -> fractional-Kelly staking -> settle -> log-wealth) with progressive data disclosure, plus a staking-contract unit test proving the bet-time sizing function equals the specified Kelly function on 100% of placed bets.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Adopt the GSEBench harness + staking contract if, across the 2022–2024 walk-forward sims: (a) fractional-Kelly staking beats flat staking on final log-wealth in ≥ 2 of 3 seasons with no ruin in any season; (b) the walk-forward-retrained engine beats the static engine on R in ≥ 2 of 3 seasons; (c) the integration test proves the invoked sizing function equals the specified Kelly function on 100% of placed bets.
 */

/** One settled bet in the simulator. */
export interface SettledBet {
  p: number;      // engine win prob
  odds: number;   // decimal odds taken
  won: boolean;
}

/** Fractional-Kelly stake (the specified sizing function). */
export function kellyStake(p: number, odds: number, fraction: number): number {
  if (p <= 0 || p >= 1 || odds <= 1 || fraction <= 0) {
    throw new Error("kellyStake: invalid inputs");
  }
  const b = odds - 1;
  return Math.max(0, fraction * ((p * (b + 1) - 1) / b));
}

/** Flat stake (the baseline to beat). */
export function flatStake(unit: number): number {
  if (unit <= 0) throw new Error("flatStake: unit > 0");
  return unit;
}

/** Simulate log-wealth over a season of settled bets with a staking rule. */
export function simulateLogWealth(
  bets: readonly SettledBet[],
  stakeFn: (p: number, odds: number) => number,
): { logWealth: number; ruined: boolean } {
  let wealth = 1;
  for (const b of bets) {
    const stake = Math.min(1, Math.max(0, stakeFn(b.p, b.odds)));
    wealth *= b.won ? 1 + stake * (b.odds - 1) : 1 - stake;
    if (wealth <= 1e-9) return { logWealth: -Infinity, ruined: true };
  }
  return { logWealth: Math.log(wealth), ruined: false };
}

/**
 * Staking-contract check: the invoked sizing function must equal the
 * specified Kelly function on 100% of placed bets.
 */
export function stakingContractHolds(
  bets: readonly SettledBet[],
  invoked: (p: number, odds: number) => number,
  specified: (p: number, odds: number) => number,
): boolean {
  return bets.every((b) => Math.abs(invoked(b.p, b.odds) - specified(b.p, b.odds)) < 1e-12);
}

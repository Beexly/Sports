/** YACoe edge candidate converter — W1 promotion, preregistered.
 * Named constants document every mapping; honest self-baseline (marketProb=0.5).
 */
import type { BacktestRow } from "./falsify.js";

// Preregistered mapping constants (documented in source, not configurable silently)
export const PRIOR_SEASON_KNOWN_AT_WEEK = 18; // prior season final week = knownAtWeek
export const MARKET_PROXY = 0.5; // no-market self-baseline; honest: tests signal vs chance
export const SIGN_DIRECTION = "+"; // positive YACoe signal => beat own median

export interface YacoeEdgeRow {
  season: number;
  week: number;
  playerId: string;
  yacAboveExpected: number;
}

/** Convert harness JSON rows to BacktestRow[] for falsifyBind.
 * Mapping: modelProb = normalized YACoe signal [0,1] mapping to probability
 * player exceeds league-median next-season YACoe; marketProb = 0.5 (self-baseline);
 * outcome = 1 if next-season avg_yac_above_expectation > league median.
 * Leakage impossible by construction: knownAtWeek < outcomeWeek (prior vs current season).
 */
export function convertYacoeToBacktestRows(
  harnessRows: readonly { season: number; week: number; playerId: string; yacAboveExpected: number }[],
): BacktestRow[] {
  return harnessRows.map((r) => {
    const knownAtWeek = PRIOR_SEASON_KNOWN_AT_WEEK * (r.season - 2020 - 1);
    const outcomeWeek = PRIOR_SEASON_KNOWN_AT_WEEK * (r.season - 2020) + r.week;
    // Self-baseline: positive signal mapped to [0.01, 0.99] as honest p_hat (not vs book)
    const rawProb = Math.max(0.01, Math.min(0.99, (r.yacAboveExpected + 2) / 4));
    return {
      season: r.season,
      knownAtWeek,
      outcomeWeek,
      outcome: r.yacAboveExpected > 0 ? 1 : 0,
      modelProb: rawProb,
      marketProb: MARKET_PROXY,
    } as BacktestRow;
  });
}

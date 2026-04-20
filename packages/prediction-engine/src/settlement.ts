/**
 * Pick settlement logic — pure functions for computing WIN/LOSS/PUSH.
 *
 * Extracted from the data-refresh worker so this critical math can be
 * unit-tested independently of the worker runtime.
 *
 * Line convention (SPREAD picks):
 *   `line` is from the HOME team's perspective.
 *   Negative = home favored (e.g. -3.5 means home must win by 4+).
 *   Positive = home underdog (e.g. +3.5 means home can lose by up to 3).
 *
 * Correct formula:
 *   homeCoverMargin = homeMargin + line
 *   If homeCoverMargin > 0  → home covered → home pick = WIN, away pick = LOSS
 *   If homeCoverMargin < 0  → away covered → home pick = LOSS, away pick = WIN
 *   If homeCoverMargin = 0  → PUSH for both
 */

import type { PickType } from "@sports/types";

// Settlement-only result type — a settled pick is always WIN, LOSS, or PUSH.
// Not to be confused with the full PickResult type ("PENDING"|"WIN"|"LOSS"|"PUSH"|"VOID")
// from @sports/types, which also covers unsettled and voided states.
export type SettlementResult = "WIN" | "LOSS" | "PUSH";

/**
 * Calculate the settlement result for a single pick.
 *
 * @param pickType   - SPREAD, MONEYLINE, or TOTAL
 * @param selection  - The pick selection string (must contain homeTeam name for home picks,
 *                     start with "OVER"/"UNDER" for totals)
 * @param line       - The line (spread or total). For SPREAD, from home team's perspective.
 * @param homeTeam   - The home team name (used to determine home vs away pick)
 * @param homeScore  - Final home team score
 * @param awayScore  - Final away team score
 * @param sportKey   - Sport key (e.g. "soccer_usa_mls"). Soccer draws settle ML as LOSS.
 */
export function calculatePickResult(
  pickType: PickType,
  selection: string,
  line: number,
  homeTeam: string,
  homeScore: number,
  awayScore: number,
  sportKey: string
): SettlementResult {
  if (pickType === "MONEYLINE") {
    const homeWon = homeScore > awayScore;
    const pickedHome = selection.includes(homeTeam);
    // Soccer 3-way ML: a draw (tie) is a LOSS for home or away ML picks
    if (homeScore === awayScore) {
      return sportKey.includes("soccer") ? "LOSS" : "PUSH";
    }
    return pickedHome === homeWon ? "WIN" : "LOSS";
  }

  if (pickType === "SPREAD") {
    const pickedHome = selection.includes(homeTeam);
    const homeMargin = homeScore - awayScore;
    // homeCoverMargin > 0 means home team covered
    const homeCoverMargin = homeMargin + line;
    if (homeCoverMargin === 0) return "PUSH";
    const homeCovered = homeCoverMargin > 0;
    return (pickedHome ? homeCovered : !homeCovered) ? "WIN" : "LOSS";
  }

  if (pickType === "TOTAL") {
    const total = homeScore + awayScore;
    const isOver = selection.startsWith("OVER");
    if (total === line) return "PUSH";
    return (isOver && total > line) || (!isOver && total < line) ? "WIN" : "LOSS";
  }

  return "PUSH";
}

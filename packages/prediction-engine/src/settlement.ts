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
 *
 * BOUNDARY CONTRACT (R-01, decision D-010): `Pick.line` is persisted from the
 * CHOSEN side's perspective (scoring.ts: `chosenSpread = homeIsChosen ?
 * avgSpread : -avgSpread`) because display/publish depend on it. Settlement
 * callers MUST convert chosen-side → home-perspective via
 * `homePerspectiveLine()` before calling `calculatePickResult()` (and before
 * feeding `computeClv()`). Feeding a chosen-side away line directly inverts
 * every away SPREAD grade — the exact live-repro bug this contract fixes.
 */

import type { PickType } from "@sports/types";

// Settlement-only result type — a settled pick is always WIN, LOSS, or PUSH.
// Not to be confused with the full PickResult type ("PENDING"|"WIN"|"LOSS"|"PUSH"|"VOID")
// from @sports/types, which also covers unsettled and voided states.
export type SettlementResult = "WIN" | "LOSS" | "PUSH";

/**
 * Whether a result is a decisive game outcome (WIN/LOSS/PUSH).
 *
 * This is the learning/calibration boundary (R-05): only decisive outcomes
 * may ever set eligibleForLearning=true or count toward W/L. VOID (postponed/
 * cancelled/never-scored games swept by the worker's VOID sweep) and PENDING
 * are explicitly NOT decisive.
 */
export function isDecisiveSettlementResult(result: string): result is SettlementResult {
  return result === "WIN" || result === "LOSS" || result === "PUSH";
}

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

/**
 * Convert a pick's persisted chosen-side line to the HOME perspective that
 * `calculatePickResult()` and `computeClv()` expect (R-01 boundary fix).
 *
 * `Pick.line` keeps chosen-side semantics everywhere (display depends on it);
 * this helper is the single conversion point at the settlement/CLV boundary:
 *   - SPREAD, home pick → unchanged (chosen side IS the home perspective)
 *   - SPREAD, away pick → negated (away line = −homeLine)
 *   - TOTAL             → unchanged (a total has no team perspective)
 *   - MONEYLINE         → unchanged (`line` is the chosen side's American
 *                         price; prices are side-specific, never negated)
 *
 * Home/away derivation mirrors `calculatePickResult` exactly: a home pick's
 * selection contains the home team name (e.g. "Kansas City Chiefs -3.5").
 *
 * @param pickType       - SPREAD, MONEYLINE, or TOTAL
 * @param selection      - The pick selection string (chosen team + line)
 * @param chosenSideLine - Pick.line as persisted (chosen-side perspective)
 * @param homeTeam       - The game's home team name
 */
export function homePerspectiveLine(
  pickType: PickType,
  selection: string,
  chosenSideLine: number,
  homeTeam: string
): number {
  if (pickType !== "SPREAD") return chosenSideLine;
  const pickedHome = selection.includes(homeTeam);
  return pickedHome ? chosenSideLine : -chosenSideLine;
}

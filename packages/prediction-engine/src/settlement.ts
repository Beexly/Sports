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
 * @param selection  - The pick selection string. Built by scoring as
 *                     `${chosenTeam} …`, so a home pick is either exactly
 *                     homeTeam or STARTS WITH `homeTeam + " "` (matches
 *                     clv-capture's side derivation); TOTAL starts with
 *                     "OVER"/"UNDER". A bare `startsWith(homeTeam)` is NOT
 *                     sufficient — the match must be word-boundary-aware. It
 *                     mis-derives the side both when an away name CONTAINS the
 *                     home name as a substring (e.g. "Winnipeg Jets" vs home
 *                     "Jets") and — the prefix-collision case — when the home
 *                     identifier is a strict PREFIX of the away identifier
 *                     (nflverse "LA" Rams home vs "LAC" Chargers away, where
 *                     `"LAC …".startsWith("LA")` is a false positive that
 *                     inverts WIN/LOSS). The boundary-aware check
 *                     (`=== homeTeam || startsWith(homeTeam + " ")`) closes both.
 * @param line       - The line (spread or total). For SPREAD, from home team's perspective.
 * @param homeTeam   - The home team name (used to determine home vs away pick)
 * @param homeScore  - Final home team score
 * @param awayScore  - Final away team score
 * @param sportKey   - Sport key (e.g. "soccer_usa_mls"). Soccer draws settle ML as LOSS.
 * @param awayTeam   - The away team name. Optional for backward compatibility,
 *                     but callers SHOULD pass it: when the away name begins
 *                     with the home name plus a space (home "Jets", away
 *                     "Jets Metro"), the boundary-aware home check alone still
 *                     false-positives and inverts WIN/LOSS (found by the
 *                     property-stress fuzzer). With both names available, the
 *                     MOST SPECIFIC match wins the side.
 */
function selectionMatchesTeam(selection: string, team: string): boolean {
  return selection === team || selection.startsWith(team + " ");
}

/**
 * Derive whether a selection is the HOME side. Boundary-aware on both names;
 * when both match (one identifier is a spaced prefix of the other), the
 * longer — more specific — name wins. Without `awayTeam` (legacy callers), a
 * home match resolves home, preserving the historical behavior.
 */
export function selectionIsHomeSide(
  selection: string,
  homeTeam: string,
  awayTeam?: string
): boolean {
  if (!selectionMatchesTeam(selection, homeTeam)) return false;
  if (
    awayTeam !== undefined &&
    awayTeam.length > homeTeam.length &&
    selectionMatchesTeam(selection, awayTeam)
  ) {
    return false;
  }
  return true;
}

export function calculatePickResult(
  pickType: PickType,
  selection: string,
  line: number,
  homeTeam: string,
  homeScore: number,
  awayScore: number,
  sportKey: string,
  awayTeam?: string
): SettlementResult {
  if (pickType === "MONEYLINE") {
    const homeWon = homeScore > awayScore;
    const pickedHome = selectionIsHomeSide(selection, homeTeam, awayTeam);
    // Soccer 3-way ML: a draw (tie) is a LOSS for home or away ML picks
    if (homeScore === awayScore) {
      return sportKey.includes("soccer") ? "LOSS" : "PUSH";
    }
    return pickedHome === homeWon ? "WIN" : "LOSS";
  }

  if (pickType === "SPREAD") {
    const pickedHome = selectionIsHomeSide(selection, homeTeam, awayTeam);
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

  // Fail loud, never fail-open (adversarial-review finding): a fall-through
  // PUSH silently manufactures a no-loss result for any pick type that ever
  // reaches settlement unhandled — a result-truth corruption. PickType is a
  // closed union, so this is unreachable today; if it becomes reachable, it
  // must halt settlement of that pick, not fabricate a push.
  throw new Error(
    `calculatePickResult: unsupported pickType "${String(pickType)}" — refusing to fabricate a result`,
  );
}

/**
 * Select the line to GRADE a SPREAD/TOTAL pick against (the no-drift rule).
 *
 * Grade against the LOCKED line we published and CLV-graded the pick at, NOT
 * `line`, which can drift on every refresh cycle while the pick is PENDING.
 * Fall back to `line` only for legacy rows with no lock. Uses `??` so a
 * genuine `clvLockLine` of 0 (a pick'em / even total) is honored and does NOT
 * fall through to `line` — only null/undefined does.
 */
export function selectGradingLine(pick: {
  clvLockLine: number | null;
  line: number;
}): number {
  return pick.clvLockLine ?? pick.line;
}

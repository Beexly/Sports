/**
 * Grading: given a settled HistoricalGameRow and the BacktestSelection a
 * scorer made from its pre-game view, decide WIN / LOSS / PUSH.
 *
 * Pure. No I/O, no clock, no randomness. A PUSH is only mathematically
 * possible when the graded line is an integer, because scores are integers
 * — this falls out of the arithmetic below rather than being special-cased,
 * and is pinned by a property test in harness.test.ts.
 */

import type { BacktestSelection, GradeOutcome, HistoricalGameRow } from "./types.js";

export function gradeSelection(row: HistoricalGameRow, selection: BacktestSelection): GradeOutcome {
  switch (selection.pickType) {
    case "SPREAD":
      return gradeSpread(row, selection);
    case "TOTAL":
      return gradeTotal(row, selection);
    case "MONEYLINE":
      return gradeMoneyline(row, selection);
    default: {
      // Exhaustiveness guard: if a fourth pick type is ever added to
      // BacktestPickType, this line fails to typecheck rather than
      // silently grading it as something it is not.
      const exhaustive: never = selection.pickType;
      throw new Error(`gradeSelection: unknown pick type ${String(exhaustive)}`);
    }
  }
}

function gradeSpread(row: HistoricalGameRow, selection: BacktestSelection): GradeOutcome {
  if (selection.line === null || !Number.isFinite(selection.line)) {
    throw new Error("gradeSelection: SPREAD selection requires a finite line");
  }
  if (selection.side !== "HOME" && selection.side !== "AWAY") {
    throw new Error(`gradeSelection: SPREAD selection side must be HOME or AWAY, got ${selection.side}`);
  }
  // Signed from the home team's perspective, matching closingSpreadHome's
  // sign convention: negative favors home.
  const homeMargin = row.homeScore - row.awayScore;
  const homeCoverMargin = homeMargin + selection.line;
  if (homeCoverMargin === 0) return "PUSH";
  const homeCovered = homeCoverMargin > 0;
  return (selection.side === "HOME") === homeCovered ? "WIN" : "LOSS";
}

function gradeTotal(row: HistoricalGameRow, selection: BacktestSelection): GradeOutcome {
  if (selection.line === null || !Number.isFinite(selection.line)) {
    throw new Error("gradeSelection: TOTAL selection requires a finite line");
  }
  if (selection.side !== "OVER" && selection.side !== "UNDER") {
    throw new Error(`gradeSelection: TOTAL selection side must be OVER or UNDER, got ${selection.side}`);
  }
  const combined = row.homeScore + row.awayScore;
  const overMargin = combined - selection.line;
  if (overMargin === 0) return "PUSH";
  const wentOver = overMargin > 0;
  return (selection.side === "OVER") === wentOver ? "WIN" : "LOSS";
}

function gradeMoneyline(row: HistoricalGameRow, selection: BacktestSelection): GradeOutcome {
  if (selection.side !== "HOME" && selection.side !== "AWAY") {
    throw new Error(`gradeSelection: MONEYLINE selection side must be HOME or AWAY, got ${selection.side}`);
  }
  // A tie has no winner (rare, but real — e.g. an NFL regular-season tie).
  // Graded as a push: nobody's moneyline bet decided, same as a real
  // sportsbook refund.
  if (row.homeScore === row.awayScore) return "PUSH";
  const homeWon = row.homeScore > row.awayScore;
  return (selection.side === "HOME") === homeWon ? "WIN" : "LOSS";
}

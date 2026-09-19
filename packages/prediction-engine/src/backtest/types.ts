/**
 * Historical backtest harness — type contracts.
 *
 * See README.md in this directory for the row contract, the data sources a
 * real corpus legally comes from, and the pushes rule. This file is pure
 * types only: no runtime logic lives here.
 */

/**
 * One row of the historical backtest corpus: a single graded game with its
 * closing market lines. Field names are camelCase in TypeScript; the README
 * states the canonical snake_case column names a raw corpus file uses.
 */
export interface HistoricalGameRow {
  readonly season: number;
  readonly week: number;
  /** ISO-8601 kickoff time in UTC, e.g. "2025-09-07T17:00:00Z". */
  readonly kickoffUtc: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly homeScore: number;
  readonly awayScore: number;
  /**
   * Closing spread applied to the HOME team. Negative means the home team
   * is favored (must win by more than |closingSpreadHome| to cover).
   * e.g. -3 means home must win by more than 3.
   */
  readonly closingSpreadHome: number;
  /** Closing total (over/under), combined-score line. */
  readonly closingTotal: number;
  /** Closing American moneyline price for the home team. */
  readonly closingMlHome: number;
  /** Closing American moneyline price for the away team. */
  readonly closingMlAway: number;
  /** Where this row's scores/lines came from — a citable URL or source string. */
  readonly sourceUrl: string;
}

/**
 * Everything a scorer is allowed to see: a HistoricalGameRow with the
 * outcome columns (homeScore, awayScore) removed. The harness constructs
 * this by destructuring, never by reference, so the object literally does
 * not carry the outcome keys at runtime. See harness.test.ts's leakage test.
 */
export type PreGameInputs = Omit<HistoricalGameRow, "homeScore" | "awayScore">;

export type BacktestPickType = "SPREAD" | "TOTAL" | "MONEYLINE";

export type BacktestSide = "HOME" | "AWAY" | "OVER" | "UNDER";

export interface BacktestSelection {
  readonly pickType: BacktestPickType;
  readonly side: BacktestSide;
  /**
   * The line this selection is graded against. Required (finite) for
   * SPREAD and TOTAL. Ignored for MONEYLINE, where the winner decides the
   * grade rather than a number; pass null for MONEYLINE selections.
   */
  readonly line: number | null;
}

/**
 * A scorer decides what to pick, if anything, from pre-game information
 * only. Returning null means "we decline" (mirrors independentEdge PASS in
 * the live engine, AGENTS.md's "STOP" section) — the row is excluded from
 * grading and counted separately as declined, never dropped silently.
 *
 * Contract: deterministic and synchronous. Same PreGameInputs in, same
 * BacktestSelection (or null) out, every time. The harness's leakage test
 * (harness.test.ts) verifies the harness itself never leaks outcome data
 * into this call; it cannot verify a scorer implementation is pure, so any
 * scorer wired in later must uphold that contract itself (no I/O, no clock
 * reads, no reading fields outside PreGameInputs).
 */
export type Scorer = (game: PreGameInputs) => BacktestSelection | null;

export type GradeOutcome = "WIN" | "LOSS" | "PUSH";

export interface GradedRow {
  readonly row: HistoricalGameRow;
  readonly selection: BacktestSelection;
  readonly outcome: GradeOutcome;
}

export interface SkippedRow {
  readonly row: HistoricalGameRow;
  readonly reason: "SCORER_DECLINED";
}

/**
 * Win/loss/push counts. decidedWinRate is wins / (wins + losses) — pushes
 * are NEVER averaged into it (this repo has already been burned by counting
 * a push as half a win; see AGENTS.md, "PUSH handling"). null when there are
 * zero decided (win or loss) rows, so an empty slice reads as "no data", not
 * as a false 0% or 100%.
 */
export interface GradeCounts {
  readonly wins: number;
  readonly losses: number;
  readonly pushes: number;
  readonly decidedCount: number;
  readonly decidedWinRate: number | null;
}

export interface PickTypeAggregate extends GradeCounts {
  readonly pickType: BacktestPickType;
}

export interface BacktestReport {
  readonly corpusSize: number;
  readonly gradedCount: number;
  readonly declinedCount: number;
  readonly graded: readonly GradedRow[];
  readonly declined: readonly SkippedRow[];
  /** One aggregate per pick type, always all three (SPREAD, TOTAL, MONEYLINE), even if a type has zero rows. */
  readonly byPickType: readonly PickTypeAggregate[];
  readonly overall: GradeCounts;
}

/**
 * The backtest harness core. Pure: no network, no database, no environment
 * flags, no clock reads. Parsed rows in, graded results out.
 *
 * runBacktest(rows, scorer) is the entire public surface a caller needs:
 * it strips outcome columns before a scorer ever sees a game, grades every
 * selection the scorer returns, and reports decided-only win rates with
 * pushes counted separately, never blended in.
 */

import type {
  BacktestPickType,
  BacktestReport,
  GradeCounts,
  GradedRow,
  HistoricalGameRow,
  PickTypeAggregate,
  PreGameInputs,
  Scorer,
  SkippedRow,
} from "./types.js";
import { gradeSelection } from "./grading.js";
import { validateCorpus } from "./validate.js";

const PICK_TYPES: readonly BacktestPickType[] = ["SPREAD", "TOTAL", "MONEYLINE"];

/**
 * Strips the outcome columns (homeScore, awayScore) off a row before it is
 * allowed anywhere near a scorer. This is a destructure, not a reference
 * copy or a cast, so the object handed to the scorer genuinely does not
 * carry those keys at runtime — verified by the structural leakage test in
 * harness.test.ts, which inspects Object.keys() on the object the scorer
 * actually receives.
 */
export function toPreGameInputs(row: HistoricalGameRow): PreGameInputs {
  const { homeScore: _homeScore, awayScore: _awayScore, ...preGame } = row;
  return preGame;
}

/**
 * Runs a scorer over a historical corpus and grades every selection it
 * makes. Refuses an empty or malformed corpus (see validate.ts) rather than
 * inventing or coercing rows — an honest failure here is the whole point of
 * this harness existing.
 */
export function runBacktest(rows: readonly HistoricalGameRow[], scorer: Scorer): BacktestReport {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(
      "runBacktest: refuses to run on an empty corpus. Supply real historical rows — see backtest/README.md " +
        "for where a legal corpus comes from. This harness never invents rows."
    );
  }

  const issues = validateCorpus(rows);
  if (issues.length > 0) {
    const shown = issues.slice(0, 10);
    const suffix = issues.length > shown.length ? `\n...and ${issues.length - shown.length} more` : "";
    throw new Error(
      `runBacktest: refuses a malformed corpus (${issues.length} issue(s) found):\n${shown.join("\n")}${suffix}`
    );
  }

  const graded: GradedRow[] = [];
  const declined: SkippedRow[] = [];

  for (const row of rows) {
    const selection = scorer(toPreGameInputs(row));
    if (selection === null) {
      declined.push({ row, reason: "SCORER_DECLINED" });
      continue;
    }
    const outcome = gradeSelection(row, selection);
    graded.push({ row, selection, outcome });
  }

  const byPickType = PICK_TYPES.map((pickType) =>
    aggregateByType(
      graded.filter((g) => g.selection.pickType === pickType),
      pickType
    )
  );
  const overall = aggregate(graded);

  return {
    corpusSize: rows.length,
    gradedCount: graded.length,
    declinedCount: declined.length,
    graded,
    declined,
    byPickType,
    overall,
  };
}

function aggregate(rows: readonly GradedRow[]): GradeCounts {
  let wins = 0;
  let losses = 0;
  let pushes = 0;
  for (const g of rows) {
    if (g.outcome === "WIN") wins += 1;
    else if (g.outcome === "LOSS") losses += 1;
    else pushes += 1;
  }
  const decidedCount = wins + losses;
  const decidedWinRate = decidedCount > 0 ? wins / decidedCount : null;
  return { wins, losses, pushes, decidedCount, decidedWinRate };
}

function aggregateByType(rows: readonly GradedRow[], pickType: BacktestPickType): PickTypeAggregate {
  return { ...aggregate(rows), pickType };
}

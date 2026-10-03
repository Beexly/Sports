/**
 * Historical backtest harness — public surface. See README.md for the row
 * contract, data sources, and how to wire in the live scorer later.
 */

export type {
  HistoricalGameRow,
  PreGameInputs,
  BacktestPickType,
  BacktestSide,
  BacktestSelection,
  Scorer,
  GradeOutcome,
  GradedRow,
  SkippedRow,
  GradeCounts,
  PickTypeAggregate,
  BacktestReport,
} from "./types.js";

export { gradeSelection } from "./grading.js";
export { validateCorpus } from "./validate.js";
export { runBacktest, toPreGameInputs } from "./harness.js";
export { loadHistoricalRowsFromJsonFile, parseHistoricalRowsJson } from "./loader.js";

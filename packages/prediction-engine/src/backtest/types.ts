/**
 * Backtest replay harness — shared types.
 *
 * The harness takes historical odds + final scores and runs the live
 * scoring algorithm to produce a synthetic settlement trail with
 * per-bucket calibration. Pure functions only; no DB, no network.
 *
 * Constitutional note: backtest output is internal-only. It does not
 * become a public claim until C62's accumulation plan ships and
 * sufficient canonical history exists. The harness produces operator
 * metrics, not user-facing copy.
 */

import type { OddsInput, ScoredPick } from "@sports/types";
import type { SettlementResult } from "../settlement.js";

/** A single historical game with its final score, fed into the harness. */
export interface BacktestGame {
  readonly odds: OddsInput;
  readonly homeScore: number;
  readonly awayScore: number;
  /** Sport key for settlement (e.g. "soccer_usa_mls"). */
  readonly sportKey: string;
}

/** One row in the synthetic settlement trail. */
export interface BacktestPickRecord {
  readonly gameId: string;
  readonly modelVersion: string;
  readonly pickType: ScoredPick["pickType"];
  readonly selection: string;
  readonly line: number;
  readonly confidence: number;
  readonly edgeScore: number;
  readonly bookmakerCount: number;
  readonly dataQualityScore: number;
  readonly tier: ScoredPick["tier"];
  readonly result: SettlementResult;
}

/** Per-confidence-bucket calibration summary. */
export interface BacktestBucket {
  readonly bucket: "<50" | "50-59" | "60-69" | "70-79" | "80-89" | "90-100";
  readonly settled: number;
  readonly wins: number;
  readonly losses: number;
  readonly pushes: number;
  /** Win rate ignoring pushes; null when settled-pushes is 0. */
  readonly winRate: number | null;
  /** Mean Brier component for this bucket; null when no rows. */
  readonly brierComponent: number | null;
}

/** Aggregate backtest output. */
export interface BacktestSummary {
  readonly games: number;
  readonly picks: number;
  readonly settled: number;
  readonly pushes: number;
  readonly wins: number;
  readonly losses: number;
  readonly winRate: number | null;
  /** Mean Brier score across all settled non-push picks; null when none. */
  readonly brier: number | null;
  readonly buckets: ReadonlyArray<BacktestBucket>;
  /** Subset of pick records the operator may inspect. */
  readonly records: ReadonlyArray<BacktestPickRecord>;
}

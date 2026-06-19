/**
 * Galaxy Dynasty — grading adapter.
 *
 * The bible is explicit: "Do not reinvent grading — call into it." This adapter
 * is the clean seam between Galaxy Dynasty and the existing GSN/GSE engine. It
 * wraps `calculatePickResult` (the pick lifecycle settlement math) so a Signal
 * Check is graded by exactly the same logic that settles a published pick — no
 * second source of truth.
 *
 * Correctness (WIN/LOSS/PUSH) comes from the engine here; CALIBRATION (Brier,
 * XP) is computed in `calibration.ts`. Together they implement bible §4.1.
 */

import type { PickType } from "@sports/types";
import { calculatePickResult, type SettlementResult } from "@sports/prediction-engine";

export interface SignalPredictionInput {
  readonly pickType: PickType;
  /** The pick selection string, built the same way scoring builds it (e.g.
   * "Kansas City Chiefs -3.5", "OVER 47.5", "Buffalo Bills ML (+120)"). For
   * settlement, a HOME pick must START WITH the home team name; a TOTAL must
   * start with "OVER"/"UNDER". */
  readonly selection: string;
  /** Line in HOME-team perspective for SPREAD; the total for TOTAL; price for ML. */
  readonly line: number;
  readonly homeTeam: string;
}

export interface GameResult {
  readonly homeScore: number;
  readonly awayScore: number;
  /** Odds API sport key, e.g. "soccer_usa_mls" — drives soccer-draw ML handling. */
  readonly sportKey: string;
}

/**
 * Grade a Signal Check prediction against a final result using the real engine.
 * Returns the canonical settlement (WIN | LOSS | PUSH).
 */
export function gradeSignalPrediction(
  prediction: SignalPredictionInput,
  result: GameResult,
): SettlementResult {
  return calculatePickResult(
    prediction.pickType,
    prediction.selection,
    prediction.line,
    prediction.homeTeam,
    result.homeScore,
    result.awayScore,
    result.sportKey,
  );
}

export type { SettlementResult } from "@sports/prediction-engine";

/**
 * THE SIGNAL CHECK (bible §4.1 / §7) — the atomic unit of engagement.
 *
 * A quick, skill-based, engine-graded decision moment, reused everywhere: the
 * Academy, the War Room, the Blacktop, the PvM boss, the daily streak, and the
 * Signal Duel. A Signal Check is always: a prediction + a stated confidence →
 * graded → calibration-weighted XP/Credits → a transparent, auditable breakdown.
 *
 * This module composes the grading adapter (correctness) and the calibration
 * engine (reward) into one outcome with a glass-box breakdown (§4.3).
 */

import type { PickType } from "@sports/types";
import {
  gradeSignalPrediction,
  type SignalPredictionInput,
  type GameResult,
  type SettlementResult,
} from "./grading-adapter.js";
import { rewardForSignalCheck, type CalibrationReward } from "./calibration.js";

export type SignalCheckSurface =
  | "ACADEMY"
  | "WAR_ROOM"
  | "BLACKTOP"
  | "BOSS"
  | "DUEL"
  | "DAILY";

/** Per-surface reward multipliers (kept modest; the loop, not inflation, retains). */
const SURFACE_MULTIPLIER: Record<SignalCheckSurface, number> = {
  ACADEMY: 1,
  WAR_ROOM: 1,
  BLACKTOP: 0.6,
  BOSS: 1.25,
  DUEL: 1,
  DAILY: 0.75,
};

export interface SignalCheckBreakdownRow {
  readonly label: string;
  readonly value: string;
  readonly impact: "positive" | "neutral" | "negative";
}

export interface SignalCheckOutcome {
  readonly surface: SignalCheckSurface;
  readonly result: SettlementResult;
  /** True for WIN, false for LOSS, null for PUSH. */
  readonly correct: boolean | null;
  readonly confidence: number;
  readonly reward: CalibrationReward;
  /** Glass-box, line-by-line explanation for the result drawer. */
  readonly breakdown: readonly SignalCheckBreakdownRow[];
}

function buildBreakdown(
  surface: SignalCheckSurface,
  result: SettlementResult,
  confidence: number,
  reward: CalibrationReward,
): SignalCheckBreakdownRow[] {
  const rows: SignalCheckBreakdownRow[] = [
    {
      label: "Settlement",
      value: result,
      impact: result === "WIN" ? "positive" : result === "LOSS" ? "negative" : "neutral",
    },
    {
      label: "Stated confidence",
      value: `${Math.round(confidence)}%`,
      impact: "neutral",
    },
  ];
  if (reward.calibrationScore != null) {
    rows.push({
      label: "Calibration score",
      value: `${reward.calibrationScore}/100`,
      impact:
        reward.calibrationScore >= 70
          ? "positive"
          : reward.calibrationScore >= 40
            ? "neutral"
            : "negative",
    });
  }
  if (reward.brier != null) {
    rows.push({ label: "Brier", value: reward.brier.toString(), impact: "neutral" });
  }
  rows.push({ label: "XP", value: `+${reward.xp}`, impact: reward.xp > 0 ? "positive" : "neutral" });
  rows.push({
    label: "Credits",
    value: `+${reward.credits}`,
    impact: reward.credits > 0 ? "positive" : "neutral",
  });
  if (reward.sharpCall) {
    rows.push({ label: "Sharp call bonus", value: "applied", impact: "positive" });
  }
  return rows;
}

/**
 * Evaluate a Signal Check from an already-settled outcome (WIN/LOSS/PUSH).
 * The single composition point used by every surface.
 */
export function evaluateSignalCheck(
  surface: SignalCheckSurface,
  result: SettlementResult,
  confidence: number,
): SignalCheckOutcome {
  const multiplier = SURFACE_MULTIPLIER[surface];
  const reward = rewardForSignalCheck(result, confidence, multiplier);
  const correct = result === "PUSH" ? null : result === "WIN";
  return {
    surface,
    result,
    correct,
    confidence,
    reward,
    breakdown: buildBreakdown(surface, result, confidence, reward),
  };
}

/**
 * Grade a market-based Signal Check against a final game result, then evaluate.
 * Used by the War Room and the Signal Duel.
 */
export function gradeMarketSignalCheck(
  surface: SignalCheckSurface,
  prediction: SignalPredictionInput,
  gameResult: GameResult,
  confidence: number,
): SignalCheckOutcome {
  const result = gradeSignalPrediction(prediction, gameResult);
  return evaluateSignalCheck(surface, result, confidence);
}

/**
 * Grade a direct binary Signal Check (trivia / stat read on the Blacktop, or a
 * boss step where correctness is known directly). `correct` → WIN, else LOSS.
 */
export function gradeBinarySignalCheck(
  surface: SignalCheckSurface,
  correct: boolean,
  confidence: number,
): SignalCheckOutcome {
  return evaluateSignalCheck(surface, correct ? "WIN" : "LOSS", confidence);
}

export type { PickType, SignalPredictionInput, GameResult, SettlementResult };

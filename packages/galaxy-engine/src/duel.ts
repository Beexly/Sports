/**
 * Galaxy Dynasty — Signal Duel (async PvP, bible Stage 2 / Phase 4).
 *
 * Two players read the SAME game; each is graded by the engine, then scored on
 * outcome + calibration + process (the sharp-call signal). Higher duel score
 * wins; ties break to the better-calibrated read. Pure — the app persists the
 * duel rows and updates ratings via `rating.ts`.
 */

import type { SignalCheckOutcome } from "./signal-check.js";

export type DuelWinner = "CREATOR" | "OPPONENT" | "TIE";

export interface DuelEntryScore {
  /** Total duel points. */
  readonly points: number;
  /** Component breakdown for the glass box. */
  readonly outcomePoints: number;
  readonly calibrationPoints: number;
  readonly processPoints: number;
}

/**
 * Score one side of a duel from its Signal Check outcome.
 *   outcome:     WIN 100 · PUSH 40 · LOSS 0
 *   calibration: calibrationScore (0–100) × 0.5  → rewards knowing how sure you are
 *   process:     sharp call (+20) → correct AND made with conviction
 */
export function scoreDuelEntry(outcome: SignalCheckOutcome): DuelEntryScore {
  const outcomePoints = outcome.result === "WIN" ? 100 : outcome.result === "PUSH" ? 40 : 0;
  const calibrationPoints = Math.round((outcome.reward.calibrationScore ?? 50) * 0.5);
  const processPoints = outcome.reward.sharpCall ? 20 : 0;
  return {
    points: outcomePoints + calibrationPoints + processPoints,
    outcomePoints,
    calibrationPoints,
    processPoints,
  };
}

export interface DuelResolution {
  readonly winner: DuelWinner;
  readonly creator: DuelEntryScore;
  readonly opponent: DuelEntryScore;
  readonly margin: number;
  readonly rationale: string;
}

export function resolveDuel(
  creatorOutcome: SignalCheckOutcome,
  opponentOutcome: SignalCheckOutcome,
): DuelResolution {
  const creator = scoreDuelEntry(creatorOutcome);
  const opponent = scoreDuelEntry(opponentOutcome);
  let winner: DuelWinner;
  let rationale: string;

  if (creator.points !== opponent.points) {
    winner = creator.points > opponent.points ? "CREATOR" : "OPPONENT";
    rationale = `Decided on duel score (${creator.points} vs ${opponent.points}).`;
  } else {
    // Tie-break on calibration (the better-calibrated read wins).
    const cCal = creatorOutcome.reward.calibrationScore ?? 0;
    const oCal = opponentOutcome.reward.calibrationScore ?? 0;
    if (cCal === oCal) {
      winner = "TIE";
      rationale = "Dead even on score and calibration — a true draw.";
    } else {
      winner = cCal > oCal ? "CREATOR" : "OPPONENT";
      rationale = `Tied on score; the better-calibrated read won (${cCal} vs ${oCal}).`;
    }
  }

  return {
    winner,
    creator,
    opponent,
    margin: Math.abs(creator.points - opponent.points),
    rationale,
  };
}

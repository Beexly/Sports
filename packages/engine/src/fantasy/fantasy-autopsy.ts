/**
 * FANTASY DISCOVERY LAYER — Fantasy Autopsy (Invention F18).
 *
 * After the games, reconstruct whether the PROCESS was deserved BEFORE the outcome was known —
 * separating a sound decision that lost to variance from a lucky win on an unsound process. The
 * anti-overfit guard, exactly as in the betting autopsy: a role-grounded call that loses inside its
 * variance band emits NO lesson (sound process, unlucky box score). A single week can never move a
 * weight. Lessons come only from lucky wins, role-read errors, or process errors. Pure + deterministic.
 */

import type { FantasyAction } from "./fantasy-belief-state-transition.js";

const BUY_TYPES = new Set<FantasyAction>(["ADD", "START", "TRADE_FOR", "DFS_OVERWEIGHT", "BEST_BALL_TARGET", "DYNASTY_BUY"]);
const FADE_TYPES = new Set<FantasyAction>(["SIT", "DROP", "TRADE_AWAY", "DFS_FADE"]);

export interface FantasyAutopsyInput {
  readonly action: FantasyAction;
  readonly roleImpliedValue: number;       // truth at decision time, 0..1
  readonly marketBeliefAtDecision: number; // 0..1
  readonly knowableAtDecision: boolean;    // was it inside the light cone?
  readonly ghostMatched: boolean;          // did it resemble a buried trap?
  readonly expectedFantasyPoints: number;  // 0..1 role-implied expectation
  readonly outcomeFantasyPoints: number;   // 0..1 realized
  readonly varianceBand: number;           // 0..1 inherent week-to-week variance of the role
}

export type FantasyProcessVerdict = "deserved_win" | "deserved_loss" | "lucky_win" | "unlucky_loss" | "process_error";

export interface FantasyAutopsyResult {
  readonly verdict: FantasyProcessVerdict;
  readonly soundProcess: boolean;
  readonly outcomeDelta: number;
  readonly withinVariance: boolean;
  readonly emitsLesson: boolean;
  readonly note: string;
}

/** Reconstruct whether the decision deserved confidence before the result. */
export function fantasyAutopsy(i: FantasyAutopsyInput): FantasyAutopsyResult {
  const gap = i.roleImpliedValue - i.marketBeliefAtDecision;
  const wasUnderpriced = gap > 0.05;
  const directionSound = BUY_TYPES.has(i.action) ? wasUnderpriced : FADE_TYPES.has(i.action) ? !wasUnderpriced : Math.abs(gap) <= 0.12;
  const soundProcess = i.knowableAtDecision && !i.ghostMatched && directionSound;

  const outcomeDelta = Number((i.outcomeFantasyPoints - i.expectedFantasyPoints).toFixed(4));
  const withinVariance = Math.abs(outcomeDelta) <= i.varianceBand;

  let verdict: FantasyProcessVerdict;
  if (soundProcess && outcomeDelta >= 0) verdict = "deserved_win";
  else if (soundProcess && withinVariance) verdict = "unlucky_loss"; // sound process, variance loss — NO lesson
  else if (soundProcess && !withinVariance) verdict = "deserved_loss"; // role read was likely wrong — lesson
  else if (!soundProcess && outcomeDelta >= 0) verdict = "lucky_win"; // unsound process bailed out by variance — lesson
  else verdict = "process_error";

  const emitsLesson = verdict === "lucky_win" || verdict === "deserved_loss" || verdict === "process_error";
  return {
    verdict, soundProcess, outcomeDelta, withinVariance, emitsLesson,
    note: verdict === "unlucky_loss"
      ? "Sound, knowable, role-grounded process; loss is inside the variance band — NO lesson (do not overfit to one week)."
      : verdict === "deserved_win"
        ? "Sound process, deserved outcome — reinforce, no corrective lesson."
        : verdict === "lucky_win"
          ? "Unsound process rescued by variance — emit a lesson; do not repeat."
          : verdict === "deserved_loss"
            ? "Outcome fell outside the variance band — the role read was likely wrong; emit a lesson."
            : "Unsound process and bad outcome — emit a lesson.",
  };
}

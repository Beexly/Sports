/**
 * Game-script features: score-bug state → situational context vector.
 *
 * The score bug is free structured game state: quarter, clock, down,
 * distance, score, yard line. Game script (leading/trailing, clock,
 * field position) conditions everything — a team's 3rd-quarter play mix
 * when up 14 is not its 4th-quarter mix when down 4.
 *
 * Derived purely from PlayRecord's scorebug-flattened fields. No OCR
 * runs here; the OCR already happened upstream.
 *
 * Original implementation for GSE.
 */

import type { FilmPlayInput } from "./film-types.js";
import { filmProvenance, type FilmProvenance } from "./film-provenance.js";

export type FieldZone = "redzone" | "midfield" | "own-territory";

export interface GameScriptFeatures {
  readonly playId: string;
  readonly quarter: number | null;
  /** Seconds remaining in the quarter. */
  readonly clockSec: number | null;
  /** Possession score minus opponent score. */
  readonly scoreDiff: number | null;
  readonly down: number | null;
  readonly distanceYd: number | null;
  /** 0..100 from the possessing team's own goal line. */
  readonly yardLineOwn: number | null;
  readonly fieldZone: FieldZone | null;
  /** True when distance reads goal-to-go (distanceYd <= yard line to goal). */
  readonly goalToGo: boolean | null;
  /** True when clock <= 120s in Q2 or Q4. */
  readonly twoMinute: boolean | null;
  readonly lateDown: boolean | null;
  readonly provenance: FilmProvenance;
}

export function fieldZone(yardLineOwn: number | null): FieldZone | null {
  if (yardLineOwn == null) return null;
  if (yardLineOwn >= 80) return "redzone";
  if (yardLineOwn >= 50) return "midfield";
  return "own-territory";
}

/** Extract the game-script vector for one play. */
export function extractGameScript(play: FilmPlayInput): GameScriptFeatures {
  const zone = fieldZone(play.yardLineOwn);
  const goalToGo =
    play.distanceYd != null && play.yardLineOwn != null
      ? play.yardLineOwn + play.distanceYd >= 100
      : null;
  const twoMinute =
    play.clockSec != null && play.qtr != null
      ? play.clockSec <= 120 && (play.qtr === 2 || play.qtr === 4)
      : null;
  return {
    playId: play.playId,
    quarter: play.qtr,
    clockSec: play.clockSec,
    scoreDiff: play.scoreDiff,
    down: play.down,
    distanceYd: play.distanceYd,
    yardLineOwn: play.yardLineOwn,
    fieldZone: zone,
    goalToGo,
    twoMinute,
    lateDown: play.down != null ? play.down >= 3 : null,
    provenance: filmProvenance(1, play.playConfidence ?? 0.5),
  };
}

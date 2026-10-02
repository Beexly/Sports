/**
 * The Play object: the unit of football intelligence.
 *
 * Layer 1 (tracking) produces tracklets — dots on a field.
 * Layer 2 (perception, this package) turns tracklets into Plays.
 * Layer 3 (memory) accumulates Plays into tendencies.
 *
 * Everything downstream of a Play is derived, internal, and weight-zero
 * until validated. No raw frames are stored — intelligence only.
 *
 * Original implementation for GSE.
 */

import type { Formation } from "./cv-formation-classify.js";
import type { Route } from "./cv-route-extract.js";
import type { ScoreBugState } from "./cv-scorebug-ocr.js";
import type { SeparationMetrics } from "./cv-separation-metrics.js";
import type { PlayCommentary } from "./cv-audio-align.js";

export type PlayType =
  | "pass"
  | "run"
  | "play-action"
  | "screen"
  | "unknown";

/** A segmented play with all perception layers attached. */
export interface Play {
  /** `play_<gameId>_<n>` */
  readonly playId: string;
  readonly gameId: string;
  /** Snap timestamp, seconds from stream start. */
  readonly snapT: number;
  /** Whistle (play end) timestamp. */
  readonly endT: number;
  /** Start of the pre-snap set (or snapT - 2 for hurry-up). */
  readonly preSnapT: number;
  /** How the snap was found: clean pre-snap set vs hurry-up burst. */
  readonly snapKind: "set" | "hurry-up";
  /** Game state at the snap, from the score bug. Null when OCR unavailable. */
  readonly scoreBug: ScoreBugState | null;
  /** Formation classification at the set. Null when undecidable. */
  readonly formation: Formation | null;
  /** Per-eligible-receiver route classifications. */
  readonly routes: readonly Route[];
  /** Per-route separation / break-angle metrics. */
  readonly separation: readonly SeparationMetrics[];
  /** Aligned broadcast commentary. Null when no transcript. */
  readonly commentary: PlayCommentary | null;
  /** Coarse play-type call. */
  readonly playType: PlayType;
  /** Yards gained. Null until the result is observed. */
  readonly resultYards: number | null;
  /** Overall perception confidence, 0..1. */
  readonly confidence: number;
}

/** The flat record shape persisted to the play database (Layer 3). */
export interface PlayRecord {
  readonly playId: string;
  readonly gameId: string;
  readonly qtr: number | null;
  readonly clockSec: number | null;
  readonly down: number | null;
  readonly distanceYd: number | null;
  /** 0..100, yards from the possessing team's own goal line. */
  readonly yardLineOwn: number | null;
  readonly scoreDiff: number | null;
  readonly possession: string | null;
  readonly personnel: string | null;
  readonly backfield: string | null;
  readonly distribution: string | null;
  /** Canonical route names joined with '+', e.g. "go+slant+out". */
  readonly routeCombo: string | null;
  readonly playType: PlayType;
  readonly resultYards: number | null;
  readonly epa: number | null;
}

/** Flatten a Play into its database record shape. */
export function playToRecord(play: Play): PlayRecord {
  const sb = play.scoreBug;
  const routeCombo =
    play.routes.length > 0
      ? [...play.routes].map((r) => r.route).sort().join("+")
      : null;
  return {
    playId: play.playId,
    gameId: play.gameId,
    qtr: sb?.quarter ?? null,
    clockSec: sb?.clockSec ?? null,
    down: sb?.down ?? null,
    distanceYd: sb?.distanceYd ?? null,
    yardLineOwn:
      sb?.yardLine && sb.possession
        ? sb.yardLine.team === sb.possession
          ? sb.yardLine.yard
          : 100 - sb.yardLine.yard
        : null,
    scoreDiff:
      sb?.possession && sb.homeTeam && sb.awayTeam &&
      sb.homeScore != null && sb.awayScore != null
        ? sb.possession === sb.homeTeam
          ? sb.homeScore - sb.awayScore
          : sb.awayScore - sb.homeScore
        : null,
    possession: sb?.possession ?? null,
    personnel: play.formation?.personnel ?? null,
    backfield: play.formation?.backfield ?? null,
    distribution: play.formation?.distribution ?? null,
    routeCombo,
    playType: play.playType,
    resultYards: play.resultYards,
    epa: null,
  };
}

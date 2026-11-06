/**
 * Q43: QB EPA gained on defensive penalties (SHADOW)
 *
 * Identification Rule: accepted penalties on plays with no yards gained.
 * In pbp, this means penalty === 1 && penalty_team !== "" && penalty_team === defteam && yards_gained === 0.
 *
 * Exclusions & Floor:
 * - Minimum of 5 qualifying plays required to be emitted in a window.
 * - Missing own-EPA (null) are excluded from the EPA sum but counted in diagnostics.
 *
 * Source: @sfdata9ers 2026-10-17, INTEL BUILD Q43.
 */

import { ExpectedMetricProvenance, computeFeatureSchemaHash } from "./types.js";
import { round } from "./numeric.js";

/** A play in the QB Penalty EPA series. */
export interface QbPenaltyPlay {
  readonly playId: string;
  readonly game_id: string;
  readonly week: number;
  readonly posteam: string;
  readonly defteam: string;
  readonly passer_player_id: string;
  readonly penalty: 1 | 0;
  readonly penalty_team: string;
  readonly yards_gained: number;
  /** our EPA for the play, attached via attachOwnEpa; null means unratable */
  readonly epa: number | null;
}

export interface QbPenaltyEpaDiagnostics {
  readonly playsEvaluated: number;
  readonly belowFloorOmitted: number;
  readonly nullEpaOmitted: number;
  readonly invalidPenaltyPlaysOmitted: number;
}

export interface QbPenaltyEpaWindowOutput {
  readonly passer_player_id: string;
  readonly qualifyingPlays: number;
  readonly totalEpaGained: number;
  readonly epaPerGame: number;
  readonly games: number;
}

export interface QbPenaltyEpaResult {
  readonly window: "season-to-date" | "last-4" | "last-8";
  readonly asOfWeek: number;
  readonly players: readonly QbPenaltyEpaWindowOutput[];
  readonly diagnostics: QbPenaltyEpaDiagnostics;
  readonly provenance: ExpectedMetricProvenance;
}

/** Check if a play is a qualifying defensive penalty play. */
export function isQualifyingPenaltyPlay(play: QbPenaltyPlay): boolean {
  return (
    play.penalty === 1 &&
    play.penalty_team !== "" &&
    play.penalty_team === play.defteam &&
    play.yards_gained === 0
  );
}

/**
 * Computes QB Penalty EPA for a given point-in-time week.
 *
 * @param plays All penalty-eligible plays (MUST have a passer_player_id).
 * @param targetWeek The week to compute *prior* to (PIT discipline).
 * @param window The window type to compute over.
 */
export function computeQbPenaltyEpa(
  plays: readonly QbPenaltyPlay[],
  targetWeek: number,
  window: "season-to-date" | "last-4" | "last-8"
): QbPenaltyEpaResult {
  // 1. Enforce Point-in-Time discipline
  const pitPlays = plays.filter((p) => p.week < targetWeek);

  // 1b. Determine the global allowed weeks
  const globalDistinctWeeks = Array.from(new Set(pitPlays.map((p) => p.week))).sort((a, b) => b - a);
  let allowedWeeks = new Set<number>();

  if (window === "season-to-date") {
    allowedWeeks = new Set(globalDistinctWeeks);
  } else {
    const limit = window === "last-4" ? 4 : 8;
    allowedWeeks = new Set(globalDistinctWeeks.slice(0, limit));
  }

  // 2. Group by QB
  const qbPlays = new Map<string, QbPenaltyPlay[]>();
  for (const play of pitPlays) {
    if (!allowedWeeks.has(play.week)) continue;

    let bucket = qbPlays.get(play.passer_player_id);
    if (!bucket) {
      bucket = [];
      qbPlays.set(play.passer_player_id, bucket);
    }
    bucket.push(play);
  }

  const players: QbPenaltyEpaWindowOutput[] = [];
  let playsEvaluated = pitPlays.length; // Evaluate based on PIT plays
  let belowFloorOmitted = 0;
  let nullEpaOmitted = 0;
  let invalidPenaltyPlaysOmitted = 0;
  let totalQualifyingPlays = 0;

  // 3. Process per-QB
  for (const [passer_player_id, windowPlays] of qbPlays.entries()) {
    // Distinct game_ids among ALL of that QB's series rows in the window
    const distinctGames = new Set(windowPlays.map((p) => p.game_id)).size;

    let qualifyingPlays = 0;
    let totalEpaGained = 0;

    for (const play of windowPlays) {
      if (isQualifyingPenaltyPlay(play)) {
        qualifyingPlays++;
        if (play.epa !== null) {
          totalEpaGained += play.epa;
        } else {
          nullEpaOmitted++;
        }
      } else if (play.penalty === 1 && (play.penalty_team === "" || play.penalty_team === play.posteam)) {
        // Rows with penalty == 1 whose penalty_team is empty or equals posteam are never qualifying and are counted in diagnostics when they fall in the passer series.
        invalidPenaltyPlaysOmitted++;
      }
    }

    totalQualifyingPlays += qualifyingPlays;

    // 3b. Apply floor (>= 5 qualifying plays)
    if (qualifyingPlays < 5) {
      belowFloorOmitted++;
      continue;
    }

    players.push({
      passer_player_id,
      qualifyingPlays,
      totalEpaGained: round(totalEpaGained, 4),
      epaPerGame: round(totalEpaGained / distinctGames, 4),
      games: distinctGames,
    });
  }

  const featureKeys = ["penalty", "penalty_team", "defteam", "yards_gained", "epa"];

  return {
    window,
    asOfWeek: targetWeek,
    players: players.sort((a, b) => b.totalEpaGained - a.totalEpaGained),
    diagnostics: {
      playsEvaluated,
      belowFloorOmitted,
      nullEpaOmitted,
      invalidPenaltyPlaysOmitted,
    },
    provenance: {
      modelVersion: "1.0",
      method: "deterministic-rule",
      featureKeys,
      featureSchemaHash: computeFeatureSchemaHash(featureKeys),
      sampleSize: totalQualifyingPlays,
    },
  };
}

/**
 * Adjusted Net Yards per Attempt (ANY/A) — SHADOW module.
 *
 * ANY/A is the classic box-score QB efficiency yardstick:
 *   (passing_yards + 20 * passing_tds - 45 * interceptions - sack_yards) / (attempts + sacks)
 *
 * This module computes ANY/A deterministically from raw nflverse pbp, following
 * the same rules as the public web layer (which owns percentile presentation):
 *   - 'attempts' excludes sacks.
 *   - 'sacks' are pass plays where sack == "1".
 *   - 'passingYards' is summed over attempt rows ONLY (yards_gained on a sack
 *     row is negative sack yardage and must not double-count).
 *   - 'sackYards' is the positive magnitude of sack yardage lost.
 *   - 'passingTds' requires touchdown == "1" and td_team == posteam.
 *   - 'interceptions' requires interception == "1".
 *   - QB spikes are NOT excluded; they remain attempts matching PFR convention.
 *
 * Point-in-time disciplined: for an as-of week W, the windows (season-to-date,
 * last 4 games, last 8 games) use ONLY plays from weeks < W.
 *
 * Floor: a QB is reported only with >= 60 dropbacks (attempts + sacks) in the window.
 * Below-floor QBs are excluded and counted, never imputed. Null discipline: zero dropbacks
 * yields no record (never NaN or 0).
 */

import { round } from "./numeric.js";
import { computeFeatureSchemaHash, type ExpectedMetricProvenance } from "./types.js";

/** One play mapped for ANY/A computation. */
export interface AnyaPlay {
  /** `game_id`+"-"+`play_id`. */
  readonly playId: string;
  /** The week number of this play. */
  readonly week: number;
  /** The distinct game identifier. */
  readonly gameId: string;
  /** `passer_player_id`. Must be non-empty. */
  readonly passerId: string;
  /** `posteam`. */
  readonly posteam: string;
  /** `play_type`. */
  readonly playType: string;
  /** `sack` == "1". */
  readonly isSack: boolean;
  /** `passing_yards`. Finite value; null if missing. */
  readonly passingYards: number | null;
  /** `yards_gained`. */
  readonly yardsGained: number;
  /** `touchdown` == "1". */
  readonly touchdown: boolean;
  /** `td_team`. */
  readonly tdTeam: string;
  /** `interception` == "1". */
  readonly interception: boolean;
}

export const ANY_A_MODEL_VERSION = "gse-any-a-v1";

const ANY_A_FEATURE_KEYS = [
  "week",
  "passerId",
  "posteam",
  "playType",
  "isSack",
  "passingYards",
  "yardsGained",
  "touchdown",
  "tdTeam",
  "interception"
] as const;

/** A single QB's ANY/A record for a specific window. */
export interface AnyaRecord {
  readonly passerId: string;
  readonly asOfWeek: number;
  readonly windowType: "season-to-date" | "last-4" | "last-8";
  readonly dropbacks: number;
  readonly attempts: number;
  readonly sacks: number;
  readonly passingYards: number;
  readonly passingTds: number;
  readonly interceptions: number;
  readonly sackYards: number;
  readonly anyA: number;
  readonly provenance: ExpectedMetricProvenance;
}

export interface AnyaMetricsResult {
  readonly records: readonly AnyaRecord[];
  readonly counts: {
    readonly excludedBelowFloor: number;
  };
}

const MIN_DROPBACKS = 60;

function buildProvenance(sampleSize: number): ExpectedMetricProvenance {
  return {
    modelVersion: ANY_A_MODEL_VERSION,
    method: "deterministic-rule",
    featureKeys: [...ANY_A_FEATURE_KEYS],
    featureSchemaHash: computeFeatureSchemaHash(ANY_A_FEATURE_KEYS),
    sampleSize,
  };
}

interface QbAgg {
  attempts: number;
  sacks: number;
  passingYards: number;
  passingTds: number;
  interceptions: number;
  sackYards: number;
  playsIncluded: number;
}

function newAgg(): QbAgg {
  return { attempts: 0, sacks: 0, passingYards: 0, passingTds: 0, interceptions: 0, sackYards: 0, playsIncluded: 0 };
}

function processPlay(play: AnyaPlay, agg: QbAgg): void {
  if (play.playType !== "pass") return;

  agg.playsIncluded++;

  if (play.isSack) {
    agg.sacks++;
    // yard_gained on a sack is negative; sack yards lost is positive magnitude
    agg.sackYards += Math.max(0, -play.yardsGained);
  } else {
    agg.attempts++;
    if (play.passingYards !== null && Number.isFinite(play.passingYards)) {
      agg.passingYards += play.passingYards;
    }
    if (play.touchdown && play.tdTeam === play.posteam) {
      agg.passingTds++;
    }
    if (play.interception) {
      agg.interceptions++;
    }
  }
}

/**
 * Calculates ANY/A metrics for a specific as-of week, point-in-time disciplined.
 *
 * @param plays All plays available up to this point. Function filters to strictly < asOfWeek.
 * @param asOfWeek The week for which we are calculating the metric (plays from this week or later are ignored).
 */
export function computeAnya(plays: readonly AnyaPlay[], asOfWeek: number): AnyaMetricsResult {
  // 1. Filter point-in-time: strictly weeks < asOfWeek
  const eligiblePlays = plays.filter(p => p.week < asOfWeek && p.passerId !== "");

  // 2. Group plays by passerId, then by gameId to handle distinct games
  const playsByPasser = new Map<string, AnyaPlay[]>();
  for (const p of eligiblePlays) {
    let arr = playsByPasser.get(p.passerId);
    if (!arr) {
      arr = [];
      playsByPasser.set(p.passerId, arr);
    }
    arr.push(p);
  }

  const records: AnyaRecord[] = [];
  let excludedBelowFloor = 0;

  for (const [passerId, passerPlays] of playsByPasser) {
    // Sort plays by week, then gameId (this naturally groups games chronologically)
    passerPlays.sort((a, b) => a.week - b.week || (a.gameId < b.gameId ? -1 : 1));

    // Identify distinct games in chronological order
    const games: AnyaPlay[][] = [];
    let currentGame: AnyaPlay[] = [];
    let currentGameId = "";

    for (const p of passerPlays) {
      if (p.gameId !== currentGameId) {
        if (currentGame.length > 0) {
          games.push(currentGame);
        }
        currentGame = [];
        currentGameId = p.gameId;
      }
      currentGame.push(p);
    }
    if (currentGame.length > 0) {
      games.push(currentGame);
    }

    // Season-to-date
    const stdAgg = newAgg();
    for (const game of games) {
      for (const p of game) processPlay(p, stdAgg);
    }
    processAgg(stdAgg, "season-to-date");

    // Last 4 distinct games
    const last4Games = games.slice(-4);
    const last4Agg = newAgg();
    for (const game of last4Games) {
      for (const p of game) processPlay(p, last4Agg);
    }
    processAgg(last4Agg, "last-4");

    // Last 8 distinct games
    const last8Games = games.slice(-8);
    const last8Agg = newAgg();
    for (const game of last8Games) {
      for (const p of game) processPlay(p, last8Agg);
    }
    processAgg(last8Agg, "last-8");

    function processAgg(agg: QbAgg, windowType: "season-to-date" | "last-4" | "last-8") {
      const dropbacks = agg.attempts + agg.sacks;
      if (dropbacks === 0) return; // Null discipline: no record if zero dropbacks

      if (dropbacks < MIN_DROPBACKS) {
        excludedBelowFloor++;
        return;
      }

      const anyA = (agg.passingYards + 20 * agg.passingTds - 45 * agg.interceptions - agg.sackYards) / dropbacks;

      records.push({
        passerId,
        asOfWeek,
        windowType,
        dropbacks,
        attempts: agg.attempts,
        sacks: agg.sacks,
        passingYards: agg.passingYards,
        passingTds: agg.passingTds,
        interceptions: agg.interceptions,
        sackYards: agg.sackYards,
        anyA: round(anyA, 4),
        provenance: buildProvenance(agg.playsIncluded)
      });
    }
  }

  return { records, counts: { excludedBelowFloor } };
}

/**
 * Target Success Rate — a deterministic, closed-form metric.
 *
 * Target Success is defined as the share of targets producing a positive own EPA
 * (> 0). This is based on the source card's EPA-based definition (share of targets
 * producing positive EPA), NOT the down-conditioned yardage success rule in
 * success-rate.ts.
 *
 * A 'target' is explicitly defined as a row with play_type == "pass" and a
 * non-empty receiver_player_id. Pass rows with an empty receiver_player_id
 * (throwaways, spikes, batted balls) are not targets. Interceptions ARE targets.
 *
 * Targets whose own EPA is EXACTLY 0 are NOT successes.
 * Targets whose own EPA is null are excluded from BOTH numerator and denominator,
 * and counted in diagnostics.
 *
 * EPA = the engine's OWN EPA attached via `attachOwnEpa` (never the referee column).
 *
 * No position split in v1.
 */

import { round } from "./numeric.js";
import { computeFeatureSchemaHash, type ExpectedMetricProvenance } from "./types.js";
import { SUCCESS_RATE_MODEL_VERSION } from "./success-rate.js";

/** One play mapped from nflverse play-by-play row for Target Success. */
export interface TargetPlay {
  /** `game_id`+"-"+`play_id` */
  readonly playId: string;
  /** `week` */
  readonly week: number;
  /** `season` */
  readonly season: number;
  /** `play_type` */
  readonly playType: string;
  /** `receiver_player_id`, "" if empty */
  readonly receiverId: string;
  /** `interception` */
  readonly interception: 0 | 1;
  /** Our EPA for the play, attached via attachOwnEpa; null means unratable */
  readonly epa: number | null;
}

export const TARGET_SUCCESS_FEATURE_KEYS = ["epa"] as const;

export interface TargetSuccessDiagnostics {
  readonly nullEpaExcluded: number;
  readonly belowFloorExcluded: number;
}

export interface TargetSuccessSplit {
  readonly playerId: string;
  readonly window: "season-to-date" | "last-4" | "last-8";
  readonly ratedTargets: number;
  readonly successfulTargets: number;
  readonly rawTargetSuccessRate: number;
  readonly leagueMeanRate: number;
  readonly shrunkTargetSuccessRate: number;
  readonly provenance: ExpectedMetricProvenance;
}

export interface TargetSuccessResult {
  readonly splits: readonly TargetSuccessSplit[];
  readonly diagnostics: TargetSuccessDiagnostics;
}

/**
 * Validates if the play is a target.
 */
function isTarget(play: TargetPlay): boolean {
  return play.playType === "pass" && play.receiverId.length > 0;
}

/**
 * Checks if the target is successful based on own EPA.
 * Returns null if own EPA is null.
 */
function isSuccessfulTarget(play: TargetPlay): boolean | null {
  if (play.epa === null) return null;
  return play.epa > 0;
}

function buildProvenance(sampleSize: number): ExpectedMetricProvenance {
  return {
    modelVersion: SUCCESS_RATE_MODEL_VERSION, // using same model version as it's a deterministic rule, or define a new one if needed, but instructions say SUCCESS_RATE_MODEL_VERSION
    method: "deterministic-rule",
    featureKeys: [...TARGET_SUCCESS_FEATURE_KEYS],
    featureSchemaHash: computeFeatureSchemaHash(TARGET_SUCCESS_FEATURE_KEYS),
    sampleSize,
  };
}

export function computeTargetSuccess(
  plays: readonly TargetPlay[],
  targetSeason: number,
  targetWeek: number,
  minRatedTargets: number = 20
): TargetSuccessResult {
  // Point-in-time discipline: strictly before targetWeek
  const windowPlays = plays.filter(p => p.season === targetSeason && p.week < targetWeek);

  let nullEpaExcluded = 0;
  let belowFloorExcludedCount = 0;

  // Grouping by player, and by distinct week (for last-N windows)
  const playerPlays = new Map<string, TargetPlay[]>();

  for (const play of windowPlays) {
    if (!isTarget(play)) continue;
    if (play.epa === null) {
      nullEpaExcluded++;
      continue;
    }
    const arr = playerPlays.get(play.receiverId) ?? [];
    arr.push(play);
    playerPlays.set(play.receiverId, arr);
  }

  // Pre-calculate windows for each player
  const calculateWindowStats = (playerTargets: TargetPlay[], weeksToInclude?: number) => {
    let targetsToUse = playerTargets;
    if (weeksToInclude !== undefined) {
      const distinctWeeks = Array.from(new Set(playerTargets.map(t => t.week))).sort((a, b) => b - a); // desc
      const includedWeeks = new Set(distinctWeeks.slice(0, weeksToInclude));
      targetsToUse = playerTargets.filter(t => includedWeeks.has(t.week));
    }

    let successes = 0;
    for (const t of targetsToUse) {
      if (isSuccessfulTarget(t) === true) {
        successes++;
      }
    }
    return {
      ratedTargets: targetsToUse.length,
      successfulTargets: successes
    };
  };

  const windows = ["season-to-date", "last-4", "last-8"] as const;
  const rawStatsByWindow = new Map<string, { playerId: string, ratedTargets: number, successfulTargets: number }[]>();

  for (const w of windows) {
    rawStatsByWindow.set(w, []);
  }

  for (const [playerId, targets] of playerPlays) {
    const stdStats = calculateWindowStats(targets);
    rawStatsByWindow.get("season-to-date")!.push({ playerId, ...stdStats });

    const l4Stats = calculateWindowStats(targets, 4);
    rawStatsByWindow.get("last-4")!.push({ playerId, ...l4Stats });

    const l8Stats = calculateWindowStats(targets, 8);
    rawStatsByWindow.get("last-8")!.push({ playerId, ...l8Stats });
  }

  const splits: TargetSuccessSplit[] = [];

  for (const window of windows) {
    const playerStats = rawStatsByWindow.get(window)!;

    // Filter floor
    const qualifiedPlayers = playerStats.filter(s => s.ratedTargets >= minRatedTargets);
    belowFloorExcludedCount += playerStats.filter(s => s.ratedTargets > 0 && s.ratedTargets < minRatedTargets).length;

    if (qualifiedPlayers.length === 0) continue;

    // Calculate window league mean over floor-qualifying players
    let totalWindowTargets = 0;
    let totalWindowSuccesses = 0;
    for (const qs of qualifiedPlayers) {
      totalWindowTargets += qs.ratedTargets;
      totalWindowSuccesses += qs.successfulTargets;
    }
    const leagueMeanRate = totalWindowTargets > 0 ? totalWindowSuccesses / totalWindowTargets : 0;

    for (const qs of qualifiedPlayers) {
      const t = qs.ratedTargets;
      const rawTargetSuccessRate = qs.successfulTargets / t;
      const shrunkTargetSuccessRate = leagueMeanRate + (t / (t + 20)) * (rawTargetSuccessRate - leagueMeanRate);

      splits.push({
        playerId: qs.playerId,
        window,
        ratedTargets: t,
        successfulTargets: qs.successfulTargets,
        rawTargetSuccessRate: round(rawTargetSuccessRate, 4),
        leagueMeanRate: round(leagueMeanRate, 4),
        shrunkTargetSuccessRate: round(shrunkTargetSuccessRate, 4),
        provenance: buildProvenance(t),
      });
    }
  }

  // Sort outputs for determinism
  splits.sort((a, b) => a.window.localeCompare(b.window) || a.playerId.localeCompare(b.playerId));

  return {
    splits,
    diagnostics: {
      nullEpaExcluded,
      belowFloorExcluded: belowFloorExcludedCount,
    }
  };
}

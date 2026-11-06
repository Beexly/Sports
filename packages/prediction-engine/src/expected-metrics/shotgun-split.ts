/**
 * Shotgun vs Under-Center Formation Efficiency (SHADOW expected metric).
 *
 * Computes the per-QB efficiency split (EPA/dropback and Success Rate) by formation
 * (shotgun vs under-center). This is a deterministic summary metric, evaluating whether
 * a QB's efficiency materially changes based on where they take the snap.
 *
 * Dropback definition: pass attempts + sacks + QB scrambles. Runs by RBs and designed
 * QB runs are NOT considered dropbacks and are out of scope. Scrambles count in the
 * formation they started from.
 *
 * This metric uses the engine's OWN EPA, passed in from upstream (the mapper),
 * rather than nflverse's referee EPA.
 *
 * Evaluated on rolling windows: last 4 games, last 8 games, and season-to-date,
 * strictly point-in-time disciplined (only plays before the target week).
 * Small sample shrinkage is applied: arm EPA is shrunk toward the QB's overall EPA
 * using weight n / (n + 20).
 */

import { round } from "./numeric.js";
import { computeFeatureSchemaHash, type ExpectedMetricProvenance } from "./types.js";
import { isSuccessfulPlay, type SuccessPlay } from "./success-rate.js";

/** One play evaluated for formation splits. */
export interface FormationDropbackPlay {
  /** `game_id`+"-"+`play_id` — join/audit key, not a feature. */
  readonly playId: string;
  /** Passer gsis id (`passer_player_id`, or `rusher_player_id` for scrambles). */
  readonly passerId: string;
  /** Season of the play. */
  readonly season: number;
  /** Week of the play. */
  readonly week: number;
  /** Engine's own EPA for the play (post-fit attached), or null. */
  readonly epa: number | null;
  /** Shotgun snap (`shotgun`), 0/1. */
  readonly shotgun: 0 | 1;
  /** Whether the play is a qualifying dropback (pass attempt, sack, or qb scramble). */
  readonly isDropback: boolean;
  /** The underlying play used for success rate evaluation, if available. */
  readonly successPlay: SuccessPlay | null;
}

export const SHOTGUN_SPLIT_MODEL_VERSION = "gse-shotgun-split-v1";

/** Minimum total dropbacks required to report any split for a QB. */
export const MIN_DROPBACKS_OVERALL = 40;
/** Minimum dropbacks required in a specific formation arm to report that arm's metrics. */
export const MIN_DROPBACKS_PER_ARM = 15;
/** Shrinkage factor k: n / (n + k) weight toward overall mean. */
export const SHRINKAGE_K = 20;

export interface ShotgunSplitArm {
  readonly plays: number;
  /** Mean EPA per dropback, shrunk toward the QB's overall mean. null if plays < floor. */
  readonly epaPerDropback: number | null;
  /** Raw success rate. null if plays < floor. */
  readonly successRate: number | null;
}

export interface QbShotgunSplit {
  readonly passerId: string;
  readonly targetSeason: number;
  readonly targetWeek: number;
  readonly windowPlays: number;
  readonly shotgunRate: number;
  readonly underCenterRate: number;
  readonly overallEpaPerDropback: number;
  readonly overallSuccessRate: number;
  readonly shotgun: ShotgunSplitArm;
  readonly underCenter: ShotgunSplitArm;
  /** underCenter EPA - shotgun EPA. null if either arm is null. */
  readonly epaDifferential: number | null;
  /** underCenter SR - shotgun SR. null if either arm is null. */
  readonly successRateDifferential: number | null;
  readonly provenance: ExpectedMetricProvenance;
}

/**
 * Computes point-in-time QB shotgun vs under-center splits.
 *
 * @param plays The universe of candidate plays. Must carry the engine's OWN EPA.
 * @param targetSeason The season to evaluate for.
 * @param targetWeek The week to evaluate for (plays >= this week are excluded).
 * @param windowGames How many recent games to include (e.g. 4, 8, or Infinity for season-to-date).
 */
export function computeShotgunSplit(
  plays: readonly FormationDropbackPlay[],
  targetSeason: number,
  targetWeek: number,
  windowGames: number
): QbShotgunSplit[] {
  // 1. Filter PIT + target season
  const pitPlays = plays.filter(p => p.season === targetSeason && p.week < targetWeek && p.isDropback);

  // Group by passer to find their recent games and apply the window
  const playsByPasser = new Map<string, FormationDropbackPlay[]>();
  for (const p of pitPlays) {
    let arr = playsByPasser.get(p.passerId);
    if (!arr) {
      arr = [];
      playsByPasser.set(p.passerId, arr);
    }
    arr.push(p);
  }

  // Define schema hash once per run
  const schemaKeys = ["shotgun", "isDropback", "epa", "successPlay"] as const;
  let totalUsable = 0;

  const results: QbShotgunSplit[] = [];

  for (const [passerId, passerPlays] of playsByPasser.entries()) {
    // Sort plays by week ascending to find the rolling window
    // (In reality nflverse pbp is already chronologically sorted by game_id/play_id,
    // but we explicitly group by week to find the distinct game weeks for the window).
    // Note: a QB might have bye weeks or missed games, so we find their last N active weeks.

    // Actually, nflverse doesn't give us game index per player trivially,
    // but the target is "last 4 games" for the individual player. We can group their plays by gameId
    // or by week. Since we have week, we'll use distinct weeks as a proxy for "games".
    const distinctWeeks = Array.from(new Set(passerPlays.map(p => p.week))).sort((a, b) => a - b);
    const windowWeeks = distinctWeeks.slice(-windowGames);
    const windowMinWeek = windowWeeks.length > 0 ? windowWeeks[0]! : 999;

    const windowPlays = passerPlays.filter(p => p.week >= windowMinWeek);

    if (windowPlays.length < MIN_DROPBACKS_OVERALL) continue;

    let overallEpaSum = 0;
    let overallEpaCount = 0;
    let overallSuccesses = 0;
    let overallSuccessCount = 0;

    let sgPlays = 0;
    let sgEpaSum = 0;
    let sgEpaCount = 0;
    let sgSuccesses = 0;
    let sgSuccessCount = 0;

    let ucPlays = 0;
    let ucEpaSum = 0;
    let ucEpaCount = 0;
    let ucSuccesses = 0;
    let ucSuccessCount = 0;

    for (const play of windowPlays) {
      totalUsable++;
      const isSg = play.shotgun === 1;

      if (isSg) sgPlays++; else ucPlays++;

      if (play.epa !== null && Number.isFinite(play.epa)) {
        overallEpaSum += play.epa;
        overallEpaCount++;
        if (isSg) { sgEpaSum += play.epa; sgEpaCount++; }
        else { ucEpaSum += play.epa; ucEpaCount++; }
      }

      if (play.successPlay !== null) {
        const success = isSuccessfulPlay(play.successPlay);
        if (success !== null) {
          overallSuccesses += success ? 1 : 0;
          overallSuccessCount++;
          if (isSg) { sgSuccesses += success ? 1 : 0; sgSuccessCount++; }
          else { ucSuccesses += success ? 1 : 0; ucSuccessCount++; }
        }
      }
    }

    const overallEpaPerDropback = overallEpaCount > 0 ? overallEpaSum / overallEpaCount : 0;
    const overallSuccessRate = overallSuccessCount > 0 ? overallSuccesses / overallSuccessCount : 0;

    const computeArm = (playsTotal: number, epaSum: number, epaCount: number, successes: number, successCount: number): ShotgunSplitArm => {
      if (playsTotal < MIN_DROPBACKS_PER_ARM) {
        return { plays: playsTotal, epaPerDropback: null, successRate: null };
      }

      const rawEpa = epaCount > 0 ? epaSum / epaCount : overallEpaPerDropback;
      const weight = epaCount / (epaCount + SHRINKAGE_K);
      const shrunkEpa = weight * rawEpa + (1 - weight) * overallEpaPerDropback;

      const rawSr = successCount > 0 ? successes / successCount : null;

      return {
        plays: playsTotal,
        epaPerDropback: round(shrunkEpa, 4),
        successRate: rawSr !== null ? round(rawSr, 4) : null
      };
    };

    const sgArm = computeArm(sgPlays, sgEpaSum, sgEpaCount, sgSuccesses, sgSuccessCount);
    const ucArm = computeArm(ucPlays, ucEpaSum, ucEpaCount, ucSuccesses, ucSuccessCount);

    let epaDiff: number | null = null;
    let srDiff: number | null = null;

    if (sgArm.epaPerDropback !== null && ucArm.epaPerDropback !== null) {
      epaDiff = round(ucArm.epaPerDropback - sgArm.epaPerDropback, 4);
    }
    if (sgArm.successRate !== null && ucArm.successRate !== null) {
      srDiff = round(ucArm.successRate - sgArm.successRate, 4);
    }

    // Pass the actual usable count for this player's window into the provenance
    // The metric provenance is per-metric call, so it uses totalUsable across all QBs.

    results.push({
      passerId,
      targetSeason,
      targetWeek,
      windowPlays: windowPlays.length,
      overallEpaPerDropback: round(overallEpaPerDropback, 4),
      overallSuccessRate: round(overallSuccessRate, 4),
      shotgunRate: round(sgPlays / windowPlays.length, 4),
      underCenterRate: round(ucPlays / windowPlays.length, 4),
      shotgun: sgArm,
      underCenter: ucArm,
      epaDifferential: epaDiff,
      successRateDifferential: srDiff,
      provenance: {
        modelVersion: SHOTGUN_SPLIT_MODEL_VERSION,
        method: "deterministic-rule",
        featureKeys: schemaKeys,
        featureSchemaHash: computeFeatureSchemaHash(schemaKeys),
        sampleSize: 0, // will patch this after the loop
      }
    });
  }

  // Deterministic sort: targetSeason desc, targetWeek desc, windowPlays desc, passerId asc
  results.sort((a, b) => {
    if (a.targetSeason !== b.targetSeason) return b.targetSeason - a.targetSeason;
    if (a.targetWeek !== b.targetWeek) return b.targetWeek - a.targetWeek;
    if (a.windowPlays !== b.windowPlays) return b.windowPlays - a.windowPlays;
    return a.passerId < b.passerId ? -1 : a.passerId > b.passerId ? 1 : 0;
  });

  const finalProvenance: ExpectedMetricProvenance = {
    modelVersion: SHOTGUN_SPLIT_MODEL_VERSION,
    method: "deterministic-rule",
    featureKeys: schemaKeys,
    featureSchemaHash: computeFeatureSchemaHash(schemaKeys),
    sampleSize: totalUsable,
  };

  return results.map(r => ({ ...r, provenance: finalProvenance }));
}

/**
 * Third-down target share (SHADOW).
 *
 * Computes a receiver's target share strictly on 3rd down vs other downs (1, 2, 4),
 * and the differential. This answers a clutch-usage question: who does the QB
 * trust when the drive is on the line?
 *
 * A "target" is defined strictly as a pass play with a non-empty `receiver_player_id`.
 * Pass plays with an empty receiver id (throwaways, spikes), sacks, and scrambles
 * are excluded from every numerator and denominator.
 *
 * position-agnostic: WR, TE, RB are all eligible; the caller is responsible for
 * position filtering.
 */

import { round } from "./numeric.js";
import { computeFeatureSchemaHash, type ExpectedMetricProvenance } from "./types.js";

export const THIRD_DOWN_TARGET_SHARE_MODEL_VERSION = "gse-third-down-target-share-v1";
const THIRD_DOWN_TARGET_SHARE_FEATURE_KEYS = ["down", "play_type", "receiver_player_id"] as const;

export interface ThirdDownTargetPlay {
  readonly playId: string;
  readonly teamId: string;
  readonly playerId: string; // The targeted receiver, or "" if none
  readonly down: number;
  readonly season: number;
  readonly week: number;
  readonly isTarget: boolean; // true if play_type === "pass" and playerId !== ""
}

export interface ThirdDownTargetShareResult {
  readonly playerId: string;
  readonly thirdDownTargets: number;
  readonly teamThirdDownTargets: number;
  readonly thirdDownShare: number | null; // null if floor not met
  readonly otherDownTargets: number;
  readonly teamOtherDownTargets: number;
  readonly otherDownShare: number | null; // null if floor not met
  readonly differential: number | null; // thirdDownShare - otherDownShare
  readonly shrunkDifferential: number | null; // shrunk toward 0
  readonly provenance: ExpectedMetricProvenance;
}

function buildProvenance(sampleSize: number): ExpectedMetricProvenance {
  return {
    modelVersion: THIRD_DOWN_TARGET_SHARE_MODEL_VERSION,
    method: "deterministic-rule",
    featureKeys: [...THIRD_DOWN_TARGET_SHARE_FEATURE_KEYS],
    featureSchemaHash: computeFeatureSchemaHash(THIRD_DOWN_TARGET_SHARE_FEATURE_KEYS),
    sampleSize,
  };
}

/** Grouping options for rolling windows. */
export type TargetShareWindow = "season-to-date" | "rolling-4" | "rolling-8";

/** Group plays by player within a specific window logic. */
export function computeThirdDownTargetShare(
  plays: readonly ThirdDownTargetPlay[],
  window: TargetShareWindow,
  targetSeason: number,
  targetWeek: number,
): ThirdDownTargetShareResult[] {
  // Point-in-time filter: strictly before targetWeek in targetSeason
  const filtered = plays.filter((p) => {
    if (p.season !== targetSeason) return false;
    return p.season * 100 + p.week < targetSeason * 100 + targetWeek;
  });

  // Collect distinct games (weeks) per team to handle rolling windows
  const distinctWeeksByTeam = new Map<string, number[]>();
  for (const p of filtered) {
    let weeks = distinctWeeksByTeam.get(p.teamId);
    if (!weeks) {
      weeks = [];
      distinctWeeksByTeam.set(p.teamId, weeks);
    }
    if (!weeks.includes(p.week)) {
      weeks.push(p.week);
    }
  }

  const teamWindowWeeks = new Map<string, number[]>();
  for (const [teamId, weeks] of distinctWeeksByTeam.entries()) {
    weeks.sort((a, b) => a - b);
    let windowWeeks = weeks;
    if (window === "rolling-4") {
      windowWeeks = weeks.slice(-4);
    } else if (window === "rolling-8") {
      windowWeeks = weeks.slice(-8);
    }
    teamWindowWeeks.set(teamId, windowWeeks);
  }

  // Filter plays strictly within the rolling window
  const windowPlays = filtered.filter((p) => {
    const validWeeks = teamWindowWeeks.get(p.teamId) ?? [];
    return validWeeks.includes(p.week);
  });

  let validTargets = 0;

  // Aggregate target counts
  const teamThirdDownTargets = new Map<string, number>();
  const teamOtherDownTargets = new Map<string, number>();
  const playerThirdDownTargets = new Map<string, number>();
  const playerOtherDownTargets = new Map<string, number>();

  for (const p of windowPlays) {
    if (!p.isTarget) continue;
    validTargets++;

    if (p.down === 3) {
      teamThirdDownTargets.set(p.teamId, (teamThirdDownTargets.get(p.teamId) ?? 0) + 1);
      if (p.playerId) {
        playerThirdDownTargets.set(p.playerId, (playerThirdDownTargets.get(p.playerId) ?? 0) + 1);
      }
    } else if (p.down === 1 || p.down === 2 || p.down === 4) {
      teamOtherDownTargets.set(p.teamId, (teamOtherDownTargets.get(p.teamId) ?? 0) + 1);
      if (p.playerId) {
        playerOtherDownTargets.set(p.playerId, (playerOtherDownTargets.get(p.playerId) ?? 0) + 1);
      }
    }
  }

  const provenance = buildProvenance(validTargets);

  // Identify all unique players
  const playerIds = new Set([
    ...playerThirdDownTargets.keys(),
    ...playerOtherDownTargets.keys(),
  ]);

  const teamIdsByPlayer = new Map<string, string>();
  for (const p of windowPlays) {
    if (p.playerId && p.isTarget) {
      teamIdsByPlayer.set(p.playerId, p.teamId);
    }
  }

  const results: ThirdDownTargetShareResult[] = [];

  for (const playerId of playerIds) {
    const teamId = teamIdsByPlayer.get(playerId) ?? "";
    const pThirdTargets = playerThirdDownTargets.get(playerId) ?? 0;
    const pOtherTargets = playerOtherDownTargets.get(playerId) ?? 0;
    const tThirdTargets = teamThirdDownTargets.get(teamId) ?? 0;
    const tOtherTargets = teamOtherDownTargets.get(teamId) ?? 0;

    let thirdDownShare: number | null = null;
    let otherDownShare: number | null = null;
    let differential: number | null = null;
    let shrunkDifferential: number | null = null;

    const totalTargets = pThirdTargets + pOtherTargets;

    if (pThirdTargets >= 10 && totalTargets >= 30) {
      thirdDownShare = tThirdTargets > 0 ? pThirdTargets / tThirdTargets : 0;
      otherDownShare = tOtherTargets > 0 ? pOtherTargets / tOtherTargets : 0;
      differential = thirdDownShare - otherDownShare;
      shrunkDifferential = differential * (pThirdTargets / (pThirdTargets + 20));

      thirdDownShare = round(thirdDownShare, 4);
      otherDownShare = round(otherDownShare, 4);
      differential = round(differential, 4);
      shrunkDifferential = round(shrunkDifferential, 4);
    }

    results.push({
      playerId,
      thirdDownTargets: pThirdTargets,
      teamThirdDownTargets: tThirdTargets,
      thirdDownShare,
      otherDownTargets: pOtherTargets,
      teamOtherDownTargets: tOtherTargets,
      otherDownShare,
      differential,
      shrunkDifferential,
      provenance,
    });
  }

  // Deterministic sort: ascending by playerId
  results.sort((a, b) => (a.playerId < b.playerId ? -1 : 1));

  return results;
}

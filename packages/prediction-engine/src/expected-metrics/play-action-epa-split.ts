/**
 * Play-action EPA split (SHADOW expected metric).
 *
 * Deterministic rule-based metric that computes raw and shrunk EPA per dropback
 * split by the presence of a play-action fake.
 *
 * Dropback population: play_type == "pass" and non-empty posteam.
 * Excludes QB spikes (qb_spike == 1). Sacks are included.
 *
 * Point-in-time windows: season-to-date, last-4, last-8 distinct weeks below the
 * target week.
 */

import { round } from "./numeric.js";
import { computeFeatureSchemaHash, type ExpectedMetricProvenance } from "./types.js";

export const PLAY_ACTION_EPA_SPLIT_VERSION = "gse-pa-epa-v1";
const PLAY_ACTION_FEATURE_KEYS = ["week", "passer_player_id", "play_action", "qb_spike", "play_type", "epa"] as const;

export interface PlayActionDropbackPlay {
  readonly playId: string;
  readonly passerId: string; // passer_player_id
  readonly teamId: string; // posteam
  readonly week: number; // week
  readonly playAction: 0 | 1 | null; // play_action
  readonly qbSpike: 0 | 1 | null; // qb_spike
  readonly playType: string; // play_type
  readonly epa: number | null; // attached via attachOwnEpa
}

export interface PlayActionEpaArm {
  readonly dropbacks: number;
  readonly rawEpaPerDropback: number;
  readonly shrunkEpaPerDropback: number;
}

export interface PlayActionEpaSplitWindow {
  readonly window: "season-to-date" | "last-4-weeks" | "last-8-weeks";
  readonly targetWeek: number;
  readonly ratableDropbacks: number;
  readonly playActionRate: number | null;
  readonly playActionArm: PlayActionEpaArm | null;
  readonly nonPlayActionArm: PlayActionEpaArm | null;
  readonly paEpaDifferential: number | null; // PA - non-PA (shrunk)
  readonly diagnostics: {
    readonly excludedMissingPlayAction: number;
    readonly excludedNullEpa: number;
    readonly excludedQbSpike: number;
    readonly excludedMissingPasserId: number; // For QB grain only
  };
}

export interface PlayerPlayActionEpaSplit {
  readonly playerId: string;
  readonly teamId: string;
  readonly windows: readonly PlayActionEpaSplitWindow[];
  readonly provenance: ExpectedMetricProvenance;
}

export interface TeamPlayActionEpaSplit {
  readonly teamId: string;
  readonly windows: readonly PlayActionEpaSplitWindow[];
  readonly provenance: ExpectedMetricProvenance;
}

// Shrinkage applies with N/(N+20) targeting the league-wide arm mean in that window.
const SHRINKAGE_CONSTANT = 20;

function distinctWeeksBefore(plays: readonly PlayActionDropbackPlay[], targetWeek: number): number[] {
  const weeks = new Set<number>();
  for (const play of plays) {
    if (play.week < targetWeek) {
      weeks.add(play.week);
    }
  }
  return Array.from(weeks).sort((a, b) => b - a); // descending
}

function getPlaysForWindow(
  plays: readonly PlayActionDropbackPlay[],
  targetWeek: number,
  windowType: "season-to-date" | "last-4-weeks" | "last-8-weeks"
): readonly PlayActionDropbackPlay[] {
  if (windowType === "season-to-date") {
    return plays.filter(p => p.week < targetWeek);
  }

  const distinctWeeks = distinctWeeksBefore(plays, targetWeek);
  const nWeeks = windowType === "last-4-weeks" ? 4 : 8;
  const includedWeeks = new Set(distinctWeeks.slice(0, nWeeks));

  return plays.filter(p => p.week < targetWeek && includedWeeks.has(p.week));
}

// We process the metrics over a specific window of plays for a specific grain (player or team).
// However, shrinkage requires the LEAGUE mean across all valid plays in that window.

interface LeagueArmMeans {
  readonly paMean: number;
  readonly nonPaMean: number;
}

function computeLeagueMeans(plays: readonly PlayActionDropbackPlay[], requirePasserId: boolean): LeagueArmMeans {
  let paSum = 0, paCount = 0;
  let nonPaSum = 0, nonPaCount = 0;

  for (const play of plays) {
    if (play.playType !== "pass" || play.teamId === "") continue;
    if (play.qbSpike === 1) continue;
    if (requirePasserId && play.passerId === "") continue;
    if (play.epa === null) continue;
    if (play.playAction !== 0 && play.playAction !== 1) continue;

    if (play.playAction === 1) {
      paSum += play.epa;
      paCount++;
    } else {
      nonPaSum += play.epa;
      nonPaCount++;
    }
  }

  return {
    paMean: paCount > 0 ? paSum / paCount : 0,
    nonPaMean: nonPaCount > 0 ? nonPaSum / nonPaCount : 0,
  };
}

interface GrainStats {
  playsInWindow: PlayActionDropbackPlay[];
  paSum: number;
  paCount: number;
  nonPaSum: number;
  nonPaCount: number;
  excludedMissingPlayAction: number;
  excludedNullEpa: number;
  excludedQbSpike: number;
  excludedMissingPasserId: number;
}

function computeSplitForGrain(
  stats: GrainStats,
  leagueMeans: LeagueArmMeans,
  floor: number,
  targetWeek: number,
  windowName: "season-to-date" | "last-4-weeks" | "last-8-weeks",
  provenance: ExpectedMetricProvenance
): PlayActionEpaSplitWindow {

  let paArm: PlayActionEpaArm | null = null;
  let nonPaArm: PlayActionEpaArm | null = null;
  let diff: number | null = null;
  let rate: number | null = null;

  if (stats.paCount >= floor) {
    const rawEpa = stats.paSum / stats.paCount;
    const shrinkFactor = stats.paCount / (stats.paCount + SHRINKAGE_CONSTANT);
    const shrunkEpa = leagueMeans.paMean + shrinkFactor * (rawEpa - leagueMeans.paMean);
    paArm = {
      dropbacks: stats.paCount,
      rawEpaPerDropback: round(rawEpa, 4),
      shrunkEpaPerDropback: round(shrunkEpa, 4),
    };
  }

  if (stats.nonPaCount >= floor) {
    const rawEpa = stats.nonPaSum / stats.nonPaCount;
    const shrinkFactor = stats.nonPaCount / (stats.nonPaCount + SHRINKAGE_CONSTANT);
    const shrunkEpa = leagueMeans.nonPaMean + shrinkFactor * (rawEpa - leagueMeans.nonPaMean);
    nonPaArm = {
      dropbacks: stats.nonPaCount,
      rawEpaPerDropback: round(rawEpa, 4),
      shrunkEpaPerDropback: round(shrunkEpa, 4),
    };
  }

  if (paArm !== null && nonPaArm !== null) {
    diff = round(paArm.shrunkEpaPerDropback - nonPaArm.shrunkEpaPerDropback, 4);
    rate = round(paArm.dropbacks / (paArm.dropbacks + nonPaArm.dropbacks), 4);
  }

  return {
    window: windowName,
    targetWeek,
    ratableDropbacks: stats.paCount + stats.nonPaCount,
    playActionRate: rate,
    playActionArm: paArm,
    nonPlayActionArm: nonPaArm,
    paEpaDifferential: diff,
    diagnostics: {
      excludedMissingPlayAction: stats.excludedMissingPlayAction,
      excludedNullEpa: stats.excludedNullEpa,
      excludedQbSpike: stats.excludedQbSpike,
      excludedMissingPasserId: stats.excludedMissingPasserId,
    },
  };
}

export function computePlayActionEpaSplit(
  plays: readonly PlayActionDropbackPlay[],
  targetWeek: number
): {
  playerSplits: PlayerPlayActionEpaSplit[],
  teamSplits: TeamPlayActionEpaSplit[]
} {

  const windowTypes = ["season-to-date", "last-4-weeks", "last-8-weeks"] as const;

  const playerResults: PlayerPlayActionEpaSplit[] = [];
  const teamResults: TeamPlayActionEpaSplit[] = [];

  const baseProvenance: ExpectedMetricProvenance = {
    modelVersion: PLAY_ACTION_EPA_SPLIT_VERSION,
    method: "deterministic-rule",
    featureKeys: [...PLAY_ACTION_FEATURE_KEYS],
    featureSchemaHash: computeFeatureSchemaHash(PLAY_ACTION_FEATURE_KEYS),
    sampleSize: 0,
  };

  const byPlayer = new Map<string, PlayActionDropbackPlay[]>();
  const byTeam = new Map<string, PlayActionDropbackPlay[]>();
  const playerTeams = new Map<string, string>();

  for (const play of plays) {
    if (play.playType !== "pass" || play.teamId === "") continue;

    const teamBucket = byTeam.get(play.teamId);
    if (teamBucket) teamBucket.push(play);
    else byTeam.set(play.teamId, [play]);

    if (play.passerId !== "") {
      const playerBucket = byPlayer.get(play.passerId);
      if (playerBucket) playerBucket.push(play);
      else byPlayer.set(play.passerId, [play]);

      if (!playerTeams.has(play.passerId)) {
        playerTeams.set(play.passerId, play.teamId);
      }
    }
  }

  const windowPlaysCache = new Map<string, readonly PlayActionDropbackPlay[]>();
  const leagueMeansCacheQb = new Map<string, LeagueArmMeans>();
  const leagueMeansCacheTeam = new Map<string, LeagueArmMeans>();
  const qbDiagnosticExclusions = new Map<string, number>();

  for (const windowType of windowTypes) {
    const wp = getPlaysForWindow(plays, targetWeek, windowType);
    windowPlaysCache.set(windowType, wp);
    leagueMeansCacheQb.set(windowType, computeLeagueMeans(wp, true));
    leagueMeansCacheTeam.set(windowType, computeLeagueMeans(wp, false));

    let missingIdCount = 0;
    for (const play of wp) {
      if (play.playType === "pass" && play.teamId !== "" && play.passerId === "") {
        missingIdCount++;
      }
    }
    qbDiagnosticExclusions.set(windowType, missingIdCount);
  }

  const gatherStats = (grainPlays: readonly PlayActionDropbackPlay[], windowPlays: readonly PlayActionDropbackPlay[], requirePasserId: boolean): GrainStats => {
      const stats: GrainStats = {
        playsInWindow: [],
        paSum: 0, paCount: 0,
        nonPaSum: 0, nonPaCount: 0,
        excludedMissingPlayAction: 0,
        excludedNullEpa: 0,
        excludedQbSpike: 0,
        excludedMissingPasserId: 0,
      };

      const inWindow = new Set(grainPlays.filter(p => windowPlays.includes(p)));

      for (const play of Array.from(inWindow.values())) {
        if (play.playType !== "pass" || play.teamId === "") continue;

        if (requirePasserId && play.passerId === "") continue;

        if (play.qbSpike === 1) {
          stats.excludedQbSpike++;
          continue;
        }

        if (play.playAction !== 0 && play.playAction !== 1) {
          stats.excludedMissingPlayAction++;
          continue;
        }

        if (play.epa === null) {
          stats.excludedNullEpa++;
          continue;
        }

        stats.playsInWindow.push(play);

        if (play.playAction === 1) {
          stats.paSum += play.epa;
          stats.paCount++;
        } else {
          stats.nonPaSum += play.epa;
          stats.nonPaCount++;
        }
      }

      return stats;
  };


  for (const [playerId, playerPlays] of Array.from(byPlayer.entries())) {
    const windows: PlayActionEpaSplitWindow[] = [];
    let maxSampleSize = 0;

    for (const windowType of windowTypes) {
      const wp = windowPlaysCache.get(windowType)!;
      const means = leagueMeansCacheQb.get(windowType)!;
      const stats = gatherStats(playerPlays, wp, true);
      stats.excludedMissingPasserId = qbDiagnosticExclusions.get(windowType)!;
      const split = computeSplitForGrain(stats, means, 10, targetWeek, windowType, baseProvenance);
      windows.push(split);
      if (stats.paCount + stats.nonPaCount > maxSampleSize) {
          maxSampleSize = stats.paCount + stats.nonPaCount;
      }
    }

    playerResults.push({
      playerId,
      teamId: playerTeams.get(playerId) ?? "",
      windows,
      provenance: { ...baseProvenance, sampleSize: maxSampleSize }
    });
  }

  for (const [teamId, teamPlays] of Array.from(byTeam.entries())) {
    const windows: PlayActionEpaSplitWindow[] = [];
    let maxSampleSize = 0;

    for (const windowType of windowTypes) {
      const wp = windowPlaysCache.get(windowType)!;
      const means = leagueMeansCacheTeam.get(windowType)!;
      const stats = gatherStats(teamPlays, wp, false);
      const split = computeSplitForGrain(stats, means, 20, targetWeek, windowType, baseProvenance);
      windows.push(split);
      if (stats.paCount + stats.nonPaCount > maxSampleSize) {
          maxSampleSize = stats.paCount + stats.nonPaCount;
      }
    }

    teamResults.push({
      teamId,
      windows,
      provenance: { ...baseProvenance, sampleSize: maxSampleSize }
    });
  }

  return { playerSplits: playerResults, teamSplits: teamResults };
}

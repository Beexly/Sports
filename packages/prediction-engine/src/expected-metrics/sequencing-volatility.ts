/**
 * Play-Caller Sequencing Predictability vs Volatility (SHADOW).
 *
 * Measures a caller's drive-to-drive predictability standard deviation (volatility).
 *
 * Definition (Q20 intel-build queue):
 * - Ratable plays: pass/run plays only, stripped before chaining transitions.
 * - Drive segmentation: uses buildDrives lineage.
 * - Per-drive predictability: conditional entropy predictability using transitions.
 *    predictability = 1 - H(next|current) / H(next).
 * - A drive qualifies with >= 5 transitions (>= 6 ratable plays).
 * - Windows: season-to-date and rolling-8-distinct-games strictly BEFORE target week.
 * - Floor: requires >= 20 qualifying drives per window.
 * - Outputs: mean predictability, volatility, shrunk mean.
 *
 * Deviation from Q12: v1 conditions on play type ONLY, not personnel.
 * Volatility is NOT shrunk.
 */

import { buildDrives, type DrivePlay } from "./drives.js";
import { mean, stddev, round } from "./numeric.js";
import { computeFeatureSchemaHash, type ExpectedMetricProvenance } from "./types.js";
import type { SequencingPlay } from "./nflverse-pbp-mapper.js";

export const SEQUENCING_VOLATILITY_MODEL_VERSION = "gse-sequencing-volatility-v1";
const FEATURE_KEYS = ["playType"] as const;

export interface SequencingVolatilityWindowOutput {
  readonly drivesUsed: number;
  readonly playsUsed: number;
  readonly meanPredictability: number;
  /** Volatility is NOT shrunk (the estimand). */
  readonly volatility: number;
  readonly leagueMeanPredictability: number;
  readonly shrunkMeanPredictability: number;
  readonly provenance: ExpectedMetricProvenance;
}

export interface SequencingVolatilityResult {
  readonly teamId: string;
  readonly seasonToDate: SequencingVolatilityWindowOutput | null;
  readonly rolling8: SequencingVolatilityWindowOutput | null;
}

interface ProcessedDrive {
  readonly teamId: string;
  readonly season: number;
  readonly week: number;
  readonly gameId: string;
  readonly predictability: number;
  readonly numPlays: number;
}

function calculatePredictability(plays: readonly SequencingPlay[]): number {
  const n = plays.length;
  if (n < 6) return 0; // Excluded (should be checked by caller)

  const nextCounts = new Map<string, number>();
  let totalTransitions = 0;

  for (let i = 0; i < n - 1; i++) {
    const next = plays[i + 1]!.playType;
    nextCounts.set(next, (nextCounts.get(next) ?? 0) + 1);
    totalTransitions++;
  }

  let hNext = 0;
  for (const count of nextCounts.values()) {
    const p = count / totalTransitions;
    hNext -= p * Math.log2(p);
  }

  if (hNext === 0) return 1;

  const currentNextCounts = new Map<string, Map<string, number>>();
  const currentCounts = new Map<string, number>();

  for (let i = 0; i < n - 1; i++) {
    const current = plays[i]!.playType;
    const next = plays[i + 1]!.playType;

    currentCounts.set(current, (currentCounts.get(current) ?? 0) + 1);

    let innerMap = currentNextCounts.get(current);
    if (!innerMap) {
      innerMap = new Map<string, number>();
      currentNextCounts.set(current, innerMap);
    }
    innerMap.set(next, (innerMap.get(next) ?? 0) + 1);
  }

  let hNextGivenCurrent = 0;
  for (const [current, count] of currentCounts.entries()) {
    const pCurrent = count / totalTransitions;

    let hNextForCurrent = 0;
    const innerMap = currentNextCounts.get(current)!;
    for (const jointCount of innerMap.values()) {
      const pJoint = jointCount / count;
      hNextForCurrent -= pJoint * Math.log2(pJoint);
    }

    hNextGivenCurrent += pCurrent * hNextForCurrent;
  }

  return 1 - (hNextGivenCurrent / hNext);
}

export function computeSequencingVolatility(
  sequencingPlays: readonly SequencingPlay[],
  drivePlays: readonly DrivePlay[],
  targetSeason: number,
  targetWeek: number
): SequencingVolatilityResult[] {
  const drives = buildDrives(drivePlays);
  const playMap = new Map<string, SequencingPlay>();
  for (const p of sequencingPlays) {
    playMap.set(p.playId, p);
  }

  const targetThreshold = targetSeason * 100 + targetWeek;
  const processedDrives: ProcessedDrive[] = [];

  for (const drive of drives) {
    // Collect ratable plays for this drive, preserving order
    const driveSeqPlays: SequencingPlay[] = [];
    for (const pid of drive.playIds) {
      const sp = playMap.get(pid);
      if (sp) driveSeqPlays.push(sp);
    }

    if (driveSeqPlays.length < 6) continue;

    const season = driveSeqPlays[0]!.season;
    const week = driveSeqPlays[0]!.week;

    if (season !== targetSeason) continue;
    if (season * 100 + week >= targetThreshold) continue;

    processedDrives.push({
      teamId: drive.posteam,
      season,
      week,
      gameId: drive.gameId,
      predictability: calculatePredictability(driveSeqPlays),
      numPlays: driveSeqPlays.length
    });
  }

  const teamDrives = new Map<string, ProcessedDrive[]>();
  let allDrivesStd = 0;
  let allDrivesStdSum = 0;
  for (const pd of processedDrives) {
      const d = teamDrives.get(pd.teamId) ?? [];
      d.push(pd);
      teamDrives.set(pd.teamId, d);
      allDrivesStdSum += pd.predictability;
      allDrivesStd++;
  }

  const stdLeagueMean = allDrivesStd > 0 ? allDrivesStdSum / allDrivesStd : 0;

  const results: SequencingVolatilityResult[] = [];
  const provenance: ExpectedMetricProvenance = {
    modelVersion: SEQUENCING_VOLATILITY_MODEL_VERSION,
    method: "deterministic-rule",
    featureKeys: [...FEATURE_KEYS],
    featureSchemaHash: computeFeatureSchemaHash(FEATURE_KEYS),
    sampleSize: processedDrives.length,
  };

  const teamIds = Array.from(teamDrives.keys()).sort();

  for (const teamId of teamIds) {
    const drives = teamDrives.get(teamId)!;

    // Sort drives by week/game order (assuming stable from before, but let's be explicit, although week/game is enough)
    // To ensure strict ordering for rolling windows we need to identify distinct games.
    const gameIds = Array.from(new Set(drives.map(d => d.gameId)));
    // Sort games by their week, which we can extract from the first drive of that game
    gameIds.sort((a, b) => {
        const aWeek = drives.find(d => d.gameId === a)!.week;
        const bWeek = drives.find(d => d.gameId === b)!.week;
        if (aWeek !== bWeek) return aWeek - bWeek;
        return a.localeCompare(b);
    });

    const rollingGames = gameIds.slice(-8);
    const rollingDrives = drives.filter(d => rollingGames.includes(d.gameId));

    const makeWindow = (windowDrives: ProcessedDrive[], leagueMean: number): SequencingVolatilityWindowOutput | null => {
        if (windowDrives.length < 20) return null;
        const predictabilities = windowDrives.map(d => d.predictability);
        const m = mean(predictabilities);
        const vol = stddev(predictabilities, m);
        const shrunk = (windowDrives.length * m + 20 * leagueMean) / (windowDrives.length + 20);
        return {
            drivesUsed: windowDrives.length,
            playsUsed: windowDrives.reduce((sum, d) => sum + d.numPlays, 0),
            meanPredictability: round(m, 4),
            volatility: round(vol, 4),
            leagueMeanPredictability: round(leagueMean, 4),
            shrunkMeanPredictability: round(shrunk, 4),
            provenance: { ...provenance, sampleSize: windowDrives.length }
        };
    };

    results.push({
        teamId,
        seasonToDate: makeWindow(drives, stdLeagueMean),
        rolling8: makeWindow(rollingDrives, stdLeagueMean)
    });
  }

  return results;
}

/**
 * Drive outcome distribution (SHADOW)
 *
 * Deterministic aggregation of drive results, computing outcome shares (TD, FG, punt,
 * turnover, etc.) and reconciling directly with points per drive.
 *
 * Used for game-script reasoning (e.g. assessing scoring efficiency distribution).
 *
 * NOTE: TD-bucket points inherently include trailing PAT or 2-point conversions
 * since Drive.points reflects the entire drive total. We do NOT strip these try points.
 */

import { round } from "./numeric.js";
import type { Drive, DriveResult } from "./drives.js";

export const DRIVE_OUTCOME_DISTRIBUTION_MODEL_VERSION = "gse-drive-outcome-v1";
export const MIN_DRIVES_TO_REPORT = 10;

export const DRIVE_OUTCOME_BUCKETS = [
  "TD",
  "FG",
  "MISSED_FG",
  "PUNT",
  "TURNOVER",
  "TURNOVER_ON_DOWNS",
  "SAFETY",
  "END_OF_HALF",
  "END_OF_GAME",
  "OTHER",
] as const;

export type DriveOutcomeBucket = typeof DRIVE_OUTCOME_BUCKETS[number];

/** Map DriveResult directly to DriveOutcomeBucket */
export function mapResultToBucket(result: DriveResult): DriveOutcomeBucket {
  // Currently, DriveResult and DriveOutcomeBucket are 1-to-1 identical strings
  switch (result) {
    case "TD": return "TD";
    case "FG": return "FG";
    case "MISSED_FG": return "MISSED_FG";
    case "PUNT": return "PUNT";
    case "TURNOVER": return "TURNOVER";
    case "TURNOVER_ON_DOWNS": return "TURNOVER_ON_DOWNS";
    case "SAFETY": return "SAFETY";
    case "END_OF_HALF": return "END_OF_HALF";
    case "END_OF_GAME": return "END_OF_GAME";
    case "OTHER": return "OTHER";
    default:
      // In case DriveResult adds a member, compiler flags this if we don't handle it
      // if we mapped strictly. But as strings it's caught at runtime or by exact tests.
      return "OTHER"; 
  }
}

export interface DriveOutcomeCounts {
  TD: number;
  FG: number;
  MISSED_FG: number;
  PUNT: number;
  TURNOVER: number;
  TURNOVER_ON_DOWNS: number;
  SAFETY: number;
  END_OF_HALF: number;
  END_OF_GAME: number;
  OTHER: number;
}

export interface DriveOutcomeShares {
  TD: number;
  FG: number;
  MISSED_FG: number;
  PUNT: number;
  TURNOVER: number;
  TURNOVER_ON_DOWNS: number;
  SAFETY: number;
  END_OF_HALF: number;
  END_OF_GAME: number;
  OTHER: number;
}

export interface DriveOutcomeWindow {
  readonly drives: number;
  readonly counts: DriveOutcomeCounts;
  /** Null if drives < MIN_DRIVES_TO_REPORT */
  readonly shares: DriveOutcomeShares | null;
  /** Points grouped by resulting bucket. Note TD points include PAT/2pt. */
  readonly pointsByBucket: DriveOutcomeCounts;
  /** Null if drives < MIN_DRIVES_TO_REPORT */
  readonly pointsPerDrive: number | null;
  /** (TD count + FG count) / drives. Null if drives < MIN_DRIVES_TO_REPORT */
  readonly scoringDriveShare: number | null;
  /** (TURNOVER count + TURNOVER_ON_DOWNS count) / drives. Null if drives < MIN_DRIVES_TO_REPORT */
  readonly turnoverShare: number | null;
}

export interface TeamDriveOutcomeDistributions {
  readonly teamId: string;
  readonly season: number;
  readonly week: number;
  readonly seasonWindow: DriveOutcomeWindow;
  readonly roll4: DriveOutcomeWindow;
  readonly roll8: DriveOutcomeWindow;
}

export interface DriveOutcomeResult {
  readonly distributions: TeamDriveOutcomeDistributions[];
  readonly excludedUnparseable: number;
}

function initCounts(): DriveOutcomeCounts {
  return {
    TD: 0,
    FG: 0,
    MISSED_FG: 0,
    PUNT: 0,
    TURNOVER: 0,
    TURNOVER_ON_DOWNS: 0,
    SAFETY: 0,
    END_OF_HALF: 0,
    END_OF_GAME: 0,
    OTHER: 0,
  };
}

function computeWindow(drives: readonly Drive[]): DriveOutcomeWindow {
  const counts = initCounts();
  const pointsByBucket = initCounts();
  let totalDrives = drives.length;

  for (const drive of drives) {
    const bucket = mapResultToBucket(drive.result);
    counts[bucket]++;
    pointsByBucket[bucket] += drive.points;
  }

  if (totalDrives < MIN_DRIVES_TO_REPORT) {
    return {
      drives: totalDrives,
      counts,
      shares: null,
      pointsByBucket,
      pointsPerDrive: null,
      scoringDriveShare: null,
      turnoverShare: null,
    };
  }

  const shares: DriveOutcomeShares = {
    TD: round(counts.TD / totalDrives, 4),
    FG: round(counts.FG / totalDrives, 4),
    MISSED_FG: round(counts.MISSED_FG / totalDrives, 4),
    PUNT: round(counts.PUNT / totalDrives, 4),
    TURNOVER: round(counts.TURNOVER / totalDrives, 4),
    TURNOVER_ON_DOWNS: round(counts.TURNOVER_ON_DOWNS / totalDrives, 4),
    SAFETY: round(counts.SAFETY / totalDrives, 4),
    END_OF_HALF: round(counts.END_OF_HALF / totalDrives, 4),
    END_OF_GAME: round(counts.END_OF_GAME / totalDrives, 4),
    OTHER: round(counts.OTHER / totalDrives, 4),
  };

  let totalPoints = 0;
  for (const bucket of DRIVE_OUTCOME_BUCKETS) {
    totalPoints += pointsByBucket[bucket];
  }

  const pointsPerDrive = round(totalPoints / totalDrives, 4);
  const scoringDriveShare = round((counts.TD + counts.FG) / totalDrives, 4);
  const turnoverShare = round((counts.TURNOVER + counts.TURNOVER_ON_DOWNS) / totalDrives, 4);

  return {
    drives: totalDrives,
    counts,
    shares,
    pointsByBucket,
    pointsPerDrive,
    scoringDriveShare,
    turnoverShare,
  };
}

interface ParsedDrive extends Drive {
  readonly parsedSeason: number;
  readonly parsedWeek: number;
}

export function computeDriveOutcomeDistributions(
  drives: readonly Drive[],
  targetSeason: number,
  targetWeek: number
): DriveOutcomeResult {
  let excludedUnparseable = 0;

  const validDrivesByTeam = new Map<string, ParsedDrive[]>();

  for (const drive of drives) {
    const parts = drive.gameId.split("_");
    const season = parts.length > 0 ? parseInt(parts[0]!, 10) : NaN;
    const week = parts.length > 1 ? parseInt(parts[1]!, 10) : NaN;

    if (!Number.isFinite(season) || !Number.isFinite(week)) {
      excludedUnparseable++;
      continue;
    }

    // Point-in-time discipline: strictly before targetWeek in targetSeason
    if (season === targetSeason && week < targetWeek) {
      const parsed: ParsedDrive = { ...drive, parsedSeason: season, parsedWeek: week };
      const teamArr = validDrivesByTeam.get(drive.posteam);
      if (teamArr) {
        teamArr.push(parsed);
      } else {
        validDrivesByTeam.set(drive.posteam, [parsed]);
      }
    }
  }

  const distributions: TeamDriveOutcomeDistributions[] = [];

  for (const [teamId, teamDrives] of validDrivesByTeam.entries()) {
    // Determine the distinct game IDs for this team in order
    // Order drives by week (and conceptually gameId if multi-game weeks existed,
    // assuming gameId sorting is stable chronologically)
    teamDrives.sort((a, b) => a.parsedWeek - b.parsedWeek || a.gameId.localeCompare(b.gameId));

    const distinctGames = Array.from(new Set(teamDrives.map((d) => d.gameId)));
    
    // We get drives for distinct games slice
    const getDrivesForGames = (gIds: string[]) => {
      const idSet = new Set(gIds);
      return teamDrives.filter(d => idSet.has(d.gameId));
    };

    const seasonWindow = computeWindow(teamDrives);
    const roll4 = computeWindow(getDrivesForGames(distinctGames.slice(-4)));
    const roll8 = computeWindow(getDrivesForGames(distinctGames.slice(-8)));

    distributions.push({
      teamId,
      season: targetSeason,
      week: targetWeek,
      seasonWindow,
      roll4,
      roll8,
    });
  }
  
  // Sort outputs by team for deterministic ordering
  distributions.sort((a, b) => a.teamId.localeCompare(b.teamId));

  return { distributions, excludedUnparseable };
}

import { type Drive, type DriveResult } from "./drives.js";
import { round } from "./numeric.js";

export const DRIVE_OUTCOME_DISTRIBUTION_MODEL_VERSION = "gse-drive-outcome-v1";
export const MIN_DRIVES_TO_REPORT = 10;

/** Drive outcome buckets for distribution. */
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

export type DriveOutcomeBucket = (typeof DRIVE_OUTCOME_BUCKETS)[number];

/** Maps a raw DriveResult to exactly one outcome bucket. */
export function mapDriveResultToBucket(result: DriveResult): DriveOutcomeBucket {
  switch (result) {
    case "TD":
      return "TD";
    case "FG":
      return "FG";
    case "MISSED_FG":
      return "MISSED_FG";
    case "PUNT":
      return "PUNT";
    case "TURNOVER":
      return "TURNOVER";
    case "TURNOVER_ON_DOWNS":
      return "TURNOVER_ON_DOWNS";
    case "SAFETY":
      return "SAFETY";
    case "END_OF_HALF":
      return "END_OF_HALF";
    case "END_OF_GAME":
      return "END_OF_GAME";
    case "OTHER":
      return "OTHER";
    default:
      // Exists to satisfy compiler if new unions are added without update,
      // but in practice it ensures exhaustive mapping in tests.
      return "OTHER";
  }
}

/** Represents a count and share of a specific drive outcome bucket. */
export type DriveOutcomeBucketDistribution = Record<DriveOutcomeBucket, number>;

export interface DriveOutcomeWindow {
  readonly drives: number;
  readonly counts: DriveOutcomeBucketDistribution;
  readonly shares: Record<DriveOutcomeBucket, number | null>;
  readonly pointsByBucket: DriveOutcomeBucketDistribution;
  readonly pointsPerDrive: number | null;
  readonly scoringDriveShare: number | null;
  readonly turnoverShare: number | null;
}

export interface DriveOutcomeDistributionMetric {
  readonly teamId: string;
  readonly season: number;
  readonly week: number;
  readonly excludedUnparseable: number;
  readonly seasonWindow: DriveOutcomeWindow;
  readonly roll4: DriveOutcomeWindow;
  readonly roll8: DriveOutcomeWindow;
}

export interface DriveOutcomeDistributionResult {
  readonly metrics: readonly DriveOutcomeDistributionMetric[];
  readonly excludedUnparseable: number;
}

/** Parses season and week from an nflverse game_id (YYYY_WW_AWAY_HOME). */
function parseSeasonWeek(gameId: string): { season: number; week: number } | null {
  const parts = gameId.split("_");
  if (parts.length < 2) return null;
  const season = parseInt(parts[0]!, 10);
  const week = parseInt(parts[1]!, 10);
  if (!Number.isFinite(season) || !Number.isFinite(week)) return null;
  return { season, week };
}

/**
 * Computes per-team, per-window drive outcome distributions.
 * Strictly enforces point-in-time discipline.
 */
export function computeDriveOutcomeDistributions(
  drives: readonly Drive[],
  targetSeason: number,
  targetWeek: number
): DriveOutcomeDistributionResult {
  let excludedUnparseable = 0;
  const validDrivesByTeam = new Map<string, Drive[]>();

  for (const drive of drives) {
    const sw = parseSeasonWeek(drive.gameId);
    if (!sw) {
      excludedUnparseable++;
      continue;
    }
    const { season, week } = sw;

    // Point-in-time discipline: only games before targetWeek in targetSeason.
    if (season === targetSeason && week < targetWeek) {
      const teamDrives = validDrivesByTeam.get(drive.posteam) || [];
      teamDrives.push(drive);
      validDrivesByTeam.set(drive.posteam, teamDrives);
    }
  }

  const metrics: DriveOutcomeDistributionMetric[] = [];

  for (const [teamId, teamDrives] of validDrivesByTeam.entries()) {
    // Determine unique gameIds to compute rolling windows based on games.
    // teamDrives are grouped by gameId since we slice distinct games.
    const uniqueGames = Array.from(new Set(teamDrives.map(d => d.gameId))).sort();

    const computeWindow = (gameIdsInWindow: string[]): DriveOutcomeWindow => {
      const windowDrives = teamDrives.filter(d => gameIdsInWindow.includes(d.gameId));
      const totalDrives = windowDrives.length;

      const counts = Object.fromEntries(DRIVE_OUTCOME_BUCKETS.map(b => [b, 0])) as DriveOutcomeBucketDistribution;
      const pointsByBucket = Object.fromEntries(DRIVE_OUTCOME_BUCKETS.map(b => [b, 0])) as DriveOutcomeBucketDistribution;
      let totalPoints = 0;

      for (const d of windowDrives) {
        const bucket = mapDriveResultToBucket(d.result);
        counts[bucket]++;
        pointsByBucket[bucket] += d.points;
        totalPoints += d.points;
      }

      if (totalDrives < MIN_DRIVES_TO_REPORT) {
        return {
          drives: totalDrives,
          counts,
          shares: Object.fromEntries(DRIVE_OUTCOME_BUCKETS.map(b => [b, null])) as Record<DriveOutcomeBucket, null>,
          pointsByBucket,
          pointsPerDrive: null,
          scoringDriveShare: null,
          turnoverShare: null,
        };
      }

      const shares = Object.fromEntries(DRIVE_OUTCOME_BUCKETS.map(b => [b, round(counts[b] / totalDrives)])) as Record<DriveOutcomeBucket, number>;
      const pointsPerDrive = round(totalPoints / totalDrives);
      const scoringDriveShare = round((counts.TD + counts.FG) / totalDrives);
      const turnoverShare = round((counts.TURNOVER + counts.TURNOVER_ON_DOWNS) / totalDrives);

      return {
        drives: totalDrives,
        counts,
        shares,
        pointsByBucket,
        pointsPerDrive,
        scoringDriveShare,
        turnoverShare,
      };
    };

    const seasonWindow = computeWindow(uniqueGames);
    const roll4 = computeWindow(uniqueGames.slice(-4));
    const roll8 = computeWindow(uniqueGames.slice(-8));

    metrics.push({
      teamId,
      season: targetSeason,
      week: targetWeek,
      excludedUnparseable,
      seasonWindow,
      roll4,
      roll8,
    });
  }

  // If no drives were parsed, return empty (but tally excluded ones)
  // According to exact specification, return one record per team with at least one drive in scope.
  return {
    metrics,
    excludedUnparseable,
  };
}

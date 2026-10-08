import { buildDrives, type DrivePlay, type Drive } from "./drives.js";

export interface DriveFailureRateOptions {
  /**
   * The target game key formatted as season * 100 + week.
   * Ensures point-in-time discipline: only drives from games with
   * season * 100 + week strictly before this target key will enter any window.
   */
  readonly targetGameKey: number;
}

export interface DriveFailureRateResult {
  readonly failureRate8: number | null;
  readonly failureRate16: number | null;
  readonly failureRateSeason: number | null;
  readonly drivesCounted8: number;
  readonly drivesCounted16: number;
  readonly drivesCountedSeason: number;
}

function parseGameKey(gameId: string): number {
  // gameId format is expected to be "YYYY_WW_AWAY_HOME" e.g., "2025_03_AAA_BBB"
  const parts = gameId.split("_");
  if (parts.length < 2) return 0;
  const season = parseInt(parts[0]!, 10);
  const week = parseInt(parts[1]!, 10);
  if (isNaN(season) || isNaN(week)) return 0;
  return season * 100 + week;
}

export function driveFailureRate(plays: readonly DrivePlay[], options: DriveFailureRateOptions): Map<string, DriveFailureRateResult> {
  const allDrives = buildDrives(plays);
  const { targetGameKey } = options;

  const validDenominatorOutcomes = new Set([
    "TD",
    "FG",
    "PUNT",
    "TURNOVER",
    "TURNOVER_ON_DOWNS",
    "SAFETY"
  ]);

  const failureOutcomes = new Set([
    "PUNT",
    "TURNOVER",
    "TURNOVER_ON_DOWNS"
  ]);

  // Point-in-time filter and map to usable features
  const eligibleDrives = allDrives.filter(d => {
    const key = parseGameKey(d.gameId);
    return key > 0 && key < targetGameKey;
  });

  // Group by posteam
  const byTeam = new Map<string, Drive[]>();
  for (const d of eligibleDrives) {
    const bucket = byTeam.get(d.posteam);
    if (bucket) {
      bucket.push(d);
    } else {
      byTeam.set(d.posteam, [d]);
    }
  }

  const results = new Map<string, DriveFailureRateResult>();

  for (const [team, drives] of byTeam.entries()) {
    // Sort chronologically by gameKey then driveId
    drives.sort((a, b) => {
      const aKey = parseGameKey(a.gameId);
      const bKey = parseGameKey(b.gameId);
      if (aKey !== bKey) return aKey - bKey;
      return a.driveId - b.driveId;
    });

    const countableDrives = drives.filter(d => validDenominatorOutcomes.has(d.result));

    // For season window, we only want drives from the same season as the target game
    const targetSeason = Math.floor(targetGameKey / 100);
    const seasonDrives = countableDrives.filter(d => Math.floor(parseGameKey(d.gameId) / 100) === targetSeason);

    // For 8 and 16 game windows, we need to group by gameId first to get the most recent N games
    // Since drives are sorted, we can extract unique gameIds in order.
    const gameIds = [...new Set(countableDrives.map(d => d.gameId))];

    const last8GameIds = new Set(gameIds.slice(-8));
    const last16GameIds = new Set(gameIds.slice(-16));

    const drives8 = countableDrives.filter(d => last8GameIds.has(d.gameId));
    const drives16 = countableDrives.filter(d => last16GameIds.has(d.gameId));

    const buildMetric = (windowDrives: Drive[]) => {
      if (windowDrives.length < 8) return { rate: null, count: windowDrives.length };
      let failures = 0;
      for (const d of windowDrives) {
        if (failureOutcomes.has(d.result)) {
          failures++;
        }
      }
      return { rate: failures / windowDrives.length, count: windowDrives.length };
    };

    const res8 = buildMetric(drives8);
    const res16 = buildMetric(drives16);
    const resSeason = buildMetric(seasonDrives);

    results.set(team, {
      failureRate8: res8.rate,
      failureRate16: res16.rate,
      failureRateSeason: resSeason.rate,
      drivesCounted8: res8.count,
      drivesCounted16: res16.count,
      drivesCountedSeason: resSeason.count,
    });
  }

  return results;
}

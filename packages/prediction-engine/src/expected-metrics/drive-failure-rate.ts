/**
 * Drive Failure Rate (SHADOW)
 *
 * Computes a team's drive-failure rate (share of drives that end in PUNT,
 * TURNOVER, TURNOVER_ON_DOWNS, MISSED_FG, or SAFETY) excluding END_OF_HALF,
 * END_OF_GAME, and OTHER. Computed over trailing rolling windows respecting
 * strict point-in-time discipline.
 */

import type { Drive, DriveResult } from "./drives.js";
import { compareSeasonWeek, parseGameIdSeasonWeek, type SeasonWeek } from "./chronological-time.js";

const FAILURE_RESULTS = new Set<DriveResult>([
  "PUNT",
  "TURNOVER",
  "TURNOVER_ON_DOWNS",
  "MISSED_FG",
  "SAFETY",
]);

const EXCLUDED_RESULTS = new Set<DriveResult>([
  "END_OF_HALF",
  "END_OF_GAME",
  "OTHER",
]);

/** Parses "YYYY_WW_AWAY_HOME" cleanly without base-100 arithmetic. */
function parseDriveGameTime(gameId: string): SeasonWeek {
  return parseGameIdSeasonWeek(gameId) ?? { season: 0, week: 0 };
}

export interface DriveFailureRates {
  readonly offense: {
    readonly last8: number | null;
    readonly last16: number | null;
    readonly season: number | null;
  };
  readonly defense: {
    readonly last8: number | null;
    readonly last16: number | null;
    readonly season: number | null;
  };
}

export function computeDriveFailureRates(
  drives: readonly Drive[],
  targetTeam: string,
  targetGameId: string
): DriveFailureRates {
  const targetTime = parseDriveGameTime(targetGameId);
  const targetSeason = targetTime.season;

  // Filter for valid past drives strictly before the game time
  const pastDrives = drives.filter(d => {
    const time = parseDriveGameTime(d.gameId);
    return compareSeasonWeek(time.season, time.week, targetTime.season, targetTime.week) < 0;
  });

  // Sort descending chronologically (then gameId) to process latest games first
  pastDrives.sort((a, b) => {
    const ta = parseDriveGameTime(a.gameId);
    const tb = parseDriveGameTime(b.gameId);
    const cmp = compareSeasonWeek(tb.season, tb.week, ta.season, ta.week);
    return cmp !== 0 ? cmp : b.gameId.localeCompare(a.gameId);
  });

  const offRates = calculateRates(pastDrives, targetTeam, targetSeason, true);
  const defRates = calculateRates(pastDrives, targetTeam, targetSeason, false);

  return {
    offense: offRates,
    defense: defRates,
  };
}

function calculateRates(
  sortedPastDrives: Drive[],
  targetTeam: string,
  targetSeason: number,
  isOffense: boolean
) {
  // Extract games the team participated in
  const gamesPlayed = new Set<string>();
  for (const d of sortedPastDrives) {
    if (d.gameId.includes(`_${targetTeam}_`) || d.gameId.endsWith(`_${targetTeam}`)) {
      gamesPlayed.add(d.gameId);
    }
  }

  // Sort games descending chronologically
  const sortedGames = Array.from(gamesPlayed).sort((a, b) => {
    const ta = parseDriveGameTime(a);
    const tb = parseDriveGameTime(b);
    const cmp = compareSeasonWeek(tb.season, tb.week, ta.season, ta.week);
    return cmp !== 0 ? cmp : b.localeCompare(a);
  });

  const seasonGames = new Set(sortedGames.filter(g => parseDriveGameTime(g).season === targetSeason));
  const last8Games = new Set(sortedGames.slice(0, 8));
  const last16Games = new Set(sortedGames.slice(0, 16));

  let seasonFail = 0, seasonCount = 0;
  let l8Fail = 0, l8Count = 0;
  let l16Fail = 0, l16Count = 0;

  for (const d of sortedPastDrives) {
    if (!gamesPlayed.has(d.gameId)) continue;

    // Check if it's the right side of the ball
    if (isOffense && d.posteam !== targetTeam) continue;
    // For defense, we want drives where targetTeam is playing but NOT on offense
    if (!isOffense && d.posteam === targetTeam) continue;
    // Note: if posteam is empty, we exclude it if it's not clear. The drive logic assigns posteam anyway.
    if (!isOffense && d.posteam === "") continue;

    if (EXCLUDED_RESULTS.has(d.result)) continue;

    const isFail = FAILURE_RESULTS.has(d.result) ? 1 : 0;

    if (seasonGames.has(d.gameId)) {
      seasonFail += isFail;
      seasonCount += 1;
    }
    if (last8Games.has(d.gameId)) {
      l8Fail += isFail;
      l8Count += 1;
    }
    if (last16Games.has(d.gameId)) {
      l16Fail += isFail;
      l16Count += 1;
    }
  }

  return {
    season: seasonGames.size === 0 ? null : (seasonCount > 0 ? seasonFail / seasonCount : 0),
    last8: last8Games.size === 0 ? null : (l8Count > 0 ? l8Fail / l8Count : 0),
    last16: last16Games.size === 0 ? null : (l16Count > 0 ? l16Fail / l16Count : 0),
  };
}

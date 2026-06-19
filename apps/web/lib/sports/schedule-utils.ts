/**
 * Sports schedule analysis utilities — pure, zero dependencies.
 *
 * Bye week detection, home/away splits, travel burden analysis,
 * rest advantage calculations, and schedule strength metrics.
 * All pure functions operating on schedule data.
 */

export type GameResult = "win" | "loss" | "push" | "pending";

export interface ScheduledGame {
  readonly gameId: string;
  readonly date: number;           // Unix ms timestamp
  readonly isHome: boolean;
  readonly opponent: string;
  readonly result?: GameResult;
  readonly weekNumber?: number;    // NFL week number
}

export interface RestAnalysis {
  readonly daysSinceLastGame: number | null;  // null if no prior game
  readonly isShortWeek: boolean;   // < 6 days rest (NFL context)
  readonly isLongRest: boolean;    // > 10 days rest
  readonly hasByeWeekPrior: boolean;
}

export interface HomeAwayRecord {
  readonly home: { wins: number; losses: number; pushes: number; record: string };
  readonly away: { wins: number; losses: number; pushes: number; record: string };
  readonly homeWinRate: number | null;
  readonly awayWinRate: number | null;
  readonly homeAdvantage: number | null;  // homeWinRate - awayWinRate, null if either is null
}

export interface TravelBurden {
  readonly gamesInLast7Days: number;
  readonly gamesInLast14Days: number;
  readonly consecutiveAwayGames: number;  // current run of away games at this point
  readonly backToBackAway: boolean;        // 2+ consecutive away games currently
}

const MS_PER_DAY = 86_400_000;

/**
 * Days between two timestamps (floor of diff / 86400000).
 * Always positive (uses Math.abs).
 */
export function daysBetween(a: number, b: number): number {
  return Math.floor(Math.abs(a - b) / MS_PER_DAY);
}

/**
 * How many days of rest before the game at `beforeDate`?
 * Find the most recent game before `beforeDate`, return days between.
 * Returns null if no prior game found.
 */
export function restDays(
  games: readonly ScheduledGame[],
  beforeDate: number,
): number | null {
  const prior = games
    .filter((g) => g.date < beforeDate)
    .sort((a, b) => b.date - a.date);

  const mostRecent = prior[0];
  if (mostRecent === undefined) return null;

  return daysBetween(mostRecent.date, beforeDate);
}

/**
 * Analyze rest situation for a team going into a game on targetDate.
 */
export function analyzeRest(
  games: readonly ScheduledGame[],
  targetDate: number,
  byeWeeks?: readonly number[],
): RestAnalysis {
  const daysSinceLastGame = restDays(games, targetDate);

  const isShortWeek = daysSinceLastGame !== null && daysSinceLastGame < 6;
  const isLongRest = daysSinceLastGame !== null && daysSinceLastGame > 10;

  let hasByeWeekPrior: boolean;
  if (byeWeeks !== undefined) {
    // Check if any bye-week-tagged games are in the 14 days prior.
    // We map bye weeks to whether ANY game in the schedule was in
    // a bye week that falls within the 14-day window before targetDate.
    const windowStart = targetDate - 14 * MS_PER_DAY;
    hasByeWeekPrior = games.some(
      (g) =>
        g.weekNumber !== undefined &&
        byeWeeks.includes(g.weekNumber) &&
        g.date >= windowStart &&
        g.date < targetDate,
    );

    // Also check: if daysSinceLastGame is within bye-week range but no
    // game found — means a bye week existed between last game and target.
    // A bye week prior means there was extra rest from a week with no game.
    // If byeWeeks provided and no game in last 14 days, check if any prior game
    // was beyond 7 days (implying a bye).
    if (!hasByeWeekPrior && daysSinceLastGame !== null && daysSinceLastGame > 7) {
      // Look for games whose weekNumber is in byeWeeks and they are "nearby"
      // Simpler: if the gap since the last game is > 7 days, a bye may explain it.
      // But we need the actual bye weeks to match. Check if the week numbers
      // of the byeWeeks fall between the last game's week and the target game's week.
      const lastGame = games
        .filter((g) => g.date < targetDate)
        .sort((a, b) => b.date - a.date)[0];
      if (lastGame?.weekNumber !== undefined) {
        // Find the target game's week number
        const targetGame = games.find((g) => g.date === targetDate);
        if (targetGame?.weekNumber !== undefined) {
          const lo = Math.min(lastGame.weekNumber, targetGame.weekNumber);
          const hi = Math.max(lastGame.weekNumber, targetGame.weekNumber);
          hasByeWeekPrior = byeWeeks.some((w) => w > lo && w < hi);
        }
      }
    }
  } else {
    // If byeWeeks not provided, hasByeWeekPrior = daysSinceLastGame > 14
    hasByeWeekPrior = daysSinceLastGame !== null && daysSinceLastGame > 14;
  }

  return {
    daysSinceLastGame,
    isShortWeek,
    isLongRest,
    hasByeWeekPrior,
  };
}

/**
 * Split settled games (win/loss/push) by home/away and compute records.
 */
export function homeAwayRecord(games: readonly ScheduledGame[]): HomeAwayRecord {
  let homeWins = 0;
  let homeLosses = 0;
  let homePushes = 0;
  let awayWins = 0;
  let awayLosses = 0;
  let awayPushes = 0;

  for (const g of games) {
    if (g.result === "pending" || g.result === undefined) continue;
    if (g.isHome) {
      if (g.result === "win") homeWins++;
      else if (g.result === "loss") homeLosses++;
      else if (g.result === "push") homePushes++;
    } else {
      if (g.result === "win") awayWins++;
      else if (g.result === "loss") awayLosses++;
      else if (g.result === "push") awayPushes++;
    }
  }

  const homeSettled = homeWins + homeLosses;
  const awaySettled = awayWins + awayLosses;

  const homeWinRateVal = homeSettled > 0 ? homeWins / homeSettled : null;
  const awayWinRateVal = awaySettled > 0 ? awayWins / awaySettled : null;

  const homeAdv =
    homeWinRateVal !== null && awayWinRateVal !== null
      ? homeWinRateVal - awayWinRateVal
      : null;

  return {
    home: {
      wins: homeWins,
      losses: homeLosses,
      pushes: homePushes,
      record: `${homeWins}-${homeLosses}`,
    },
    away: {
      wins: awayWins,
      losses: awayLosses,
      pushes: awayPushes,
      record: `${awayWins}-${awayLosses}`,
    },
    homeWinRate: homeWinRateVal,
    awayWinRate: awayWinRateVal,
    homeAdvantage: homeAdv,
  };
}

/**
 * Analyze travel burden for a team at targetDate.
 */
export function travelBurden(
  games: readonly ScheduledGame[],
  targetDate: number,
): TravelBurden {
  const day7Start = targetDate - 7 * MS_PER_DAY;
  const day14Start = targetDate - 14 * MS_PER_DAY;

  const gamesInLast7Days = games.filter(
    (g) => g.date >= day7Start && g.date < targetDate,
  ).length;

  const gamesInLast14Days = games.filter(
    (g) => g.date >= day14Start && g.date < targetDate,
  ).length;

  // Consecutive away games looking backwards from (not including) targetDate
  const priorGames = games
    .filter((g) => g.date < targetDate)
    .sort((a, b) => b.date - a.date); // most recent first

  let consecutiveAwayGames = 0;
  for (const g of priorGames) {
    if (!g.isHome) {
      consecutiveAwayGames++;
    } else {
      break;
    }
  }

  return {
    gamesInLast7Days,
    gamesInLast14Days,
    consecutiveAwayGames,
    backToBackAway: consecutiveAwayGames >= 2,
  };
}

/**
 * For NFL: find which week numbers (1..totalWeeks) have no game.
 * Games must have weekNumber set.
 * Returns sorted array of bye week numbers.
 */
export function getByeWeeks(
  games: readonly ScheduledGame[],
  totalWeeks: number,
): number[] {
  const playedWeeks = new Set<number>();
  for (const g of games) {
    if (g.weekNumber !== undefined) {
      playedWeeks.add(g.weekNumber);
    }
  }

  const byeWeeks: number[] = [];
  for (let week = 1; week <= totalWeeks; week++) {
    if (!playedWeeks.has(week)) {
      byeWeeks.push(week);
    }
  }

  return byeWeeks.sort((a, b) => a - b);
}

/**
 * Count how many consecutive home games at the END of the list.
 * Returns 0 if the last game was away or no games.
 */
export function currentHomeStreak(games: readonly ScheduledGame[]): number {
  if (games.length === 0) return 0;
  let streak = 0;
  for (let i = games.length - 1; i >= 0; i--) {
    if (games[i]?.isHome) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Count how many consecutive away games at the END of the list.
 */
export function currentAwayStreak(games: readonly ScheduledGame[]): number {
  if (games.length === 0) return 0;
  let streak = 0;
  for (let i = games.length - 1; i >= 0; i--) {
    if (!games[i]?.isHome) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Average opponent win rate (strength of schedule).
 * winRate should be in [0, 1].
 * Returns 0 if no opponents.
 */
export function scheduleStrength(
  opponents: readonly { winRate: number }[],
): number {
  if (opponents.length === 0) return 0;
  const total = opponents.reduce((sum, o) => sum + o.winRate, 0);
  return total / opponents.length;
}

/**
 * Win rate over the last n settled games.
 * Returns null if 0 settled games in window.
 * Push does not count as win or loss.
 */
export function winRateInLast(
  games: readonly ScheduledGame[],
  n: number,
): number | null {
  const settled = games
    .filter((g) => g.result === "win" || g.result === "loss" || g.result === "push")
    .slice(-n);

  const decidedGames = settled.filter(
    (g) => g.result === "win" || g.result === "loss",
  );

  if (decidedGames.length === 0) return null;

  const wins = decidedGames.filter((g) => g.result === "win").length;
  return wins / decidedGames.length;
}

/**
 * Win rate for home games only.
 * Returns null if no settled home games.
 */
export function homeWinRate(games: readonly ScheduledGame[]): number | null {
  const homeGames = games.filter(
    (g) =>
      g.isHome && (g.result === "win" || g.result === "loss" || g.result === "push"),
  );

  const decided = homeGames.filter(
    (g) => g.result === "win" || g.result === "loss",
  );

  if (decided.length === 0) return null;

  const wins = decided.filter((g) => g.result === "win").length;
  return wins / decided.length;
}

/**
 * Win rate for away games only.
 * Returns null if no settled away games.
 */
export function awayWinRate(games: readonly ScheduledGame[]): number | null {
  const awayGames = games.filter(
    (g) =>
      !g.isHome && (g.result === "win" || g.result === "loss" || g.result === "push"),
  );

  const decided = awayGames.filter(
    (g) => g.result === "win" || g.result === "loss",
  );

  if (decided.length === 0) return null;

  const wins = decided.filter((g) => g.result === "win").length;
  return wins / decided.length;
}

/**
 * Simple split into home and away game arrays.
 */
export function splitByHomeAway(games: readonly ScheduledGame[]): {
  home: ScheduledGame[];
  away: ScheduledGame[];
} {
  const home: ScheduledGame[] = [];
  const away: ScheduledGame[] = [];
  for (const g of games) {
    if (g.isHome) {
      home.push(g);
    } else {
      away.push(g);
    }
  }
  return { home, away };
}

/**
 * Next `count` home games at or after `from` timestamp.
 * Returns sorted by date ascending.
 */
export function upcomingHomeGames(
  games: readonly ScheduledGame[],
  from: number,
  count: number,
): ScheduledGame[] {
  return games
    .filter((g) => g.isHome && g.date >= from)
    .sort((a, b) => a.date - b.date)
    .slice(0, count);
}

/**
 * Next `count` away games at or after `from` timestamp.
 */
export function upcomingAwayGames(
  games: readonly ScheduledGame[],
  from: number,
  count: number,
): ScheduledGame[] {
  return games
    .filter((g) => !g.isHome && g.date >= from)
    .sort((a, b) => a.date - b.date)
    .slice(0, count);
}

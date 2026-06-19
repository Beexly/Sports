import { describe, it, expect } from "vitest";
import {
  daysBetween,
  restDays,
  analyzeRest,
  homeAwayRecord,
  travelBurden,
  getByeWeeks,
  currentHomeStreak,
  currentAwayStreak,
  scheduleStrength,
  winRateInLast,
  homeWinRate,
  awayWinRate,
  splitByHomeAway,
  upcomingHomeGames,
  upcomingAwayGames,
} from "../lib/sports/schedule-utils";
import type { ScheduledGame } from "../lib/sports/schedule-utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const DAY = 86_400_000;

function makeGame(
  overrides: Partial<ScheduledGame> & { gameId: string },
): ScheduledGame {
  return {
    date: Date.now(),
    isHome: true,
    opponent: "TeamX",
    ...overrides,
  };
}

// Reference epoch: 2024-01-01T00:00:00.000Z
const EPOCH = 1_704_067_200_000;

// ---------------------------------------------------------------------------
// daysBetween
// ---------------------------------------------------------------------------
describe("daysBetween", () => {
  it("returns 1 for exactly one day apart", () => {
    expect(daysBetween(EPOCH, EPOCH + DAY)).toBe(1);
  });

  it("returns 7 for seven days apart", () => {
    expect(daysBetween(EPOCH, EPOCH + 7 * DAY)).toBe(7);
  });

  it("returns 0 for the same timestamp", () => {
    expect(daysBetween(EPOCH, EPOCH)).toBe(0);
  });

  it("is always positive regardless of argument order", () => {
    expect(daysBetween(EPOCH + 3 * DAY, EPOCH)).toBe(3);
  });

  it("floors fractional days", () => {
    // 1.9 days should be 1
    expect(daysBetween(EPOCH, EPOCH + Math.floor(1.9 * DAY))).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// restDays
// ---------------------------------------------------------------------------
describe("restDays", () => {
  it("returns null when there are no games", () => {
    expect(restDays([], EPOCH)).toBeNull();
  });

  it("returns null when all games are after the target date", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", date: EPOCH + 5 * DAY }),
    ];
    expect(restDays(games, EPOCH)).toBeNull();
  });

  it("returns correct days when there is one prior game", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", date: EPOCH }),
    ];
    expect(restDays(games, EPOCH + 7 * DAY)).toBe(7);
  });

  it("picks the most recent prior game", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", date: EPOCH }),
      makeGame({ gameId: "g2", date: EPOCH + 4 * DAY }),
    ];
    // Most recent prior is g2 (4 days before target)
    expect(restDays(games, EPOCH + 8 * DAY)).toBe(4);
  });

  it("excludes games on the same timestamp", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", date: EPOCH }),
    ];
    // The game IS at EPOCH, so it's not a prior game
    expect(restDays(games, EPOCH)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// analyzeRest
// ---------------------------------------------------------------------------
describe("analyzeRest", () => {
  it("returns null daysSinceLastGame when no prior games", () => {
    const result = analyzeRest([], EPOCH);
    expect(result.daysSinceLastGame).toBeNull();
    expect(result.isShortWeek).toBe(false);
    expect(result.isLongRest).toBe(false);
  });

  it("detects short week when rest < 6 days", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", date: EPOCH }),
    ];
    const result = analyzeRest(games, EPOCH + 5 * DAY);
    expect(result.daysSinceLastGame).toBe(5);
    expect(result.isShortWeek).toBe(true);
    expect(result.isLongRest).toBe(false);
  });

  it("does NOT flag short week when rest is exactly 6 days", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", date: EPOCH }),
    ];
    const result = analyzeRest(games, EPOCH + 6 * DAY);
    expect(result.isShortWeek).toBe(false);
  });

  it("detects long rest when rest > 10 days", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", date: EPOCH }),
    ];
    const result = analyzeRest(games, EPOCH + 11 * DAY);
    expect(result.isLongRest).toBe(true);
    expect(result.isShortWeek).toBe(false);
  });

  it("does NOT flag long rest when rest is exactly 10 days", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", date: EPOCH }),
    ];
    const result = analyzeRest(games, EPOCH + 10 * DAY);
    expect(result.isLongRest).toBe(false);
  });

  it("hasByeWeekPrior uses > 14 days heuristic when byeWeeks not provided", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", date: EPOCH }),
    ];
    const resultLong = analyzeRest(games, EPOCH + 15 * DAY);
    expect(resultLong.hasByeWeekPrior).toBe(true);

    const resultShort = analyzeRest(games, EPOCH + 14 * DAY);
    expect(resultShort.hasByeWeekPrior).toBe(false);
  });

  it("hasByeWeekPrior uses byeWeeks array via week numbers when provided", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", date: EPOCH, weekNumber: 8 }),
      makeGame({ gameId: "g2", date: EPOCH + 14 * DAY, weekNumber: 10 }),
    ];
    // Week 9 is a bye; g2 is the target game
    const result = analyzeRest(games, EPOCH + 14 * DAY, [9]);
    expect(result.hasByeWeekPrior).toBe(true);
  });

  it("hasByeWeekPrior is false when byeWeeks provided but no matching bye", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", date: EPOCH, weekNumber: 8 }),
      makeGame({ gameId: "g2", date: EPOCH + 14 * DAY, weekNumber: 10 }),
    ];
    // Week 5 is a bye, not between weeks 8 and 10
    const result = analyzeRest(games, EPOCH + 14 * DAY, [5]);
    expect(result.hasByeWeekPrior).toBe(false);
  });

  it("hasByeWeekPrior is false when no prior games and byeWeeks provided", () => {
    const result = analyzeRest([], EPOCH, [9]);
    expect(result.hasByeWeekPrior).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// homeAwayRecord
// ---------------------------------------------------------------------------
describe("homeAwayRecord", () => {
  it("returns correct record strings", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "h1", isHome: true, result: "win" }),
      makeGame({ gameId: "h2", isHome: true, result: "win" }),
      makeGame({ gameId: "h3", isHome: true, result: "loss" }),
      makeGame({ gameId: "a1", isHome: false, result: "win" }),
      makeGame({ gameId: "a2", isHome: false, result: "loss" }),
      makeGame({ gameId: "a3", isHome: false, result: "loss" }),
    ];
    const rec = homeAwayRecord(games);
    expect(rec.home.record).toBe("2-1");
    expect(rec.away.record).toBe("1-2");
  });

  it("computes homeWinRate correctly", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "h1", isHome: true, result: "win" }),
      makeGame({ gameId: "h2", isHome: true, result: "win" }),
      makeGame({ gameId: "h3", isHome: true, result: "loss" }),
    ];
    const rec = homeAwayRecord(games);
    // 2 wins out of 3 decided (no pushes) = 2/3
    expect(rec.homeWinRate).toBeCloseTo(2 / 3);
  });

  it("computes awayWinRate correctly", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "a1", isHome: false, result: "win" }),
      makeGame({ gameId: "a2", isHome: false, result: "loss" }),
    ];
    const rec = homeAwayRecord(games);
    expect(rec.awayWinRate).toBe(0.5);
  });

  it("returns homeWinRate null when no settled home games", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "a1", isHome: false, result: "win" }),
    ];
    const rec = homeAwayRecord(games);
    expect(rec.homeWinRate).toBeNull();
    expect(rec.homeAdvantage).toBeNull();
  });

  it("returns awayWinRate null when no away games", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "h1", isHome: true, result: "win" }),
    ];
    const rec = homeAwayRecord(games);
    expect(rec.awayWinRate).toBeNull();
    expect(rec.homeAdvantage).toBeNull();
  });

  it("excludes pushes from win rate calculation", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "h1", isHome: true, result: "win" }),
      makeGame({ gameId: "h2", isHome: true, result: "push" }),
      makeGame({ gameId: "h3", isHome: true, result: "push" }),
    ];
    const rec = homeAwayRecord(games);
    // Only 1 decided game (the win), push doesn't count
    expect(rec.homeWinRate).toBe(1.0);
    expect(rec.home.pushes).toBe(2);
  });

  it("calculates homeAdvantage correctly", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "h1", isHome: true, result: "win" }),
      makeGame({ gameId: "h2", isHome: true, result: "win" }),
      makeGame({ gameId: "h3", isHome: true, result: "loss" }),
      makeGame({ gameId: "a1", isHome: false, result: "win" }),
      makeGame({ gameId: "a2", isHome: false, result: "loss" }),
      makeGame({ gameId: "a3", isHome: false, result: "loss" }),
    ];
    const rec = homeAwayRecord(games);
    // home: 2/3, away: 1/3 → advantage = 1/3
    expect(rec.homeAdvantage).toBeCloseTo(1 / 3);
  });

  it("excludes pending games", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "h1", isHome: true, result: "pending" }),
      makeGame({ gameId: "h2", isHome: true, result: undefined }),
    ];
    const rec = homeAwayRecord(games);
    expect(rec.homeWinRate).toBeNull();
    expect(rec.home.wins).toBe(0);
    expect(rec.home.losses).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// travelBurden
// ---------------------------------------------------------------------------
describe("travelBurden", () => {
  it("counts gamesInLast7Days correctly", () => {
    const target = EPOCH + 10 * DAY;
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", date: EPOCH + 4 * DAY, isHome: false }),  // 6 days before → in window
      makeGame({ gameId: "g2", date: EPOCH + 6 * DAY, isHome: false }),  // 4 days before → in window
      makeGame({ gameId: "g3", date: EPOCH, isHome: false }),             // 10 days before → not in window
    ];
    const burden = travelBurden(games, target);
    expect(burden.gamesInLast7Days).toBe(2);
  });

  it("counts gamesInLast14Days correctly", () => {
    const target = EPOCH + 15 * DAY;
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", date: EPOCH + 2 * DAY, isHome: false }),  // 13 days before → in window
      makeGame({ gameId: "g2", date: EPOCH + 8 * DAY, isHome: false }),  // 7 days before → in window
      makeGame({ gameId: "g3", date: EPOCH, isHome: false }),             // 15 days before → not in window
    ];
    const burden = travelBurden(games, target);
    expect(burden.gamesInLast14Days).toBe(2);
  });

  it("counts consecutiveAwayGames correctly", () => {
    const target = EPOCH + 10 * DAY;
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", date: EPOCH, isHome: true }),
      makeGame({ gameId: "g2", date: EPOCH + 3 * DAY, isHome: false }),
      makeGame({ gameId: "g3", date: EPOCH + 6 * DAY, isHome: false }),
    ];
    const burden = travelBurden(games, target);
    expect(burden.consecutiveAwayGames).toBe(2);
    expect(burden.backToBackAway).toBe(true);
  });

  it("stops consecutive streak on home game", () => {
    const target = EPOCH + 10 * DAY;
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", date: EPOCH, isHome: false }),
      makeGame({ gameId: "g2", date: EPOCH + 3 * DAY, isHome: true }),
      makeGame({ gameId: "g3", date: EPOCH + 6 * DAY, isHome: false }),
    ];
    const burden = travelBurden(games, target);
    expect(burden.consecutiveAwayGames).toBe(1);
    expect(burden.backToBackAway).toBe(false);
  });

  it("returns 0 consecutiveAwayGames when no prior games", () => {
    const burden = travelBurden([], EPOCH);
    expect(burden.consecutiveAwayGames).toBe(0);
    expect(burden.backToBackAway).toBe(false);
  });

  it("returns 0 consecutiveAwayGames when last prior game was home", () => {
    const target = EPOCH + 5 * DAY;
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", date: EPOCH, isHome: true }),
    ];
    const burden = travelBurden(games, target);
    expect(burden.consecutiveAwayGames).toBe(0);
  });

  it("does not count target game itself in gamesInLast7Days", () => {
    const target = EPOCH + 7 * DAY;
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", date: target, isHome: false }), // the target itself
    ];
    const burden = travelBurden(games, target);
    expect(burden.gamesInLast7Days).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getByeWeeks
// ---------------------------------------------------------------------------
describe("getByeWeeks", () => {
  it("finds missing weeks in NFL schedule", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", weekNumber: 1 }),
      makeGame({ gameId: "g2", weekNumber: 2 }),
      makeGame({ gameId: "g3", weekNumber: 4 }),
      makeGame({ gameId: "g4", weekNumber: 5 }),
    ];
    expect(getByeWeeks(games, 5)).toEqual([3]);
  });

  it("returns empty array when no gaps", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", weekNumber: 1 }),
      makeGame({ gameId: "g2", weekNumber: 2 }),
      makeGame({ gameId: "g3", weekNumber: 3 }),
    ];
    expect(getByeWeeks(games, 3)).toEqual([]);
  });

  it("finds multiple bye weeks", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", weekNumber: 1 }),
      makeGame({ gameId: "g2", weekNumber: 4 }),
    ];
    expect(getByeWeeks(games, 5)).toEqual([2, 3, 5]);
  });

  it("returns all weeks as byes when games have no weekNumber", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1" }), // no weekNumber
    ];
    expect(getByeWeeks(games, 3)).toEqual([1, 2, 3]);
  });

  it("returns sorted bye weeks", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", weekNumber: 3 }),
    ];
    expect(getByeWeeks(games, 5)).toEqual([1, 2, 4, 5]);
  });
});

// ---------------------------------------------------------------------------
// currentHomeStreak
// ---------------------------------------------------------------------------
describe("currentHomeStreak", () => {
  it("returns 0 for empty array", () => {
    expect(currentHomeStreak([])).toBe(0);
  });

  it("returns 0 if last game is away", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", isHome: true }),
      makeGame({ gameId: "g2", isHome: false }),
    ];
    expect(currentHomeStreak(games)).toBe(0);
  });

  it("counts 3 consecutive home games at end", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", isHome: false }),
      makeGame({ gameId: "g2", isHome: true }),
      makeGame({ gameId: "g3", isHome: true }),
      makeGame({ gameId: "g4", isHome: true }),
    ];
    expect(currentHomeStreak(games)).toBe(3);
  });

  it("stops counting at first away game from end", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", isHome: true }),
      makeGame({ gameId: "g2", isHome: false }),
      makeGame({ gameId: "g3", isHome: true }),
    ];
    expect(currentHomeStreak(games)).toBe(1);
  });

  it("returns full length if all games are home", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", isHome: true }),
      makeGame({ gameId: "g2", isHome: true }),
    ];
    expect(currentHomeStreak(games)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// currentAwayStreak
// ---------------------------------------------------------------------------
describe("currentAwayStreak", () => {
  it("returns 0 for empty array", () => {
    expect(currentAwayStreak([])).toBe(0);
  });

  it("returns 0 if last game is home", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", isHome: false }),
      makeGame({ gameId: "g2", isHome: true }),
    ];
    expect(currentAwayStreak(games)).toBe(0);
  });

  it("counts consecutive away games at end", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", isHome: true }),
      makeGame({ gameId: "g2", isHome: false }),
      makeGame({ gameId: "g3", isHome: false }),
    ];
    expect(currentAwayStreak(games)).toBe(2);
  });

  it("counts a single away game at end", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", isHome: true }),
      makeGame({ gameId: "g2", isHome: false }),
    ];
    expect(currentAwayStreak(games)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// scheduleStrength
// ---------------------------------------------------------------------------
describe("scheduleStrength", () => {
  it("returns 0 for empty opponents", () => {
    expect(scheduleStrength([])).toBe(0);
  });

  it("returns the single opponent win rate", () => {
    expect(scheduleStrength([{ winRate: 0.6 }])).toBe(0.6);
  });

  it("averages opponent win rates", () => {
    const opponents = [
      { winRate: 0.4 },
      { winRate: 0.6 },
      { winRate: 0.8 },
    ];
    expect(scheduleStrength(opponents)).toBeCloseTo(0.6);
  });

  it("handles all same win rates", () => {
    const opponents = [{ winRate: 0.5 }, { winRate: 0.5 }, { winRate: 0.5 }];
    expect(scheduleStrength(opponents)).toBe(0.5);
  });
});

// ---------------------------------------------------------------------------
// winRateInLast
// ---------------------------------------------------------------------------
describe("winRateInLast", () => {
  it("returns null when no settled games", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", result: "pending" }),
    ];
    expect(winRateInLast(games, 5)).toBeNull();
  });

  it("returns null for empty game list", () => {
    expect(winRateInLast([], 5)).toBeNull();
  });

  it("computes win rate over last 5 games", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", result: "win" }),
      makeGame({ gameId: "g2", result: "win" }),
      makeGame({ gameId: "g3", result: "loss" }),
      makeGame({ gameId: "g4", result: "loss" }),
      makeGame({ gameId: "g5", result: "win" }),
    ];
    expect(winRateInLast(games, 5)).toBeCloseTo(3 / 5);
  });

  it("only considers last n games", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", result: "win" }),
      makeGame({ gameId: "g2", result: "win" }),
      makeGame({ gameId: "g3", result: "win" }),
      makeGame({ gameId: "g4", result: "loss" }),
      makeGame({ gameId: "g5", result: "loss" }),
    ];
    // Last 2 games: g4=loss, g5=loss → 0/2
    expect(winRateInLast(games, 2)).toBe(0);
  });

  it("does not count pushes as win or loss", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", result: "win" }),
      makeGame({ gameId: "g2", result: "push" }),
      makeGame({ gameId: "g3", result: "push" }),
    ];
    // 3 settled games in window, only 1 decided (g1=win)
    expect(winRateInLast(games, 3)).toBe(1.0);
  });

  it("returns null when window is all pushes", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", result: "push" }),
      makeGame({ gameId: "g2", result: "push" }),
    ];
    expect(winRateInLast(games, 2)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// homeWinRate
// ---------------------------------------------------------------------------
describe("homeWinRate", () => {
  it("returns null when no settled home games", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", isHome: false, result: "win" }),
    ];
    expect(homeWinRate(games)).toBeNull();
  });

  it("computes home win rate correctly", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "h1", isHome: true, result: "win" }),
      makeGame({ gameId: "h2", isHome: true, result: "loss" }),
      makeGame({ gameId: "h3", isHome: true, result: "loss" }),
      makeGame({ gameId: "a1", isHome: false, result: "win" }), // excluded
    ];
    expect(homeWinRate(games)).toBeCloseTo(1 / 3);
  });

  it("returns null for empty list", () => {
    expect(homeWinRate([])).toBeNull();
  });

  it("excludes pushes from denominator", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "h1", isHome: true, result: "win" }),
      makeGame({ gameId: "h2", isHome: true, result: "push" }),
    ];
    expect(homeWinRate(games)).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// awayWinRate
// ---------------------------------------------------------------------------
describe("awayWinRate", () => {
  it("returns null when no settled away games", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "g1", isHome: true, result: "win" }),
    ];
    expect(awayWinRate(games)).toBeNull();
  });

  it("computes away win rate correctly", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "a1", isHome: false, result: "win" }),
      makeGame({ gameId: "a2", isHome: false, result: "win" }),
      makeGame({ gameId: "a3", isHome: false, result: "loss" }),
    ];
    expect(awayWinRate(games)).toBeCloseTo(2 / 3);
  });

  it("returns null for empty list", () => {
    expect(awayWinRate([])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// splitByHomeAway
// ---------------------------------------------------------------------------
describe("splitByHomeAway", () => {
  it("splits games into home and away", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "h1", isHome: true }),
      makeGame({ gameId: "a1", isHome: false }),
      makeGame({ gameId: "h2", isHome: true }),
    ];
    const { home, away } = splitByHomeAway(games);
    expect(home).toHaveLength(2);
    expect(away).toHaveLength(1);
    expect(home.every((g) => g.isHome)).toBe(true);
    expect(away.every((g) => !g.isHome)).toBe(true);
  });

  it("handles all home games", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "h1", isHome: true }),
      makeGame({ gameId: "h2", isHome: true }),
    ];
    const { home, away } = splitByHomeAway(games);
    expect(home).toHaveLength(2);
    expect(away).toHaveLength(0);
  });

  it("handles all away games", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "a1", isHome: false }),
    ];
    const { home, away } = splitByHomeAway(games);
    expect(home).toHaveLength(0);
    expect(away).toHaveLength(1);
  });

  it("handles empty list", () => {
    const { home, away } = splitByHomeAway([]);
    expect(home).toHaveLength(0);
    expect(away).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// upcomingHomeGames
// ---------------------------------------------------------------------------
describe("upcomingHomeGames", () => {
  it("returns next count home games at or after from", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "h1", isHome: true, date: EPOCH + 1 * DAY }),
      makeGame({ gameId: "h2", isHome: true, date: EPOCH + 3 * DAY }),
      makeGame({ gameId: "h3", isHome: true, date: EPOCH + 5 * DAY }),
      makeGame({ gameId: "a1", isHome: false, date: EPOCH + 2 * DAY }),
    ];
    const result = upcomingHomeGames(games, EPOCH + 2 * DAY, 2);
    expect(result).toHaveLength(2);
    expect(result[0].gameId).toBe("h2");
    expect(result[1].gameId).toBe("h3");
  });

  it("returns sorted by date ascending", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "h3", isHome: true, date: EPOCH + 5 * DAY }),
      makeGame({ gameId: "h1", isHome: true, date: EPOCH + 1 * DAY }),
      makeGame({ gameId: "h2", isHome: true, date: EPOCH + 3 * DAY }),
    ];
    const result = upcomingHomeGames(games, EPOCH, 3);
    expect(result[0].date).toBeLessThan(result[1].date);
    expect(result[1].date).toBeLessThan(result[2].date);
  });

  it("includes games exactly at from timestamp", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "h1", isHome: true, date: EPOCH }),
    ];
    const result = upcomingHomeGames(games, EPOCH, 5);
    expect(result).toHaveLength(1);
  });

  it("returns empty when no home games match", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "a1", isHome: false, date: EPOCH + 1 * DAY }),
    ];
    const result = upcomingHomeGames(games, EPOCH, 5);
    expect(result).toHaveLength(0);
  });

  it("limits results to count", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "h1", isHome: true, date: EPOCH + 1 * DAY }),
      makeGame({ gameId: "h2", isHome: true, date: EPOCH + 2 * DAY }),
      makeGame({ gameId: "h3", isHome: true, date: EPOCH + 3 * DAY }),
    ];
    const result = upcomingHomeGames(games, EPOCH, 2);
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// upcomingAwayGames
// ---------------------------------------------------------------------------
describe("upcomingAwayGames", () => {
  it("returns next count away games at or after from", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "a1", isHome: false, date: EPOCH + 1 * DAY }),
      makeGame({ gameId: "a2", isHome: false, date: EPOCH + 3 * DAY }),
      makeGame({ gameId: "h1", isHome: true, date: EPOCH + 2 * DAY }),
    ];
    const result = upcomingAwayGames(games, EPOCH, 2);
    expect(result).toHaveLength(2);
    expect(result[0].gameId).toBe("a1");
    expect(result[1].gameId).toBe("a2");
  });

  it("returns empty when no away games match", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "h1", isHome: true, date: EPOCH + 1 * DAY }),
    ];
    const result = upcomingAwayGames(games, EPOCH, 5);
    expect(result).toHaveLength(0);
  });

  it("limits to count", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "a1", isHome: false, date: EPOCH + 1 * DAY }),
      makeGame({ gameId: "a2", isHome: false, date: EPOCH + 2 * DAY }),
      makeGame({ gameId: "a3", isHome: false, date: EPOCH + 3 * DAY }),
    ];
    const result = upcomingAwayGames(games, EPOCH, 2);
    expect(result).toHaveLength(2);
  });

  it("returns sorted by date ascending", () => {
    const games: ScheduledGame[] = [
      makeGame({ gameId: "a3", isHome: false, date: EPOCH + 3 * DAY }),
      makeGame({ gameId: "a1", isHome: false, date: EPOCH + 1 * DAY }),
    ];
    const result = upcomingAwayGames(games, EPOCH, 2);
    expect(result[0].date).toBeLessThan(result[1].date);
  });
});

import { describe, it, expect } from "vitest";

import {
  buildSportsDiagnosticsReport,
  diagnoseSport,
  SPORTS_DIAGNOSTICS_MIN_GAMES,
  SPORTS_DIAGNOSTICS_MIN_TEAM_GAMES,
  type TeamGameLogRecord,
} from "@/lib/cockpit/load-sports-diagnostics";

/**
 * Unit tests for the PURE sports-diagnostics aggregator (rows → report).
 *
 * No DB is touched and no network is called — `buildSportsDiagnosticsReport` /
 * `diagnoseSport` are pure functions. We feed fixture team-game-log arrays built
 * directly from the TeamGameLog model's shape and assert:
 *   - a sport with enough decided games rates (power/Elo tables populate),
 *   - rest / back-to-back / home-field context computes from stored fields,
 *   - a sport below the games floor degrades to an honest INSUFFICIENT state,
 *   - a sport with no data is handled (empty report),
 *   - a team below the per-team floor is listed but flagged unrated.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const BASE = Date.UTC(2026, 0, 1, 0, 0, 0);

function log(over: Partial<TeamGameLogRecord> = {}): TeamGameLogRecord {
  return {
    sport: "nfl",
    teamName: "Team A",
    opponentName: "Team B",
    isHome: true,
    gameDateIso: new Date(BASE).toISOString(),
    result: "WIN",
    atsResult: "WIN",
    teamScore: 24,
    opponentScore: 17,
    restDays: 7,
    isBackToBack: false,
    scheduleDensity: 1,
    ...over,
  };
}

/**
 * Build a settled head-to-head game as TWO team-game-log rows (one per team) —
 * exactly how the TeamGameLog table stores it. `homeWon` decides each side.
 */
function gamePair(opts: {
  sport: string;
  dayOffset: number;
  home: string;
  away: string;
  homeWon: boolean;
  homeScore: number;
  awayScore: number;
  homeRest?: number | null;
  awayRest?: number | null;
  homeB2B?: boolean;
  awayB2B?: boolean;
  homeCovered?: boolean;
}): TeamGameLogRecord[] {
  const iso = new Date(BASE + opts.dayOffset * DAY_MS).toISOString();
  const homeRow = log({
    sport: opts.sport,
    teamName: opts.home,
    opponentName: opts.away,
    isHome: true,
    gameDateIso: iso,
    result: opts.homeWon ? "WIN" : "LOSS",
    atsResult: opts.homeCovered === undefined ? (opts.homeWon ? "WIN" : "LOSS") : opts.homeCovered ? "WIN" : "LOSS",
    teamScore: opts.homeScore,
    opponentScore: opts.awayScore,
    restDays: opts.homeRest === undefined ? 7 : opts.homeRest,
    isBackToBack: opts.homeB2B ?? false,
    scheduleDensity: 1,
  });
  const awayRow = log({
    sport: opts.sport,
    teamName: opts.away,
    opponentName: opts.home,
    isHome: false,
    gameDateIso: iso,
    result: opts.homeWon ? "LOSS" : "WIN",
    atsResult: opts.homeCovered === undefined ? (opts.homeWon ? "LOSS" : "WIN") : opts.homeCovered ? "LOSS" : "WIN",
    teamScore: opts.awayScore,
    opponentScore: opts.homeScore,
    restDays: opts.awayRest === undefined ? 7 : opts.awayRest,
    isBackToBack: opts.awayB2B ?? false,
    scheduleDensity: 1,
  });
  return [homeRow, awayRow];
}

/**
 * Generate a round-robin-ish schedule across `teams` with enough games to clear
 * the floor. The home team always wins, so home-field edge is unambiguous.
 */
function buildClearedSport(sport: string): TeamGameLogRecord[] {
  const teams = ["Alpha", "Bravo", "Charlie", "Delta"];
  const rows: TeamGameLogRecord[] = [];
  let day = 0;
  // Each ordered pair plays twice → plenty above the floor (24).
  for (let round = 0; round < 2; round++) {
    for (let i = 0; i < teams.length; i++) {
      for (let j = 0; j < teams.length; j++) {
        if (i === j) continue;
        rows.push(
          ...gamePair({
            sport,
            dayOffset: day,
            home: teams[i]!,
            away: teams[j]!,
            homeWon: true,
            homeScore: 27,
            awayScore: 20,
          }),
        );
        day += 1;
      }
    }
  }
  return rows;
}

describe("diagnoseSport — happy path (sport clears the games floor)", () => {
  const rows = buildClearedSport("nfl");
  const result = diagnoseSport("nfl", rows);

  it("rates the sport and populates power/Elo team rows", () => {
    expect(result.status).toBe("OK");
    expect(result.decidedRows).toBeGreaterThanOrEqual(SPORTS_DIAGNOSTICS_MIN_GAMES);
    expect(result.teams.length).toBe(4);
    // Every rated team carries a power score, tier, and an Elo rating.
    for (const t of result.teams) {
      expect(t.underRated).toBe(false);
      expect(t.powerScore).not.toBeNull();
      expect(t.powerTier).not.toBeNull();
      expect(t.elo).not.toBeNull();
    }
    // A tier-distribution summary is present.
    expect(result.powerSummary).not.toBeNull();
  });

  it("ranks teams by power score descending", () => {
    const scores = result.teams.map((t) => t.powerScore ?? 0);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1]!).toBeGreaterThanOrEqual(scores[i]!);
    }
  });

  it("computes a home-field edge from the stored record (home always won here)", () => {
    expect(result.homeField.homeDecided).toBeGreaterThan(0);
    expect(result.homeField.awayDecided).toBeGreaterThan(0);
    // Home always won → home win rate 1, away 0, edge 1.
    expect(result.homeField.homeWinRate).toBeCloseTo(1, 5);
    expect(result.homeField.awayWinRate).toBeCloseTo(0, 5);
    expect(result.homeField.homeEdge).toBeCloseTo(1, 5);
    // Home margin +7, away margin -7 (27–20).
    expect(result.homeField.meanHomeMargin).toBeCloseTo(7, 5);
    expect(result.homeField.meanAwayMargin).toBeCloseTo(-7, 5);
  });
});

describe("diagnoseSport — rest / back-to-back distribution", () => {
  it("counts short/long rest and back-to-backs from stored fields", () => {
    const rows: TeamGameLogRecord[] = [
      ...gamePair({
        sport: "nba",
        dayOffset: 0,
        home: "Lakers",
        away: "Celtics",
        homeWon: true,
        homeScore: 110,
        awayScore: 102,
        homeRest: 1, // short rest
        awayRest: 9, // long rest
        homeB2B: true,
      }),
      ...gamePair({
        sport: "nba",
        dayOffset: 2,
        home: "Celtics",
        away: "Lakers",
        homeWon: false,
        homeScore: 99,
        awayScore: 105,
        homeRest: 2, // short rest
        awayRest: 8, // long rest
        awayB2B: true,
      }),
    ];
    const result = diagnoseSport("nba", rows);
    // 4 rows total; 2 short-rest (<3), 2 long-rest (>7).
    expect(result.rest.withRestData).toBe(4);
    expect(result.rest.shortRestGames).toBe(2);
    expect(result.rest.longRestGames).toBe(2);
    expect(result.rest.backToBackGames).toBe(2);
    expect(result.rest.meanRestDays).toBeCloseTo((1 + 9 + 2 + 8) / 4, 5);
    // Short-rest decided win rate: home won game1 (rest1), home lost game2 (rest2) → 1/2.
    expect(result.rest.shortRestWinRate).toBeCloseTo(0.5, 5);
  });
});

describe("diagnoseSport — honest-empty below the games floor", () => {
  it("reports INSUFFICIENT with a 'building history' note and no team table", () => {
    const rows: TeamGameLogRecord[] = [
      ...gamePair({
        sport: "mlb",
        dayOffset: 0,
        home: "Yankees",
        away: "Red Sox",
        homeWon: true,
        homeScore: 5,
        awayScore: 3,
      }),
    ];
    const result = diagnoseSport("mlb", rows);
    expect(result.status).toBe("INSUFFICIENT");
    expect(result.decidedRows).toBeLessThan(SPORTS_DIAGNOSTICS_MIN_GAMES);
    expect(result.teams).toEqual([]);
    expect(result.powerSummary).toBeNull();
    expect(result.insufficientNote).toContain("Building history");
    // Rest + home-field context is still computed honestly for the small sample.
    expect(result.homeField.homeDecided).toBe(1);
  });
});

describe("diagnoseSport — under-floor team is listed but unrated", () => {
  it("flags a team below the per-team games floor as unrated", () => {
    // Build a cleared sport, then add a brand-new team with a single game.
    const rows = buildClearedSport("nhl");
    rows.push(
      ...gamePair({
        sport: "nhl",
        dayOffset: 100,
        home: "Newbie",
        away: "Alpha",
        homeWon: true,
        homeScore: 4,
        awayScore: 2,
      }),
    );
    const result = diagnoseSport("nhl", rows);
    expect(result.status).toBe("OK");
    const newbie = result.teams.find((t) => t.teamName === "Newbie");
    expect(newbie).toBeDefined();
    expect(newbie?.decided).toBeLessThan(SPORTS_DIAGNOSTICS_MIN_TEAM_GAMES);
    expect(newbie?.underRated).toBe(true);
    expect(newbie?.powerScore).toBeNull();
    expect(newbie?.powerTier).toBeNull();
  });
});

describe("buildSportsDiagnosticsReport — rollup across sports", () => {
  it("returns an honest-empty report for no records", () => {
    const report = buildSportsDiagnosticsReport([]);
    expect(report.sports).toEqual([]);
    expect(report.totalRows).toBe(0);
    expect(report.sportsRated).toBe(0);
    expect(report.sportsBuilding).toBe(0);
  });

  it("separates rated sports from building sports and orders rated first", () => {
    const cleared = buildClearedSport("nfl");
    const thin: TeamGameLogRecord[] = gamePair({
      sport: "mlb",
      dayOffset: 0,
      home: "Yankees",
      away: "Red Sox",
      homeWon: true,
      homeScore: 5,
      awayScore: 3,
    });
    const report = buildSportsDiagnosticsReport([...cleared, ...thin]);
    expect(report.sports.length).toBe(2);
    expect(report.sportsRated).toBe(1);
    expect(report.sportsBuilding).toBe(1);
    expect(report.totalRows).toBe(cleared.length + thin.length);
    // Rated sport renders first.
    expect(report.sports[0]?.status).toBe("OK");
    expect(report.sports[1]?.status).toBe("INSUFFICIENT");
  });

  it("uses the stored sport key as the grouping key (TBD rows do not decide)", () => {
    const rows: TeamGameLogRecord[] = [
      // A settled game.
      ...gamePair({
        sport: "nfl",
        dayOffset: 0,
        home: "Bills",
        away: "Jets",
        homeWon: true,
        homeScore: 20,
        awayScore: 10,
      }),
      // An unsettled (TBD) game — must not inflate decided counts.
      log({
        sport: "nfl",
        teamName: "Bills",
        opponentName: "Dolphins",
        isHome: true,
        result: "TBD",
        atsResult: "TBD",
        teamScore: null,
        opponentScore: null,
        gameDateIso: new Date(BASE + DAY_MS).toISOString(),
      }),
    ];
    const report = buildSportsDiagnosticsReport(rows);
    const nfl = report.sports.find((s) => s.sport === "nfl");
    expect(nfl).toBeDefined();
    expect(nfl?.totalRows).toBe(3); // 2 settled rows + 1 TBD row
    expect(nfl?.decidedRows).toBe(2); // only the 2 WIN/LOSS rows decide
  });
});

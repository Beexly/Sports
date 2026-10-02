/**
 * The DB loaders that close the "0 of 14 bundle fields" gap.
 *
 * The point of these tests is not that the loaders call the right Prisma
 * methods — it is the two claims that were silently false before:
 *   1. the app-layer abbreviation join actually resolves real rows, and
 *   2. no surface can hand the spine a week that post-dates the as-of point.
 * Only the DB is mocked; no network, no credentials, no live connection.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  injury: { findMany: vi.fn() },
  teamGameEfficiency: { findMany: vi.fn() },
  snapCount: { findMany: vi.fn() },
  nextGenStat: { findMany: vi.fn() },
  playerGameStat: { findMany: vi.fn() },
  gameSignal: { findMany: vi.fn() },
  // The schedule team index reads the NFL schedule from `games` to resolve a
  // NULL `player_game_stats.team` row through its `opponent`.
  game: { findMany: vi.fn() },
}));
vi.mock("@sports/db", () => ({ db: mocks }));

import {
  loadBundleSurfaces,
  loadInjuries,
  loadRatings,
  loadGameSignals,
  loadPlayerStats,
  nflSeasonForDate,
  nflSeasonWeekForDate,
} from "./db-loaders";
import { __resetScheduleTeamIndexCache } from "./schedule-team-index";

function injuryRow(over: Record<string, unknown> = {}) {
  return {
    playerName: "Player One",
    team: "KC",
    position: "QB",
    reportStatus: "Questionable",
    practiceStatus: "Limited",
    primaryInjury: "Ankle",
    season: 2026,
    week: 3,
    sourceId: "nflverse",
    fetchedAt: new Date("2026-09-25T12:00:00Z"),
    ...over,
  };
}

function gseRow(over: Record<string, unknown> = {}) {
  return {
    team: "KC",
    opponent: "DEN",
    isHome: true,
    plays: 70,
    offEpaPerPlay: 0.11,
    offSuccess: 0.44,
    defEpaPerPlay: -0.05,
    defSuccess: 0.52,
    season: 2026,
    week: 2,
    sourceId: "nflverse",
    fetchedAt: new Date("2026-09-20T12:00:00Z"),
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const t of Object.values(mocks)) t.findMany.mockResolvedValue([]);
  // The schedule index is memoised process-wide; without a reset one test's
  // schedule would satisfy every later test in the file.
  __resetScheduleTeamIndexCache();
});

/** One week of NFL schedule in the shape buildScheduleTeamIndex selects. */
function scheduleGame(
  homeTeamName: string,
  awayTeamName: string,
  commenceTime: string,
) {
  return { homeTeamName, awayTeamName, commenceTime: new Date(commenceTime) };
}

/**
 * Real prod shape for the first two 2026 weeks (verified on Neon
 * 2026-09-30), including the Rams' GSE spelling 'LA' rather than nflverse's
 * 'LAR'.
 */
const KC_2026_SCHEDULE = [
  scheduleGame("Kansas City Chiefs", "Dallas Cowboys", "2026-09-10T20:25:00Z"),
  scheduleGame("Buffalo Bills", "New York Jets", "2026-09-13T17:00:00Z"),
  scheduleGame("Kansas City Chiefs", "Buffalo Bills", "2026-09-20T17:00:00Z"),
];

/** A player-stat row shaped like the real thing: team NULL, opponent set. */
function nullTeamStatRow(over: Record<string, unknown> = {}) {
  return {
    playerId: "p1",
    team: null,
    opponent: "DAL",
    season: 2026,
    week: 1,
    attempts: null,
    carries: 8,
    receptions: 3,
    targets: 5,
    targetShare: 0.22,
    fantasyPointsPpr: 11.4,
    passingEpa: null,
    rushingEpa: 0.04,
    receivingEpa: 0.11,
    sourceId: "nflverse",
    fetchedAt: new Date("2026-09-11T00:00:00Z"),
    ...over,
  };
}

describe("season / week resolution", () => {
  it("labels September and later as the current season, Jan/Feb as the prior", () => {
    expect(nflSeasonForDate(new Date("2026-09-10T00:00:00Z"))).toBe(2026);
    expect(nflSeasonForDate(new Date("2026-12-31T00:00:00Z"))).toBe(2026);
    expect(nflSeasonForDate(new Date("2027-01-10T00:00:00Z"))).toBe(2026);
    expect(nflSeasonForDate(new Date("2027-02-01T00:00:00Z"))).toBe(2026);
    expect(nflSeasonForDate(new Date("2026-08-31T00:00:00Z"))).toBe(2025);
  });

  it("resolves the 2026 weeks the DB actually holds GSE rows for", () => {
    // Ground truth from prod: team_game_efficiency 2026 week 1 covers games
    // on 2026-09-10..15, week 2 on 09-18..22, week 3 on 09-25..29.
    expect(nflSeasonWeekForDate(new Date("2026-09-10T00:20:00Z"))).toEqual({
      season: 2026,
      week: 1,
    });
    expect(nflSeasonWeekForDate(new Date("2026-09-24T17:00:00Z"))).toEqual({
      season: 2026,
      week: 3,
    });
    expect(nflSeasonWeekForDate(new Date("2027-01-10T21:05:00Z"))).toEqual({
      season: 2026,
      week: 18,
    });
  });

  it("returns null on an unparseable date rather than guessing a week", () => {
    expect(nflSeasonWeekForDate(new Date("not-a-date"))).toBeNull();
  });
});

describe("injury loader", () => {
  it("resolves full names to GSE abbreviations and splits home from away", async () => {
    mocks.injury.findMany.mockResolvedValue([
      injuryRow({ team: "KC", playerName: "Home Guy" }),
      injuryRow({ team: "BUF", playerName: "Away Guy" }),
    ]);
    const out = await loadInjuries(
      {
        gameId: "g1",
        homeTeamName: "Kansas City Chiefs",
        awayTeamName: "Buffalo Bills",
        commenceTime: new Date("2026-09-27T17:00:00Z"),
      },
      2026,
      4,
    );
    expect(out.home.map((r) => r.playerName)).toEqual(["Home Guy"]);
    expect(out.away.map((r) => r.playerName)).toEqual(["Away Guy"]);
    // The join is an abbreviation IN-list, not a relational join.
    const where = mocks.injury.findMany.mock.calls[0][0].where;
    expect(where.team).toEqual({ in: ["KC", "BUF"] });
    expect(where.season).toBe(2026);
  });

  it("never reads a week after the as-of week", async () => {
    await loadInjuries(
      {
        gameId: "g1",
        homeTeamName: "Kansas City Chiefs",
        awayTeamName: "Buffalo Bills",
        commenceTime: new Date("2026-09-27T17:00:00Z"),
      },
      2026,
      4,
    );
    expect(mocks.injury.findMany.mock.calls[0][0].where.week).toEqual({ lte: 4 });
  });

  it("skips placeholder names instead of joining 'TBD'", async () => {
    const out = await loadInjuries(
      {
        gameId: "g1",
        homeTeamName: "TBD",
        awayTeamName: "Buffalo Bills",
        commenceTime: new Date("2026-09-27T17:00:00Z"),
      },
      2026,
      4,
    );
    expect(out.home).toEqual([]);
    expect(out.away).toEqual([]);
    expect(mocks.injury.findMany).not.toHaveBeenCalled();
  });
});

describe("ratings loader (the app-layer GSE join)", () => {
  it("queries by abbreviation and lagged week, and caps distinct weeks", async () => {
    mocks.teamGameEfficiency.findMany.mockResolvedValue([
      gseRow({ team: "KC", week: 4 }),
      gseRow({ team: "KC", week: 3 }),
      gseRow({ team: "KC", week: 2 }),
      gseRow({ team: "KC", week: 1 }),
      gseRow({ team: "KC", week: 0 }),
      gseRow({ team: "KC", week: 5 }),
      gseRow({ team: "BUF", week: 3 }),
      gseRow({ team: "BUF", week: 2 }),
      gseRow({ team: "BUF", week: 1 }),
      gseRow({ team: "BUF", week: 5 }),
    ]);
    const out = await loadRatings(
      {
        gameId: "g1",
        homeTeamName: "Kansas City Chiefs",
        awayTeamName: "Buffalo Bills",
        commenceTime: new Date("2026-09-27T17:00:00Z"),
      },
      2026,
      4,
    );
    // week: { lt: lagWeek } — a week-N row describes a game already played.
    expect(mocks.teamGameEfficiency.findMany.mock.calls[0][0].where.week).toEqual({ lt: 4 });
    expect(out.home.every((r) => r.team === "KC")).toBe(true);
    expect(out.away.every((r) => r.team === "BUF")).toBe(true);
    // 5 weeks supplied, cap is 6 distinct weeks — nothing dropped here.
    expect(new Set(out.home.map((r) => r.week)).size).toBeLessThanOrEqual(6);
  });

  it("keeps at most RATINGS_HISTORY_WEEKS distinct weeks per side", async () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      gseRow({ team: "KC", week: i + 1 }),
    );
    mocks.teamGameEfficiency.findMany.mockResolvedValue(many);
    const out = await loadRatings(
      {
        gameId: "g1",
        homeTeamName: "Kansas City Chiefs",
        awayTeamName: "Buffalo Bills",
        commenceTime: new Date("2026-09-27T17:00:00Z"),
      },
      2026,
      20,
    );
    expect(new Set(out.home.map((r) => r.week)).size).toBe(6);
  });
});

describe("game signals loader", () => {
  it("joins on the real game FK and routes WEATHER rows to the weather surface", async () => {
    mocks.gameSignal.findMany.mockResolvedValue([
      {
        sourceCategory: "SCHEDULE",
        sourceName: "schedule-internal",
        signalKey: "schedule_density_7d_home",
        signalValue: 1,
        trustLevel: 1,
        fetchedAt: new Date("2026-09-30T20:00:00Z"),
      },
      {
        sourceCategory: "WEATHER",
        sourceName: "openweather",
        signalKey: "wind_mph",
        signalValue: 12,
        trustLevel: 0.8,
        fetchedAt: new Date("2026-09-30T20:00:00Z"),
      },
    ]);
    const out = await loadGameSignals("game-123");
    expect(mocks.gameSignal.findMany.mock.calls[0][0].where).toEqual({ gameId: "game-123" });
    expect(out.gameSignals.map((r) => r.signalKey)).toEqual(["schedule_density_7d_home"]);
    expect(out.weather.map((r) => r.signalKey)).toEqual(["wind_mph"]);
  });

  it("never selects expiresAt — it is 100% NULL on prod", async () => {
    mocks.gameSignal.findMany.mockResolvedValue([]);
    await loadGameSignals("game-123");
    const select = mocks.gameSignal.findMany.mock.calls[0][0].select;
    expect(Object.keys(select)).not.toContain("expiresAt");
  });
});

describe("loadBundleSurfaces", () => {
  // 2026-09-27 sits in NFL week 3. Verified against prod: team_game_efficiency
  // 2026 week 3 covers games from 2026-09-25 to 2026-09-29, and prod injuries
  // hold 301 rows for 2026 week 3. The as-of week for this game is therefore 3,
  // and the lagged surfaces may read weeks 1-2 only.
  const input = {
    gameId: "game-123",
    homeTeamName: "Kansas City Chiefs",
    awayTeamName: "Buffalo Bills",
    commenceTime: new Date("2026-09-27T17:00:00Z"),
  };

  it("fills surfaces from real rows and reports which were filled", async () => {
    mocks.injury.findMany.mockResolvedValue([injuryRow({ team: "KC" })]);
    mocks.teamGameEfficiency.findMany.mockResolvedValue([gseRow({ team: "KC" })]);
    mocks.snapCount.findMany.mockResolvedValue([
      { playerName: "P", team: "KC", position: "WR", offensePct: 0.9, season: 2026, week: 3, sourceId: "nflverse", fetchedAt: new Date() },
    ]);
    mocks.gameSignal.findMany.mockResolvedValue([
      {
        sourceCategory: "SCHEDULE",
        sourceName: "schedule-internal",
        signalKey: "schedule_density_7d_home",
        signalValue: 1,
        trustLevel: 1,
        fetchedAt: new Date(),
      },
    ]);

    const s = await loadBundleSurfaces(input);
    expect(s.homeInjuries).toHaveLength(1);
    expect(s.homeRatings).toHaveLength(1);
    expect(s.homeSnaps).toHaveLength(1);
    expect(s.gameSignals).toHaveLength(1);
    expect(s.resolution.homeAbbr).toBe("KC");
    expect(s.resolution.awayAbbr).toBe("BUF");
    expect(s.resolution.season).toBe(2026);
    expect(s.resolution.asOfWeek).toBe(3);
    // weather is honestly empty: prod has no rows in that category.
    expect(s.weather).toEqual([]);
    expect(s.resolution.notes.join(" ")).toContain("weather");
  });

  it("degrades one failing surface without losing the others", async () => {
    mocks.injury.findMany.mockRejectedValue(new Error("connection reset"));
    mocks.gameSignal.findMany.mockResolvedValue([
      {
        sourceCategory: "SCHEDULE",
        sourceName: "schedule-internal",
        signalKey: "k",
        signalValue: 1,
        trustLevel: 1,
        fetchedAt: new Date(),
      },
    ]);
    const s = await loadBundleSurfaces(input);
    expect(s.homeInjuries).toEqual([]);
    expect(s.gameSignals).toHaveLength(1);
    expect(s.resolution.notes.join(" ")).toContain("injuries load failed");
  });

  it("skips abbreviation-keyed surfaces on a non-NFL sport but still loads signals", async () => {
    mocks.gameSignal.findMany.mockResolvedValue([]);
    const s = await loadBundleSurfaces({
      gameId: "g-mlb",
      homeTeamName: "Arizona Cardinals",
      awayTeamName: "Baltimore Ravens",
      commenceTime: new Date("2026-04-05T23:00:00Z"),
    });
    // April labels as the PRIOR NFL season (currentNflSeasonLabel), and the
    // abbreviations still resolve, but the stored NFL tables hold nothing for
    // that window — the surfaces come back empty rather than wrong.
    expect(s.resolution.season).toBe(2025);
    expect(s.resolution.homeAbbr).toBe("ARI");
    expect(mocks.injury.findMany).toHaveBeenCalled();
  });

  it("returns an unresolvable team as a note, never a throw and never a wrong team", async () => {
    const s = await loadBundleSurfaces({
      gameId: "g-tbd",
      homeTeamName: "TBD",
      awayTeamName: "TBD",
      commenceTime: new Date("2026-09-27T17:00:00Z"),
    });
    expect(s.resolution.homeAbbr).toBeNull();
    expect(s.homeInjuries).toEqual([]);
    expect(s.homeRatings).toEqual([]);
    expect(mocks.injury.findMany).not.toHaveBeenCalled();
    expect(mocks.teamGameEfficiency.findMany).not.toHaveBeenCalled();
    // The game-id join still runs: it needs no abbreviation.
    expect(mocks.gameSignal.findMany).toHaveBeenCalled();
    expect(s.resolution.notes.join(" ")).toContain("abbreviation unresolved");
  });

  it("refuses to read rows beyond the as-of week on every week-keyed surface", async () => {
    await loadBundleSurfaces(input);
    const inj = mocks.injury.findMany.mock.calls[0][0].where;
    const gse = mocks.teamGameEfficiency.findMany.mock.calls[0][0].where;
    const snap = mocks.snapCount.findMany.mock.calls[0][0].where;
    const ngs = mocks.nextGenStat.findMany.mock.calls[0][0].where;
    const pgs = mocks.playerGameStat.findMany.mock.calls[0][0].where;
    expect(inj.week).toEqual({ lte: 3 });
    expect(gse.week).toEqual({ lt: 3 });
    expect(snap.week).toEqual({ lt: 3 });
    expect(ngs.week).toEqual({ lt: 3 });
    expect(pgs.week).toEqual({ lt: 3 });
  });

  it("leaves the weather zero labelled as a missing producer, not a pending backfill", async () => {
    mocks.gameSignal.findMany.mockResolvedValue([
      {
        sourceCategory: "SCHEDULE",
        sourceName: "schedule-internal",
        signalKey: "schedule_density_7d_home",
        signalValue: 1,
        trustLevel: 1,
        fetchedAt: new Date(),
      },
    ]);
    const s = await loadBundleSurfaces(input);
    expect(s.weather).toEqual([]);
    const note = s.resolution.notes.find((n) => n.includes("weather"));
    // "no producer" is the claim under test: a reader must not file this zero
    // next to a backfill that will fix it.
    expect(note).toMatch(/no producer/i);
    expect(note).toMatch(/not a pending backfill/i);
  });
});

/**
 * The player-stat surfaces read zero rows on 100% of picks because
 * `player_game_stats.team` is NULL for the 2025 and 2026 seasons. These tests
 * pin the recovery join and, just as importantly, its refusal to guess.
 */
describe("loadPlayerStats — schedule-derived team recovery", () => {
  const input = {
    gameId: "g1",
    homeTeamName: "Kansas City Chiefs",
    awayTeamName: "Buffalo Bills",
    commenceTime: new Date("2026-09-27T17:00:00Z"),
  };

  /** Route the two population queries: stored-team rows, then NULL-team rows. */
  function mockStatQueries(stored: unknown[], nullTeam: unknown[]): void {
    mocks.playerGameStat.findMany
      .mockReset()
      .mockResolvedValueOnce(stored)
      .mockResolvedValueOnce(nullTeam);
  }

  it("places a NULL-team row on the club that actually played its opponent", async () => {
    mocks.game.findMany.mockResolvedValue(KC_2026_SCHEDULE);
    // KC played DAL in week 1, so a KC offensive row names DAL as opponent.
    mockStatQueries([], [nullTeamStatRow({ playerId: "pKC", opponent: "DAL" })]);

    const out = await loadPlayerStats(input, 2026, 3);

    expect(out.home.map((r) => r.opponent)).toEqual(["DAL"]);
    expect(out.away).toEqual([]);
    expect(out.unresolved).toBe(false);
    expect(out.resolvedViaSchedule).toBe(1);
  });

  it("places the mirror image on the away club, not on the opponent's opponent", async () => {
    mocks.game.findMany.mockResolvedValue(KC_2026_SCHEDULE);
    // BUF played NYJ in week 1, so a BUF row names NYJ.
    mockStatQueries([], [nullTeamStatRow({ playerId: "pBUF", opponent: "NYJ" })]);

    const out = await loadPlayerStats(input, 2026, 3);
    expect(out.away.map((r) => r.opponent)).toEqual(["NYJ"]);
    expect(out.home).toEqual([]);
  });

  it("asks for the opponents these two clubs actually faced, not just home/away", async () => {
    mocks.game.findMany.mockResolvedValue(KC_2026_SCHEDULE);
    mockStatQueries([], []);

    await loadPlayerStats(input, 2026, 3);

    // This is the bug the fix exists to avoid: filtering on
    // opponent IN (KC, BUF) would return almost none of the home club's rows,
    // because KC's rows mostly name a third club. DAL is in this list only
    // because the schedule says KC played them.
    const recovery = mocks.playerGameStat.findMany.mock.calls[1][0].where;
    expect(recovery.team).toBeNull();
    const asked = recovery.opponent.in as string[];
    expect(asked).toContain("DAL"); // third club, week 1
    expect(asked).toContain("NYJ"); // third club, week 1
    expect(asked).toContain("BUF"); // KC's week-2 opponent
    expect(asked).toContain("KC"); // BUF's week-2 opponent
    expect(asked).not.toEqual(["KC", "BUF"]);
  });

  it("drops a row rather than attributing it when the week is ambiguous", async () => {
    // The week-22 clamp folds several postseason games into one bucket, so
    // SF's week-22 opponent is genuinely unknown.
    mocks.game.findMany.mockResolvedValue([
      scheduleGame("Las Vegas Raiders", "San Francisco 49ers", "2027-01-10T21:05:00Z"),
      scheduleGame("Tennessee Titans", "San Francisco 49ers", "2027-01-10T21:05:00Z"),
      scheduleGame("Los Angeles Chargers", "San Francisco 49ers", "2027-01-10T21:05:00Z"),
    ]);
    mockStatQueries([], [
      nullTeamStatRow({ playerId: "amb", season: 2026, week: 18, opponent: "SF" }),
    ]);

    const out = await loadPlayerStats(
      { ...input, homeTeamName: "San Francisco 49ers", awayTeamName: "Buffalo Bills" },
      2026,
      22,
    );
    // Correct answer is "we do not know", not "whichever club was read last".
    expect(out.home).toEqual([]);
    expect(out.away).toEqual([]);
    expect(out.unresolved).toBe(true);
  });

  it("never returns the same player's row twice across both queries", async () => {
    mocks.game.findMany.mockResolvedValue(KC_2026_SCHEDULE);
    mockStatQueries(
      [{ playerId: "pKC", team: "KC", opponent: "DAL", season: 2026, week: 1 }],
      [nullTeamStatRow({ playerId: "pKC", opponent: "DAL" })],
    );
    const out = await loadPlayerStats(input, 2026, 3);
    expect(out.home).toHaveLength(1);
  });

  it("keeps distinct players who share a club, week and opponent", async () => {
    mocks.game.findMany.mockResolvedValue(KC_2026_SCHEDULE);
    mockStatQueries(
      [],
      [
        nullTeamStatRow({ playerId: "pA", opponent: "DAL" }),
        nullTeamStatRow({ playerId: "pB", opponent: "DAL" }),
        nullTeamStatRow({ playerId: "pC", opponent: "DAL" }),
      ],
    );
    const out = await loadPlayerStats(input, 2026, 3);
    // A dedupe key of (team, week, opponent) would collapse these to one row
    // and quietly hide a whole offence.
    expect(out.home).toHaveLength(3);
  });

  it("still trusts the stored team column when the source set it", async () => {
    mocks.game.findMany.mockResolvedValue(KC_2026_SCHEDULE);
    mockStatQueries(
      [
        {
          playerId: "pStored",
          team: "KC",
          opponent: "DAL",
          season: 2026,
          week: 1,
          attempts: 30,
          carries: 0,
          receptions: 0,
          targets: 40,
          targetShare: 0.7,
          fantasyPointsPpr: 18.2,
          passingEpa: 0.3,
          rushingEpa: null,
          receivingEpa: null,
          sourceId: "nflverse",
          fetchedAt: new Date("2026-09-11T00:00:00Z"),
        },
      ],
      [],
    );
    const out = await loadPlayerStats(input, 2026, 3);
    expect(out.home).toHaveLength(1);
    expect(out.resolvedViaSchedule).toBe(0);
  });

  it("returns empty without a note-worthy failure when the schedule read throws", async () => {
    mocks.game.findMany.mockRejectedValue(new Error("db down"));
    mockStatQueries([], [nullTeamStatRow({ opponent: "DAL" })]);
    const out = await loadPlayerStats(input, 2026, 3);
    // Fail-closed: no schedule, no attribution. Never a throw, never a guess.
    expect(out.home).toEqual([]);
    expect(out.away).toEqual([]);
    expect(out.unresolved).toBe(true);
  });

  it("issues at most one schedule read for many picks (single-flight memo)", async () => {
    mocks.game.findMany.mockResolvedValue(KC_2026_SCHEDULE);
    // Unbounded: every concurrent pick issues both stat queries.
    mocks.playerGameStat.findMany.mockResolvedValue([]);
    await Promise.all([
      loadPlayerStats(input, 2026, 3),
      loadPlayerStats(input, 2026, 3),
      loadPlayerStats(input, 2026, 3),
    ]);
    // /api/picks loads surfaces once per pick in parallel; without the memo a
    // slate of 30 would read the whole NFL schedule 30 times.
    expect(mocks.game.findMany).toHaveBeenCalledTimes(1);
  });
});
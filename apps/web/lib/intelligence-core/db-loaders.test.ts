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
}));
vi.mock("@sports/db", () => ({ db: mocks }));

import {
  loadBundleSurfaces,
  loadInjuries,
  loadRatings,
  loadGameSignals,
  nflSeasonForDate,
  nflSeasonWeekForDate,
} from "./db-loaders";

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
});

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
});
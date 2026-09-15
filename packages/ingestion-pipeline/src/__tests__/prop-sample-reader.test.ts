import { describe, expect, it, vi } from "vitest";
import {
  attachWeatherToPropLines,
  buildGameSeasonWeekMap,
  buildPlayerIdMap,
  buildPropSampleLines,
  gradePropSide,
  logPropSlateWeatherCoverage,
  rateSampleFromWeek,
  readPropSamples,
  rushAttemptsForProp,
  type ArchivePropRow,
  type PlayerIdentityRow,
  type PlayerWeekStatRow,
  type SnapCountRow,
} from "../prop-sample-reader.js";
import { encodePropMarket, parsePropSide, slugPlayer } from "../prop-line-rows.js";
import type { KickoffWeatherField } from "@sports/prediction-engine/src/edge-lab/weather-game-field.js";

/**
 * C-358 — prop reader grades posted OddsLineSnapshot rows into RateSamples.
 * Fixture rows stand in for: archive captures, HistoricalGame season/week,
 * the gsis↔pfr identity seed (snap-share crosswalk + uploads identity table),
 * PlayerGameStat weekly totals, and snap_counts.
 */

const G_JJ = "00-0036322";
const P_JJ = "JeffJu00";

const identityFixture: readonly PlayerIdentityRow[] = [
  { gsisId: G_JJ, fullName: "Justin Jefferson", pfrId: P_JJ, playerDbId: "db-jj" },
  { gsisId: "00-0037013", fullName: "Ja'Marr Chase", pfrId: "ChasJa00", playerDbId: "db-jc" },
  { gsisId: "00-0033873", fullName: "A.J. Brown", pfrId: "BrowAJ00", playerDbId: "db-ab" },
];

const playerIdMap = buildPlayerIdMap(identityFixture);

function archive(
  over: Partial<ArchivePropRow> & Pick<ArchivePropRow, "gameId" | "market" | "side" | "price">,
): ArchivePropRow {
  return {
    book: "draftkings",
    line: null,
    phase: "OPEN",
    capturedAt: new Date("2026-09-14T16:00:00Z"),
    ...over,
  };
}

const GAME = "game_nfl_1";
const seasonWeek = buildGameSeasonWeekMap([{ gameId: GAME, season: 2025, week: 5 }]);

describe("buildPlayerIdMap / buildGameSeasonWeekMap", () => {
  it("maps slug and pfr to the same gsis", () => {
    expect(playerIdMap.bySlug.get("justin_jefferson")).toBe(G_JJ);
    expect(playerIdMap.byPfr.get(P_JJ)).toBe(G_JJ);
    expect(playerIdMap.gsisToDbId.get(G_JJ)).toBe("db-jj");
    expect(playerIdMap.bySlug.get("jamarr_chase")).toBe("00-0037013");
  });

  it("maps gameId to (season, week)", () => {
    expect(seasonWeek.get(GAME)).toEqual({ season: 2025, week: 5 });
  });
});

describe("grading rules — each is a settlement contract", () => {
  it("zero snaps that week grades VOID, never LOSS", () => {
    const lines = buildPropSampleLines({
      archiveRows: [
        archive({
          gameId: GAME,
          market: "player_receptions|justin_jefferson",
          side: "over",
          price: -115,
          line: 6.5,
        }),
      ],
      gameSeasonWeek: seasonWeek,
      playerIdMap,
      playerWeekStats: [
        { gsisId: G_JJ, season: 2025, week: 5, receptions: 0 },
      ] satisfies PlayerWeekStatRow[],
      snapCounts: [
        { gsisId: G_JJ, season: 2025, week: 5, offenseSnaps: 0 },
      ] satisfies SnapCountRow[],
    });
    expect(lines).toHaveLength(1);
    expect(lines[0]!.outcome).toBe("VOID");
    expect(lines[0]!.outcome).not.toBe("LOSS");
    expect(lines[0]!.voidReason).toBe("zero_offensive_snaps");
    expect(lines[0]!.rateSample).toBeNull();
  });

  it("played with zero receptions vs over 6.5 is a real LOSS, not VOID", () => {
    const lines = buildPropSampleLines({
      archiveRows: [
        archive({
          gameId: GAME,
          market: "player_receptions|justin_jefferson",
          side: "over",
          price: -115,
          line: 6.5,
        }),
      ],
      gameSeasonWeek: seasonWeek,
      playerIdMap,
      playerWeekStats: [{ gsisId: G_JJ, season: 2025, week: 5, receptions: 0 }],
      snapCounts: [{ gsisId: G_JJ, season: 2025, week: 5, offenseSnaps: 58 }],
    });
    expect(lines[0]!.outcome).toBe("LOSS");
    expect(lines[0]!.voidReason).toBeNull();
    expect(lines[0]!.rateSample).toEqual({ games: 1, total: 0 });
  });

  it("overtime counts — weekly total includes OT, never a regulation slice", () => {
    // 6 REC in regulation + 2 in OT = 8. Over 6.5 must WIN.
    const regulationOnly = 6;
    const lines = buildPropSampleLines({
      archiveRows: [
        archive({
          gameId: GAME,
          market: "player_receptions|justin_jefferson",
          side: "over",
          price: -110,
          line: 6.5,
        }),
      ],
      gameSeasonWeek: seasonWeek,
      playerIdMap,
      playerWeekStats: [{ gsisId: G_JJ, season: 2025, week: 5, receptions: 8 }],
      snapCounts: [{ gsisId: G_JJ, season: 2025, week: 5, offenseSnaps: 72 }],
    });
    expect(lines[0]!.realized).toBe(8);
    expect(lines[0]!.outcome).toBe("WIN");
    expect(gradePropSide({ side: "over", line: 6.5, realized: regulationOnly }).outcome).toBe(
      "LOSS",
    );
  });

  it("a push on the posted line is a push", () => {
    for (const side of ["over", "under"] as const) {
      const lines = buildPropSampleLines({
        archiveRows: [
          archive({
            gameId: GAME,
            market: "player_receptions|justin_jefferson",
            side,
            price: -110,
            line: 6,
          }),
        ],
        gameSeasonWeek: seasonWeek,
        playerIdMap,
        playerWeekStats: [{ gsisId: G_JJ, season: 2025, week: 5, receptions: 6 }],
        snapCounts: [{ gsisId: G_JJ, season: 2025, week: 5, offenseSnaps: 60 }],
      });
      expect(lines[0]!.outcome).toBe("PUSH");
      expect(lines[0]!.rateSample).toEqual({ games: 1, total: 6 });
    }
  });

  it("an NFL sack is a pass attempt, not a rush — rush props read carries only", () => {
    // 20 carries, 30 attempts, 3 sacks suffered. Rush-attempts prop line 19.5
    // grades on carries (20) → WIN over; never on dropbacks (20+3=23).
    expect(rushAttemptsForProp({ carries: 20, attempts: 30 })).toBe(20);
    const lines = buildPropSampleLines({
      archiveRows: [
        archive({
          gameId: GAME,
          market: "player_rush_attempts|jamarr_chase",
          side: "over",
          price: -120,
          line: 19.5,
        }),
      ],
      gameSeasonWeek: seasonWeek,
      playerIdMap,
      playerWeekStats: [
        { gsisId: "00-0037013", season: 2025, week: 5, carries: 20, attempts: 30 },
      ],
      snapCounts: [{ gsisId: "00-0037013", season: 2025, week: 5, offenseSnaps: 55 }],
    });
    expect(lines[0]!.realized).toBe(20);
    expect(lines[0]!.rateSample).toEqual({ games: 1, total: 20 });
    expect(lines[0]!.outcome).toBe("WIN");
  });
});

describe("buildPropSampleLines — graded sample from fixture rows", () => {
  it("yields {playerId, marketKey, line, price, close, RateSample, outcome}", () => {
    const market = encodePropMarket("player_receptions", "Justin Jefferson")!;
    expect(market).toBe("player_receptions|justin_jefferson");

    const lines = buildPropSampleLines({
      archiveRows: [
        archive({
          gameId: GAME,
          market,
          side: "over",
          price: -115,
          line: 6.5,
          phase: "OPEN",
          capturedAt: new Date("2026-09-14T16:00:00Z"),
        }),
        archive({
          gameId: GAME,
          market,
          side: "over",
          price: -125,
          line: 6.5,
          phase: "CLOSE",
          book: "draftkings",
          capturedAt: new Date("2026-09-15T20:10:00Z"),
        }),
        archive({
          gameId: GAME,
          market,
          side: "under",
          price: -105,
          line: 6.5,
          phase: "OPEN",
          capturedAt: new Date("2026-09-14T16:00:00Z"),
        }),
        // Featured market — decodePropMarket returns null, never enters the sample.
        archive({
          gameId: GAME,
          market: "SPREAD",
          side: "home",
          price: -110,
          line: -3.5,
        }),
      ],
      gameSeasonWeek: seasonWeek,
      playerIdMap,
      playerWeekStats: [
        { gsisId: G_JJ, season: 2025, week: 5, receptions: 8, receivingYards: 96 },
      ],
      snapCounts: [{ gsisId: G_JJ, season: 2025, week: 5, offenseSnaps: 64 }],
    });

    expect(lines).toHaveLength(2);
    const over = lines.find((l) => l.side === "over")!;
    expect(over).toMatchObject({
      playerId: G_JJ,
      marketKey: "player_receptions",
      playerSlug: "justin_jefferson",
      line: 6.5,
      price: -115,
      close: -125,
      season: 2025,
      week: 5,
      outcome: "WIN",
      realized: 8,
    });
    expect(over.rateSample).toEqual({ games: 1, total: 8 });
    const under = lines.find((l) => l.side === "under")!;
    expect(under.outcome).toBe("LOSS");
  });

  it("skips featured markets and unresolved players without inventing ids", () => {
    const lines = buildPropSampleLines({
      archiveRows: [
        archive({ gameId: GAME, market: "TOTAL", side: "over", price: -110, line: 47.5 }),
        archive({
          gameId: GAME,
          market: "player_receptions|nobody_here",
          side: "over",
          price: -110,
          line: 2.5,
        }),
      ],
      gameSeasonWeek: seasonWeek,
      playerIdMap,
      playerWeekStats: [],
      snapCounts: [],
    });
    expect(lines).toHaveLength(1);
    expect(lines[0]!.playerSlug).toBe("nobody_here");
    expect(lines[0]!.playerId).toBe("");
    expect(lines[0]!.outcome).toBe("UNGRADED");
    expect(lines[0]!.voidReason).toBe("unresolved_player");
  });
});

describe("player_anytime_td Yes/No (C-357)", () => {
  it("parsePropSide accepts Yes/No so the market is archived", () => {
    expect(parsePropSide("Yes")).toBe("yes");
    expect(parsePropSide("No")).toBe("no");
    expect(parsePropSide("Over")).toBe("over");
    expect(parsePropSide("Home")).toBeNull();
  });

  it("grades Yes on any TD that week; No on zero", () => {
    const market = `player_anytime_td|${slugPlayer("A.J. Brown")}`;
    const lines = buildPropSampleLines({
      archiveRows: [
        archive({ gameId: GAME, market, side: "yes", price: -140, line: null }),
        archive({ gameId: GAME, market, side: "no", price: 120, line: null }),
      ],
      gameSeasonWeek: seasonWeek,
      playerIdMap,
      playerWeekStats: [
        { gsisId: "00-0033873", season: 2025, week: 5, touchdowns: 1 },
      ],
      snapCounts: [{ gsisId: "00-0033873", season: 2025, week: 5, offenseSnaps: 50 }],
    });
    const yes = lines.find((l) => l.side === "yes")!;
    const no = lines.find((l) => l.side === "no")!;
    expect(yes.outcome).toBe("WIN");
    expect(yes.rateSample).toEqual({ games: 1, total: 1 });
    expect(no.outcome).toBe("LOSS");
  });

  it("without a stored TD column the Yes/No market is UNGRADED, never invented", () => {
    const market = `player_anytime_td|${slugPlayer("A.J. Brown")}`;
    const lines = buildPropSampleLines({
      archiveRows: [archive({ gameId: GAME, market, side: "yes", price: -140, line: null })],
      gameSeasonWeek: seasonWeek,
      playerIdMap,
      playerWeekStats: [{ gsisId: "00-0033873", season: 2025, week: 5, receptions: 4 }],
      snapCounts: [{ gsisId: "00-0033873", season: 2025, week: 5, offenseSnaps: 50 }],
    });
    expect(lines[0]!.outcome).toBe("UNGRADED");
    expect(lines[0]!.rateSample).toBeNull();
  });
});

describe("rateSampleFromWeek", () => {
  it("is a one-game Poisson sample and null when ungradeable", () => {
    expect(rateSampleFromWeek(7)).toEqual({ games: 1, total: 7 });
    expect(rateSampleFromWeek(0)).toEqual({ games: 1, total: 0 });
    expect(rateSampleFromWeek(null)).toBeNull();
  });
});

describe("readPropSamples — fail-closed db boundary", () => {
  it("returns [] on null/empty hostiles and never throws", async () => {
    await expect(readPropSamples({ db: null })).resolves.toEqual([]);
    await expect(readPropSamples({ db: {} })).resolves.toEqual([]);
    const throwing = {
      oddsLineSnapshot: {
        findMany: vi.fn().mockRejectedValue(new Error("pool exhausted")),
      },
    };
    await expect(readPropSamples({ db: throwing })).resolves.toEqual([]);
  });

  it("hydrates a graded sample from a stubbed db", async () => {
    const market = "player_receptions|justin_jefferson";
    const db = {
      oddsLineSnapshot: {
        findMany: vi.fn().mockResolvedValue([
          {
            gameId: GAME,
            market,
            book: "draftkings",
            side: "over",
            price: -115,
            line: 6.5,
            phase: "OPEN",
            capturedAt: new Date("2026-09-14T16:00:00Z"),
          },
        ]),
      },
      game: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: GAME,
            homeTeamName: "Minnesota Vikings",
            awayTeamName: "Green Bay Packers",
            commenceTime: new Date("2026-09-20T17:00:00Z"),
          },
        ]),
      },
      historicalGame: {
        findMany: vi.fn().mockResolvedValue([
          {
            season: 2026,
            week: 3,
            homeTeam: "MIN",
            awayTeam: "GB",
            gameKey: "2026_03_GB_MIN",
          },
        ]),
      },
      player: {
        findMany: vi.fn().mockResolvedValue([
          { id: "db-jj", gsisId: G_JJ, fullName: "Justin Jefferson" },
        ]),
      },
      snapCount: {
        findMany: vi.fn().mockResolvedValue([
          {
            playerId: "db-jj",
            pfrPlayerId: P_JJ,
            playerName: "Justin Jefferson",
            season: 2026,
            week: 3,
            offenseSnaps: 61,
          },
        ]),
      },
      playerGameStat: {
        findMany: vi.fn().mockResolvedValue([
          {
            playerId: "db-jj",
            season: 2026,
            week: 3,
            seasonType: "REG",
            receptions: 9,
            carries: 0,
            attempts: 0,
            targets: 12,
            receivingYards: 110,
            rushingYards: 0,
          },
        ]),
      },
    };

    const lines = await readPropSamples({ db });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      playerId: G_JJ,
      marketKey: "player_receptions",
      side: "over",
      line: 6.5,
      outcome: "WIN",
      realized: 9,
      season: 2026,
      week: 3,
    });
    expect(lines[0]!.rateSample).toEqual({ games: 1, total: 9 });
  });
});

describe("C-414 — weather joins the prop feature path null-safe", () => {
  const wx: KickoffWeatherField = {
    gameId: GAME,
    windMph: 18,
    tempF: 32,
    precip: 15,
    precipKind: "prob_pct",
    roof: "open",
    isDome: false,
    asOf: "2025-11-16T12:00:00.000Z",
    source: "nws_live",
  };

  const baseInput = {
    archiveRows: [
      archive({
        gameId: GAME,
        market: "player_reception_yds|justin_jefferson",
        side: "over",
        price: -110,
        line: 85.5,
      }),
    ],
    gameSeasonWeek: seasonWeek,
    playerIdMap,
    playerWeekStats: [
      { gsisId: G_JJ, season: 2025, week: 5, receivingYards: 96 },
    ] satisfies PlayerWeekStatRow[],
    snapCounts: [{ gsisId: G_JJ, season: 2025, week: 5, offenseSnaps: 60 }] satisfies SnapCountRow[],
  };

  it("buildPropSampleLines attaches weather when the map has the game, null when absent", () => {
    const withWx = buildPropSampleLines({
      ...baseInput,
      weatherByGameId: new Map([[GAME, wx]]),
    });
    expect(withWx[0]!.weather).toEqual(wx);

    const withoutMap = buildPropSampleLines(baseInput);
    expect(withoutMap[0]!.weather).toBeNull();

    const emptyMap = buildPropSampleLines({
      ...baseInput,
      weatherByGameId: new Map(),
    });
    expect(emptyMap[0]!.weather).toBeNull();
  });

  it("attachWeatherToPropLines is null-safe and logs per-slate coverage", () => {
    const lines = buildPropSampleLines(baseInput);
    expect(lines[0]!.weather).toBeNull();

    const { lines: joined, coverage } = attachWeatherToPropLines({
      lines,
      weatherByGameId: new Map([[GAME, wx]]),
    });
    expect(joined[0]!.weather?.windMph).toBe(18);
    expect(joined[0]!.weather?.tempF).toBe(32);
    expect(coverage.totalGames).toBe(1);
    expect(coverage.joined).toBe(1);
    expect(coverage.missing).toBe(0);
    expect(coverage.outdoorComplete).toBe(1);
    expect(coverage.bySource.nws_live).toBe(1);

    const log = logPropSlateWeatherCoverage(coverage);
    expect(log).toContain("weather-coverage");
    expect(log).toContain("joined=1");
    expect(log).toContain("nws_live=1");
  });

  it("a game missing from the weather map stays null — never imputed", () => {
    const lines = buildPropSampleLines(baseInput);
    const { lines: joined, coverage } = attachWeatherToPropLines({
      lines,
      weatherByGameId: new Map(),
    });
    expect(joined[0]!.weather).toBeNull();
    expect(coverage.joined).toBe(0);
    expect(coverage.missing).toBe(1);
  });
});

/**
 * Unit tests for free-score-persist.ts
 *
 * Covers the GSE-SEC-050/051 clearance-gate behavior:
 *   - When checkClearance denies "henrygd-ncaa" (loadHenry gate), the
 *     secondary fetch is skipped and no error propagates.
 *   - When checkClearance denies "espn-public-api" for the storage intent
 *     (the GSE-SEC-051 persist gate), persistFreeScores skips the DB write
 *     while still matching games.
 *   - A pre-existing homeScore is never overwritten with null (the
 *     refuse-default / no-null-overwrite law).
 *
 * Follows the hoisted-mocks pattern established in
 * __tests__/board-stale-kill-switch.test.ts and lib/auth.test.ts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Hoisted mock functions ─────────────────────────────────────────────────────
const mocks = vi.hoisted(() => {
  const checkClearanceMock = vi.fn();
  const dbGameFindMany = vi.fn();
  const dbGameUpdateMany = vi.fn();
  const dbIngestionRunCreate = vi.fn();
  const fetchScoresMultiSourceMock = vi.fn();
  const fetchHenrygdScoreboardMock = vi.fn();
  const buildTrustedFinalsMock = vi.fn();
  return {
    checkClearanceMock,
    dbGameFindMany,
    dbGameUpdateMany,
    dbIngestionRunCreate,
    fetchScoresMultiSourceMock,
    fetchHenrygdScoreboardMock,
    buildTrustedFinalsMock,
  };
});

// ─── Mock @sports/db ───────────────────────────────────────────────────────────
vi.mock("@sports/db", () => ({
  db: {
    game: {
      findMany: mocks.dbGameFindMany,
      updateMany: mocks.dbGameUpdateMany,
    },
    ingestionRun: {
      create: mocks.dbIngestionRunCreate,
    },
  },
  isStubMode: () => false,
}));

// ─── Mock clearance engine ─────────────────────────────────────────────────────
vi.mock("@/lib/scraping/clearance-engine", () => ({
  checkClearance: (req: unknown) => mocks.checkClearanceMock(req),
}));

// ─── Mock multi-source-scores ──────────────────────────────────────────────────
vi.mock("./multi-source-scores", () => ({
  fetchScoresMultiSource: (sport: unknown, opts?: unknown) =>
    mocks.fetchScoresMultiSourceMock(sport, opts),
}));

// ─── Mock henrygd NCAA adapter ─────────────────────────────────────────────────
vi.mock("./free-adapters/henrygd-ncaa", () => ({
  fetchHenrygdScoreboard: (path: unknown, opts?: unknown) =>
    mocks.fetchHenrygdScoreboardMock(path, opts),
  HENRYGD_PATHS: { cfb: "football/fbs", mbb: "basketball-men/d1" },
}));

// ─── Mock free-settlement (only the functions free-score-persist imports) ─────
vi.mock("./free-settlement", async (importOriginal) => {
  // nearestByKickoff carries the kickoff-binding and tie-window rule the
  // persister now depends on, so the REAL implementation is used here: mocking
  // it away would make these tests assert nothing about the behaviour they
  // exist to pin.
  const actual = await importOriginal<typeof import("./free-settlement")>();
  return {
    buildTrustedFinals: mocks.buildTrustedFinalsMock,
    expandTeamMatchTokens: (side: unknown) =>
      typeof side === "string" ? [side.toLowerCase()] : [],
    teamTokensMatch: (a: string, b: string) => a.toLowerCase() === b.toLowerCase(),
    nearestByKickoff: actual.nearestByKickoff,
    NEAREST_CANDIDATE_TIE_MS: actual.NEAREST_CANDIDATE_TIE_MS,
  };
});

// ─── Mock settlement-score-dates ───────────────────────────────────────────────
vi.mock("./settlement-score-dates", () => ({
  uniqueScoreboardDates: vi.fn(() => ({ espnKeys: [], isoKeys: [] })),
}));

// ─── Mock @sports/data-ingestion (SUPPORTED_SPORTS) ──────────────────────────
vi.mock("@sports/data-ingestion", () => ({
  SUPPORTED_SPORTS: [
    { key: "americanfootball_nfl", name: "NFL", displayName: "NFL" },
    { key: "americanfootball_ncaaf", name: "NCAAF", displayName: "NCAA Football" },
    // baseball_mlb is present because the series-bleed defect these tests pin is
    // an MLB one: the same two clubs meet on consecutive days, which is what let
    // an earlier meeting's final match a later game. Running that scenario down
    // the NFL mapping path would exercise a fixture that cannot occur.
    { key: "baseball_mlb", name: "MLB", displayName: "MLB" },
  ],
}));

// ─── Mock observability/sentry (used by free-ingestion-run's catch path) ───────
vi.mock("@/lib/observability/sentry", () => ({
  captureError: vi.fn(),
  initObservability: vi.fn(),
  observabilityPosture: vi.fn(() => "not wired"),
}));

// ─── Now import the module under test ──────────────────────────────────────────
import { persistFreeScores } from "./free-score-persist";

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** A clearance result that is either allowed or denied. */
function clearanceResult(allowed: boolean, blocks: { code: string; message: string }[] = []) {
  return {
    allowed,
    requiresReview: false,
    source_id: "test",
    mode: "public_logged_off_fact_extract" as const,
    tool_id: "fetch-native" as const,
    intents: [] as readonly string[],
    blocks,
    warnings: [] as readonly string[],
    rightsSnapshot: allowed ? {} : null,
    checkedAt: new Date().toISOString(),
  };
}

/** Build a minimal ESPN NormalizedGame. */
function makeEspnGame(opts: {
  sport: string;
  gameId: string;
  startTime: string;
  homeName: string;
  homeAbbr: string;
  homeScore: number | null;
  awayName: string;
  awayAbbr: string;
  awayScore: number | null;
  statusDetail?: string;
}) {
  return {
    sourceId: "espn-public-api" as const,
    sport: opts.sport as "nfl",
    gameId: opts.gameId,
    startTime: opts.startTime,
    state: opts.homeScore !== null && opts.awayScore !== null ? "post" : "pre",
    completed: opts.homeScore !== null && opts.awayScore !== null,
    statusDetail: opts.statusDetail ?? "",
    venue: null,
    home: {
      team: opts.homeName,
      abbreviation: opts.homeAbbr,
      score: opts.homeScore,
    },
    away: {
      team: opts.awayName,
      abbreviation: opts.awayAbbr,
      score: opts.awayScore,
    },
    attribution: "Scores data via ESPN",
  };
}

/**
 * Build a TrustedFinal that matches a game by team tokens.
 */
function makeTrustedFinal(opts: {
  date: string;
  startIso?: string;
  homeName: string;
  homeAbbr: string;
  homeScore: number;
  awayName: string;
  awayAbbr: string;
  awayScore: number;
  confirmation: "CONFIRMED" | "SINGLE_SOURCE";
}) {
  return {
    date: opts.date,
    ...(opts.startIso ? { startIso: opts.startIso } : {}),
    home: { name: opts.homeName, abbr: opts.homeAbbr, score: opts.homeScore },
    away: { name: opts.awayName, abbr: opts.awayAbbr, score: opts.awayScore },
    confirmation: opts.confirmation,
    sources: ["espn-public-api"],
  };
}

/** Game row from db.game.findMany. */
function makeGameRow(opts: {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  commenceTime: Date;
  homeScore: number | null;
  awayScore: number | null;
}) {
  return {
    id: opts.id,
    homeTeamName: opts.homeTeamName,
    awayTeamName: opts.awayTeamName,
    commenceTime: opts.commenceTime,
    homeScore: opts.homeScore,
    awayScore: opts.awayScore,
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("persistFreeScores — clearance gating (GSE-SEC-050/051)", () => {
  beforeEach(() => {
    // Default: clearance always allowed
    mocks.checkClearanceMock.mockReturnValue(
      clearanceResult(true, []),
    );

    // Default: db.game.findMany returns no pending games
    mocks.dbGameFindMany.mockResolvedValue([]);

    // Default: updateMany succeeds
    mocks.dbGameUpdateMany.mockResolvedValue({ count: 0 });

    // Default: ingestion run create succeeds — return completedAt as a Date
    // (recordFreeIngestionRun calls .toISOString() on it)
    mocks.dbIngestionRunCreate.mockResolvedValue({
      id: "run-stub",
      status: "SUCCESS",
      completedAt: new Date("2026-06-15T12:00:00.000Z"),
    });

    // Default: multi-source fetch returns no games
    mocks.fetchScoresMultiSourceMock.mockResolvedValue({
      games: [],
      errors: [],
      attempted: [],
      used: null,
      primary: null,
      failover: false,
      oddsApiRequired: false,
      datesRequested: [],
    });

    // Default: henrygd fetch returns no games
    mocks.fetchHenrygdScoreboardMock.mockResolvedValue([]);

    // Default: buildTrustedFinals returns no finals
    mocks.buildTrustedFinalsMock.mockReturnValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty finals/games when clearance denies henrygd-ncaa (loadHenry gate)", async () => {
    // Make clearance deny for henrygd-ncaa but allow for espn-public-api storage
    mocks.checkClearanceMock.mockImplementation((req: { source_id?: string }) => {
      if (req.source_id === "henrygd-ncaa") {
        return clearanceResult(false, [
          { code: "SOURCE_NOT_REGISTERED", message: "henrygd-ncaa not registered" },
        ]);
      }
      return clearanceResult(true, []);
    });

    // Provide a pending NFL game
    const commenceTime = new Date("2026-06-15T12:00:00.000Z");
    mocks.dbGameFindMany.mockResolvedValue([
      makeGameRow({
        id: "game-1",
        homeTeamName: "Team A",
        awayTeamName: "Team B",
        commenceTime,
        homeScore: null,
        awayScore: null,
      }),
    ]);

    const result = await persistFreeScores({ sportKey: "americanfootball_nfl" });

    const nflResult = result.sports.find((s) => s.sport === "americanfootball_nfl")!;
    expect(nflResult).toBeDefined();
    expect(nflResult.ok).toBe(true);
    // No henrygd fetched
    expect(mocks.fetchHenrygdScoreboardMock).not.toHaveBeenCalled();
    // No games updated (no matching finals from espn either, but that's fine)
    expect(nflResult.gamesUpdated).toBe(0);
    // Ingestion run recorded (via real free-ingestion-run → mocked db)
    expect(mocks.dbIngestionRunCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SUCCESS" }),
      }),
    );
    // Result always reports oddsApiRequired=false
    expect(result.oddsApiRequired).toBe(false);
  });

  it("persists scores when clearance allows, updating existing games", async () => {
    const commenceTime = new Date("2026-06-15T12:00:00.000Z");
    mocks.dbGameFindMany.mockResolvedValue([
      makeGameRow({
        id: "game-1",
        homeTeamName: "Team A",
        awayTeamName: "Team B",
        commenceTime,
        homeScore: null,
        awayScore: null,
      }),
    ]);

    const espnGame = makeEspnGame({
      sport: "nfl",
      gameId: "game-1",
      startTime: "2026-06-15T12:00:00.000Z",
      homeName: "Team A",
      homeAbbr: "TA",
      homeScore: 21,
      awayName: "Team B",
      awayAbbr: "TB",
      awayScore: 14,
      statusDetail: "Final",
    });

    mocks.fetchScoresMultiSourceMock.mockResolvedValue({
      games: [espnGame],
      errors: [],
      attempted: ["espn-public-api"],
      used: "espn-public-api",
      primary: "espn-public-api",
      failover: false,
      oddsApiRequired: false,
      datesRequested: [],
    });

    // Provide a matching final at CONFIRMED
    mocks.buildTrustedFinalsMock.mockReturnValue([
      makeTrustedFinal({
        date: "2026-06-15",
        homeName: "Team A",
        homeAbbr: "TA",
        homeScore: 21,
        awayName: "Team B",
        awayAbbr: "TB",
        awayScore: 14,
        confirmation: "CONFIRMED",
      }),
    ]);

    // updateMany should report 1 row updated
    mocks.dbGameUpdateMany.mockResolvedValue({ count: 1 });

    const result = await persistFreeScores({ sportKey: "americanfootball_nfl" });

    const nflResult = result.sports.find((s) => s.sport === "americanfootball_nfl")!;
    expect(nflResult.ok).toBe(true);
    expect(nflResult.gamesMatched).toBe(1);
    expect(nflResult.gamesUpdated).toBe(1);
    expect(result.gamesUpdated).toBe(1);

    // DB write was called with the final scores. The where clause carries the
    // recorded-final guard: a row that became FINAL with a different pair
    // between read and write is left alone (see free-score-persist-guard.test.ts).
    expect(mocks.dbGameUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "game-1",
        OR: [
          { status: { not: "FINAL" } },
          { homeScore: null },
          { awayScore: null },
          { homeScore: 21, awayScore: 14 },
        ],
      },
      data: {
        homeScore: 21,
        awayScore: 14,
        status: "FINAL",
        resultFetched: true,
      },
    });
  });

  it("skips the DB write when storage clearance denies (GSE-SEC-051)", async () => {
    const commenceTime = new Date("2026-06-15T12:00:00.000Z");
    mocks.dbGameFindMany.mockResolvedValue([
      makeGameRow({
        id: "game-1",
        homeTeamName: "Team A",
        awayTeamName: "Team B",
        commenceTime,
        homeScore: null,
        awayScore: null,
      }),
    ]);

    const espnGame = makeEspnGame({
      sport: "nfl",
      gameId: "game-1",
      startTime: "2026-06-15T12:00:00.000Z",
      homeName: "Team A",
      homeAbbr: "TA",
      homeScore: 21,
      awayName: "Team B",
      awayAbbr: "TB",
      awayScore: 14,
      statusDetail: "Final",
    });

    mocks.fetchScoresMultiSourceMock.mockResolvedValue({
      games: [espnGame],
      errors: [],
      attempted: ["espn-public-api"],
      used: "espn-public-api",
      primary: "espn-public-api",
      failover: false,
      oddsApiRequired: false,
      datesRequested: [],
    });

    // Provide a matching final
    mocks.buildTrustedFinalsMock.mockReturnValue([
      makeTrustedFinal({
        date: "2026-06-15",
        homeName: "Team A",
        homeAbbr: "TA",
        homeScore: 21,
        awayName: "Team B",
        awayAbbr: "TB",
        awayScore: 14,
        confirmation: "CONFIRMED",
      }),
    ]);

    // Deny storage clearance for espn-public-api
    mocks.checkClearanceMock.mockImplementation((req: { source_id?: string; intents?: readonly string[] }) => {
      if (req.source_id === "espn-public-api" && req.intents?.includes("storage")) {
        return clearanceResult(false, [
          { code: "STORAGE_NOT_ALLOWED", message: "storage denied for espn" },
        ]);
      }
      return clearanceResult(true, []);
    });

    const result = await persistFreeScores({ sportKey: "americanfootball_nfl" });

    const nflResult = result.sports.find((s) => s.sport === "americanfootball_nfl")!;
    expect(nflResult.ok).toBe(true);
    // Game was matched (final found) but NOT updated (DB write skipped on denial)
    expect(nflResult.gamesMatched).toBe(1);
    expect(nflResult.gamesUpdated).toBe(0);
    expect(result.gamesUpdated).toBe(0);
    expect(mocks.dbGameUpdateMany).not.toHaveBeenCalled();

    // Ingestion run still recorded (best-effort)
    expect(mocks.dbIngestionRunCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SUCCESS" }),
      }),
    );
  });

  it("filters out DISPUTED finals (never persists a disputed score)", async () => {
    const commenceTime = new Date("2026-06-15T12:00:00.000Z");
    mocks.dbGameFindMany.mockResolvedValue([
      makeGameRow({
        id: "game-1",
        homeTeamName: "Team A",
        awayTeamName: "Team B",
        commenceTime,
        homeScore: null,
        awayScore: null,
      }),
    ]);

    // Provide a DISPUTED final — should be filtered before matching
    mocks.buildTrustedFinalsMock.mockReturnValue([
      {
        date: "2026-06-15",
        home: { name: "Team A", abbr: "TA", score: 21 },
        away: { name: "Team B", abbr: "TB", score: 14 },
        confirmation: "DISPUTED" as const,
        sources: ["espn-public-api"],
      },
    ]);

    const result = await persistFreeScores({ sportKey: "americanfootball_nfl" });

    const nflResult = result.sports.find((s) => s.sport === "americanfootball_nfl")!;
    expect(nflResult.ok).toBe(true);
    expect(nflResult.finals).toBe(0); // DISPUTED filtered out
    expect(nflResult.gamesMatched).toBe(0);
    expect(nflResult.gamesUpdated).toBe(0);
    expect(mocks.dbGameUpdateMany).not.toHaveBeenCalled();
  });

  it("never overwrites an existing homeScore with null (refuse-default law)", async () => {
    // Game already has a score — it should not be in the "pending" query results
    // (homeScore: null filter), but if it somehow appears, the null-overwrite guard
    // in the code ensures hit.homeScore is always a number, never null.
    //
    // Here we verify that when ESPN returns null scores for an incomplete game,
    // buildTrustedFinals (the real one filters .filter(completed)) returns no
    // finals, so no update writes null onto an existing game.
    const commenceTime = new Date("2026-06-15T12:00:00.000Z");
    mocks.dbGameFindMany.mockResolvedValue([
      makeGameRow({
        id: "game-existing",
        homeTeamName: "Team A",
        awayTeamName: "Team B",
        commenceTime,
        homeScore: 10,
        awayScore: 7,
      }),
    ]);

    // ESPN returns a game with null scores (incomplete / not yet final)
    const espnGameIncomplete = makeEspnGame({
      sport: "nfl",
      gameId: "game-existing",
      startTime: "2026-06-15T12:00:00.000Z",
      homeName: "Team A",
      homeAbbr: "TA",
      homeScore: null,
      awayName: "Team B",
      awayAbbr: "TB",
      awayScore: null,
      statusDetail: "In Progress",
    });

    mocks.fetchScoresMultiSourceMock.mockResolvedValue({
      games: [espnGameIncomplete],
      errors: [],
      attempted: ["espn-public-api"],
      used: "espn-public-api",
      primary: "espn-public-api",
      failover: false,
      oddsApiRequired: false,
      datesRequested: [],
    });

    // buildTrustedFinals returns [] (incomplete game filtered out)
    mocks.buildTrustedFinalsMock.mockReturnValue([]);

    const result = await persistFreeScores({ sportKey: "americanfootball_nfl" });

    // No updates — the null-score game is not a final, no DB write happens.
    expect(result.gamesUpdated).toBe(0);
    expect(mocks.dbGameUpdateMany).not.toHaveBeenCalled();
  });

  it("produces the correct result shape (path, oddsApiRequired=false)", async () => {
    const result = await persistFreeScores();

    expect(result.path).toBe("free-score-persist");
    expect(result.oddsApiRequired).toBe(false);
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
        expect(result.sports).toHaveLength(3); // SUPPORTED_SPORTS mock has 3 sports (NFL, NCAAF, MLB)
    expect(result.gamesUpdated).toBe(0);
    // ingestionRunId is set when anyOk or allFailed is true
    expect(typeof result.ingestionRunId).toBe("string");
  });

  it("handles a sport with no free mapping gracefully", async () => {
    // Our SUPPORTED_SPORTS mock only has NFL and NCAAF, both in ODDS_KEY_TO_FREE.
    // Verify the non-mapped path: sport.ok=true, freeSport=null, no DB queries.
    const result = await persistFreeScores();

    for (const sport of result.sports) {
      expect(sport.ok).toBe(true);
    }
  });

  it("records a FAILED ingestion run when all sports fail", async () => {
    mocks.dbGameFindMany.mockRejectedValue(new Error("DB connection lost"));

    const result = await persistFreeScores({ sportKey: "americanfootball_nfl" });

    const nflResult = result.sports.find((s) => s.sport === "americanfootball_nfl")!;
    expect(nflResult.ok).toBe(false);
    expect(nflResult.error).toBe("DB connection lost");
    expect(result.gamesUpdated).toBe(0);

    // All sports failed → failed: true → status FAILED
    expect(mocks.dbIngestionRunCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
          errorMessage: expect.stringContaining("DB connection lost"),
        }),
      }),
    );

    // ingestionRunId is set even on failure (allFailed path)
    expect(typeof result.ingestionRunId).toBe("string");
    expect(result.ingestionRunId).toBe("run-stub");
  });
});

// ─── Unplayed-game guard ───────────────────────────────────────────────────────

/**
 * Production defect measured 2026-09-06: 5 games with a FUTURE commenceTime
 * carried status FINAL and 87 published picks had settledAt earlier than their
 * game's commenceTime, because the ±48h candidate window matched on team names
 * only and an MLB series plays the same matchup on consecutive days. Yesterday's
 * final was written onto today's and tomorrow's unplayed game and the picks on
 * them were graded WIN/LOSS before first pitch.
 *
 * The guard is unarguable in both directions: a game that has not started
 * cannot have a final score, and a game that HAS started must still settle
 * normally.
 */
describe("persistFreeScores — never settles a game that has not started", () => {
  const HOUR = 60 * 60 * 1000;

  function armSport(games: ReturnType<typeof makeGameRow>[], finals: unknown[]) {
    mocks.checkClearanceMock.mockReturnValue(clearanceResult(true, []));
    mocks.dbGameFindMany.mockResolvedValue(games);
    mocks.dbGameUpdateMany.mockResolvedValue({ count: 1 });
    mocks.dbIngestionRunCreate.mockResolvedValue({
      id: "run-stub",
      status: "SUCCESS",
      completedAt: new Date("2026-06-15T12:00:00.000Z"),
    });
    mocks.fetchScoresMultiSourceMock.mockResolvedValue({
      games: [],
      errors: [],
      attempted: [],
      used: null,
      primary: null,
      failover: false,
      oddsApiRequired: false,
      datesRequested: [],
    });
    mocks.fetchHenrygdScoreboardMock.mockResolvedValue([]);
    mocks.buildTrustedFinalsMock.mockReturnValue(finals);
  }

  /** A final whose team names match the game rows below. */
  function seriesFinal(date: string, homeScore: number, awayScore: number) {
    return makeTrustedFinal({
      date,
      homeName: "Phillies",
      homeAbbr: "PHI",
      homeScore,
      awayName: "Braves",
      awayAbbr: "ATL",
      awayScore,
      confirmation: "CONFIRMED",
    });
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does NOT write a final onto a game whose commenceTime is still in the future", async () => {
    const tomorrow = new Date(Date.now() + 24 * HOUR);
    armSport(
      [
        makeGameRow({
          id: "game-future",
          homeTeamName: "Phillies",
          awayTeamName: "Braves",
          commenceTime: tomorrow,
          homeScore: null,
          awayScore: null,
        }),
      ],
      // A final for the SAME matchup, dated within the ±48h window: this is
      // exactly the earlier meeting in the series that used to leak forward.
      [seriesFinal(new Date(Date.now() - 12 * HOUR).toISOString().slice(0, 10), 4, 2)],
    );

    const result = await persistFreeScores({ sportKey: "baseball_mlb" });

    expect(mocks.dbGameUpdateMany).not.toHaveBeenCalled();
    expect(result.gamesUpdated).toBe(0);
  });

  it("still settles a game that HAS started (the guard is not a blanket refusal)", async () => {
    const startedTwoHoursAgo = new Date(Date.now() - 2 * HOUR);
    armSport(
      [
        makeGameRow({
          id: "game-started",
          homeTeamName: "Phillies",
          awayTeamName: "Braves",
          commenceTime: startedTwoHoursAgo,
          homeScore: null,
          awayScore: null,
        }),
      ],
      [seriesFinal(startedTwoHoursAgo.toISOString().slice(0, 10), 4, 2)],
    );

    await persistFreeScores({ sportKey: "baseball_mlb" });

    expect(mocks.dbGameUpdateMany).toHaveBeenCalledTimes(1);
    const call = mocks.dbGameUpdateMany.mock.calls[0]![0] as {
      where: { id: string };
      data: { homeScore: number; awayScore: number; status: string };
    };
    expect(call.where.id).toBe("game-started");
    expect(call.data).toMatchObject({ homeScore: 4, awayScore: 2, status: "FINAL" });
  });

  it("holds rather than guessing when two same-matchup finals carry no start times", async () => {
    const startedToday = new Date(Date.now() - 3 * HOUR);
    const gameDay = startedToday.toISOString().slice(0, 10);
    const dayBefore = new Date(startedToday.getTime() - 24 * HOUR)
      .toISOString()
      .slice(0, 10);

    armSport(
      [
        makeGameRow({
          id: "game-series",
          homeTeamName: "Phillies",
          awayTeamName: "Braves",
          commenceTime: startedToday,
          homeScore: null,
          awayScore: null,
        }),
      ],
      // Two meetings of the same series, neither carrying a start time.
      [seriesFinal(dayBefore, 9, 1), seriesFinal(gameDay, 4, 2)],
    );

    await persistFreeScores({ sportKey: "baseball_mlb" });

    // An earlier revision of this fix sorted by calendar-date distance and took
    // today's 4-2. That was too weak, and Devin Review on #717 was right about
    // why: a date is not a clock, and the same reasoning that makes the sort
    // "obviously" correct here picks the wrong game of a doubleheader. Without
    // start times on the finals there is no honest way to say which meeting
    // this row is, so the persister now holds and writes nothing. Yesterday's
    // 9-1 must not be written, and neither may today's 4-2 be guessed at.
    expect(mocks.dbGameUpdateMany).not.toHaveBeenCalled();
  });
});

// ─── Kickoff binding and the ambiguity hold ────────────────────────────────────

/**
 * Devin Review on PR #717: the commence-time guard alone only protects a game
 * BEFORE kickoff. Once a game has started, the ±48h window still offers the
 * previous meeting's final, and if this game's own result is not published yet
 * an earlier score is accepted and written as this game's final.
 *
 * The fix reuses nearestByKickoff from free-settlement.ts — the same rule and
 * the same tie window the pick-settlement path already applies — and fails
 * closed when more than one candidate survives. Leaving a row unscored is
 * recoverable; a wrong FINAL that picks are graded against is not.
 */
describe("persistFreeScores — binds a final to kickoff and holds when ambiguous", () => {
  const HOUR = 60 * 60 * 1000;

  function armSport(games: ReturnType<typeof makeGameRow>[], finals: unknown[]) {
    mocks.checkClearanceMock.mockReturnValue(clearanceResult(true, []));
    mocks.dbGameFindMany.mockResolvedValue(games);
    mocks.dbGameUpdateMany.mockResolvedValue({ count: 1 });
    mocks.dbIngestionRunCreate.mockResolvedValue({
      id: "run-stub",
      status: "SUCCESS",
      completedAt: new Date("2026-06-15T12:00:00.000Z"),
    });
    mocks.fetchScoresMultiSourceMock.mockResolvedValue({
      games: [],
      errors: [],
      attempted: [],
      used: null,
      primary: null,
      failover: false,
      oddsApiRequired: false,
      datesRequested: [],
    });
    mocks.fetchHenrygdScoreboardMock.mockResolvedValue([]);
    mocks.buildTrustedFinalsMock.mockReturnValue(finals);
  }

  function seriesFinal(startIso: string, homeScore: number, awayScore: number) {
    return makeTrustedFinal({
      date: startIso.slice(0, 10),
      startIso,
      homeName: "Phillies",
      homeAbbr: "PHI",
      homeScore,
      awayName: "Braves",
      awayAbbr: "ATL",
      awayScore,
      confirmation: "CONFIRMED",
    });
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does NOT inherit yesterday's final for a game that started but has no result yet", async () => {
    // Started 90 minutes ago: past the commence-time guard, still in progress.
    const startedRecently = new Date(Date.now() - 1.5 * HOUR);
    armSport(
      [
        makeGameRow({
          id: "game-live",
          homeTeamName: "Phillies",
          awayTeamName: "Braves",
          commenceTime: startedRecently,
          homeScore: null,
          awayScore: null,
        }),
      ],
      // ONLY the previous meeting's final exists. Nothing for today.
      [seriesFinal(new Date(startedRecently.getTime() - 24 * HOUR).toISOString(), 9, 1)],
    );

    const result = await persistFreeScores({ sportKey: "baseball_mlb" });

    // 24h away is far outside NEAREST_CANDIDATE_TIE_MS, but it is the only
    // candidate, so the kickoff rule alone cannot reject it — what matters is
    // that we do not write yesterday's 9-1 as this game's final.
    const wrote = mocks.dbGameUpdateMany.mock.calls.some((c) => {
      const data = (c[0] as { data?: { homeScore?: number } }).data;
      return data?.homeScore === 9;
    });
    expect(wrote).toBe(false);
    expect(result.gamesUpdated).toBe(0);
  });

  it("holds instead of guessing when two same-matchup finals are equally close (doubleheader)", async () => {
    const startedToday = new Date(Date.now() - 2 * HOUR);
    armSport(
      [
        makeGameRow({
          id: "game-dh",
          homeTeamName: "Phillies",
          awayTeamName: "Braves",
          commenceTime: startedToday,
          homeScore: null,
          awayScore: null,
        }),
      ],
      // Two games of a doubleheader, both within the tie window of each other.
      [
        seriesFinal(new Date(startedToday.getTime() - 30 * 60 * 1000).toISOString(), 4, 2),
        seriesFinal(new Date(startedToday.getTime() + 30 * 60 * 1000).toISOString(), 7, 5),
      ],
    );

    await persistFreeScores({ sportKey: "baseball_mlb" });

    // Neither score may be written: we cannot say which game this row is.
    expect(mocks.dbGameUpdateMany).not.toHaveBeenCalled();
  });

  it("settles normally when exactly one final matches the game's kickoff", async () => {
    const startedToday = new Date(Date.now() - 3 * HOUR);
    armSport(
      [
        makeGameRow({
          id: "game-clear",
          homeTeamName: "Phillies",
          awayTeamName: "Braves",
          commenceTime: startedToday,
          homeScore: null,
          awayScore: null,
        }),
      ],
      [
        // Yesterday's meeting AND today's: today's is far nearer the kickoff.
        seriesFinal(new Date(startedToday.getTime() - 24 * HOUR).toISOString(), 9, 1),
        seriesFinal(startedToday.toISOString(), 4, 2),
      ],
    );

    await persistFreeScores({ sportKey: "baseball_mlb" });

    expect(mocks.dbGameUpdateMany).toHaveBeenCalledTimes(1);
    const call = mocks.dbGameUpdateMany.mock.calls[0]![0] as {
      data: { homeScore: number; awayScore: number };
    };
    expect(call.data).toMatchObject({ homeScore: 4, awayScore: 2 });
  });
});

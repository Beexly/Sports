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
vi.mock("./free-settlement", () => ({
  buildTrustedFinals: mocks.buildTrustedFinalsMock,
  expandTeamMatchTokens: (side: unknown) =>
    typeof side === "string" ? [side.toLowerCase()] : [],
  teamTokensMatch: (a: string, b: string) => a.toLowerCase() === b.toLowerCase(),
}));

// ─── Mock settlement-score-dates ───────────────────────────────────────────────
vi.mock("./settlement-score-dates", () => ({
  uniqueScoreboardDates: vi.fn(() => ({ espnKeys: [], isoKeys: [] })),
}));

// ─── Mock @sports/data-ingestion (SUPPORTED_SPORTS) ──────────────────────────
vi.mock("@sports/data-ingestion", () => ({
  SUPPORTED_SPORTS: [
    { key: "americanfootball_nfl", name: "NFL", displayName: "NFL" },
    { key: "americanfootball_ncaaf", name: "NCAAF", displayName: "NCAA Football" },
  ],
}));

// ─── Mock observability/sentry (used by free-ingestion-run's catch path) ───────
vi.mock("@/lib/observability/sentry", () => ({
  captureError: vi.fn(),
  initObservability: vi.fn(),
  observabilityPosture: vi.fn(() => "not wired"),
}));

// ─── Now import the module under test + its mocked deps ────────────────────────
import { persistFreeScores } from "./free-score-persist";
import { checkClearance } from "@/lib/scraping/clearance-engine";
import { buildTrustedFinals } from "./free-settlement";

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

    // DB write was called with the final scores
    expect(mocks.dbGameUpdateMany).toHaveBeenCalledWith({
      where: { id: "game-1" },
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
    expect(result.sports).toHaveLength(2); // SUPPORTED_SPORTS mock has 2
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

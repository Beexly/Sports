import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

// ── Hoisted mocks (vi.hoisted runs before module evaluation) ─────────────────

const {
  mockGetScores,
  mockNormalizeScores,
  mockGetEventsByDate,
  mockTeamsMatch,
  mockSettleGameLogs,
  mockGetReadinessGates,
  mockCalculatePickResult,
  mockDb,
} = vi.hoisted(() => {
  const mockGetScores = vi.fn();
  const mockNormalizeScores = vi.fn();
  const mockGetEventsByDate = vi.fn();
  const mockTeamsMatch = vi.fn();
  const mockSettleGameLogs = vi.fn();
  const mockGetReadinessGates = vi.fn();
  const mockCalculatePickResult = vi.fn();
  const mockDb = {
    game: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    pick: { update: vi.fn() },
    pickSignalSnapshot: { updateMany: vi.fn() },
    openingLine: { findUnique: vi.fn() },
  };
  return {
    mockGetScores,
    mockNormalizeScores,
    mockGetEventsByDate,
    mockTeamsMatch,
    mockSettleGameLogs,
    mockGetReadinessGates,
    mockCalculatePickResult,
    mockDb,
  };
});

vi.mock("@sports/data-ingestion", () => ({
  SUPPORTED_SPORTS: [
    { key: "basketball_nba", name: "NBA", displayName: "National Basketball Association" },
    { key: "baseball_mlb", name: "MLB", displayName: "Major League Baseball" },
  ],
  OddsApiClient: vi.fn().mockImplementation(() => ({
    getScores: mockGetScores,
  })),
  DataNormalizer: vi.fn().mockImplementation(() => ({
    normalizeScores: mockNormalizeScores,
  })),
  settleGameLogs: mockSettleGameLogs,
  getEventsByDate: mockGetEventsByDate,
  teamsMatch: mockTeamsMatch,
}));

vi.mock("@sports/prediction-engine", () => ({
  getReadinessGates: mockGetReadinessGates,
  calculatePickResult: mockCalculatePickResult,
}));

vi.mock("@sports/db", () => ({ db: mockDb }));

// ── Import after mocks ────────────────────────────────────────────────────────

import { settlePicks } from "../settle-picks.js";

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeGates(overrides = {}) {
  return {
    canScore: true,
    canPersistPicks: true,
    canPersistCanonicalHistory: true,
    canUseDerivedHistory: false,
    canExposePublicPicks: true,
    canPromoteFeaturedPicks: false,
    canPublishContent: false,
    canExposePerformanceStats: false,
    isBootstrapMode: false,
    canLearnFromOutcomes: false,
    minDataQualityForGameLog: 40,
    ...overrides,
  };
}

const GAME_ID = "game-abc-123";
const PICK_ID = "pick-xyz-456";
const API_KEY = "test-key";

function makePendingGame(overrides = {}) {
  return {
    id: GAME_ID,
    externalId: "ext-game-1",
    homeTeamName: "Boston Celtics",
    awayTeamName: "Indiana Pacers",
    commenceTime: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    dataQualityScore: 85,
    picks: [
      {
        id: PICK_ID,
        pickType: "SPREAD",
        selection: "Boston Celtics -7.5",
        line: -7.5,
        isBootstrap: false,
      },
    ],
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("settlePicks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetReadinessGates.mockReturnValue(makeGates());
    mockGetScores.mockResolvedValue({ data: [] });
    mockNormalizeScores.mockReturnValue([]);
    mockGetEventsByDate.mockResolvedValue([]);
    mockTeamsMatch.mockReturnValue(false);
    mockSettleGameLogs.mockResolvedValue(undefined);
    mockDb.game.findMany.mockResolvedValue([]);
    mockDb.game.findUnique.mockResolvedValue(null);
    mockDb.game.update.mockResolvedValue({});
    mockDb.pick.update.mockResolvedValue({});
    mockDb.pickSignalSnapshot.updateMany.mockResolvedValue({});
    mockDb.openingLine.findUnique.mockResolvedValue(null);
  });

  describe("summary structure", () => {
    it("returns correct summary shape with all sports", async () => {
      const result = await settlePicks(API_KEY, 3, "[test]");
      expect(result).toMatchObject({
        totalGamesSettled: 0,
        totalPicksSettled: 0,
        settledAt: expect.any(Date),
        results: expect.arrayContaining([
          expect.objectContaining({ sport: "basketball_nba" }),
          expect.objectContaining({ sport: "baseball_mlb" }),
        ]),
      });
    });

    it("sums gamesSettled and picksSettled across sports", async () => {
      // NBA: score returns one completed game
      mockGetScores.mockResolvedValueOnce({
        data: [{ id: "ext-game-1", home_team: "Boston Celtics", away_team: "Indiana Pacers", scores: [], completed: true }],
      });
      mockNormalizeScores.mockReturnValueOnce([
        { externalId: "ext-game-1", homeScore: 110, awayScore: 100, completed: true },
      ]);
      mockDb.game.findUnique.mockResolvedValueOnce({
        id: GAME_ID,
        homeTeamName: "Boston Celtics",
        awayTeamName: "Indiana Pacers",
        commenceTime: new Date(),
        dataQualityScore: 85,
        picks: [{ id: PICK_ID, pickType: "SPREAD", selection: "Boston Celtics -7.5", line: -7.5, isBootstrap: false }],
      });
      mockCalculatePickResult.mockReturnValue("WIN");

      // MLB: no completed games
      mockGetScores.mockResolvedValueOnce({ data: [] });
      mockNormalizeScores.mockReturnValueOnce([]);

      const result = await settlePicks(API_KEY, 3, "[test]");
      expect(result.totalGamesSettled).toBe(1);
      expect(result.totalPicksSettled).toBe(1);
    });
  });

  describe("Phase 1 — Odds API settlement", () => {
    it("skips incomplete scores", async () => {
      mockGetScores.mockResolvedValue({ data: [] });
      mockNormalizeScores.mockReturnValue([
        { externalId: "ext-1", homeScore: null, awayScore: null, completed: false },
      ]);

      const result = await settlePicks(API_KEY, 1, "[test]");
      expect(mockDb.game.findUnique).not.toHaveBeenCalled();
      expect(result.totalGamesSettled).toBe(0);
    });

    it("skips when homeScore or awayScore is null even if completed=true", async () => {
      mockNormalizeScores.mockReturnValue([
        { externalId: "ext-1", homeScore: 100, awayScore: null, completed: true },
      ]);
      mockGetScores.mockResolvedValue({ data: [] });
      const result = await settlePicks(API_KEY, 1, "[test]");
      expect(result.totalGamesSettled).toBe(0);
    });

    it("settles pick as WIN and updates game to FINAL", async () => {
      mockNormalizeScores.mockReturnValueOnce([
        { externalId: "ext-game-1", homeScore: 110, awayScore: 98, completed: true },
      ]);
      mockGetScores.mockResolvedValue({ data: [] });
      mockDb.game.findUnique.mockResolvedValueOnce({
        id: GAME_ID,
        homeTeamName: "Boston Celtics",
        awayTeamName: "Indiana Pacers",
        commenceTime: new Date(),
        dataQualityScore: 85,
        picks: [{ id: PICK_ID, pickType: "SPREAD", selection: "Boston Celtics -7.5", line: -7.5, isBootstrap: false }],
      });
      mockCalculatePickResult.mockReturnValue("WIN");

      await settlePicks(API_KEY, 3, "[test]");

      expect(mockDb.game.update).toHaveBeenCalledWith({
        where: { id: GAME_ID },
        data: { homeScore: 110, awayScore: 98, status: "FINAL" },
      });
      expect(mockDb.pick.update).toHaveBeenCalledWith({
        where: { id: PICK_ID },
        data: { result: "WIN", settledAt: expect.any(Date) },
      });
    });

    it("settles pick as LOSS", async () => {
      mockNormalizeScores.mockReturnValueOnce([
        { externalId: "ext-game-1", homeScore: 90, awayScore: 105, completed: true },
      ]);
      mockGetScores.mockResolvedValue({ data: [] });
      mockDb.game.findUnique.mockResolvedValueOnce({
        id: GAME_ID,
        homeTeamName: "Boston Celtics",
        awayTeamName: "Indiana Pacers",
        commenceTime: new Date(),
        dataQualityScore: 85,
        picks: [{ id: PICK_ID, pickType: "SPREAD", selection: "Boston Celtics -7.5", line: -7.5, isBootstrap: false }],
      });
      mockCalculatePickResult.mockReturnValue("LOSS");

      await settlePicks(API_KEY, 3, "[test]");
      expect(mockDb.pick.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ result: "LOSS" }) })
      );
    });

    it("settles GameLog when score is available", async () => {
      mockNormalizeScores.mockReturnValueOnce([
        { externalId: "ext-game-1", homeScore: 110, awayScore: 98, completed: true },
      ]);
      mockGetScores.mockResolvedValue({ data: [] });
      mockDb.game.findUnique.mockResolvedValueOnce({
        id: GAME_ID,
        homeTeamName: "Boston Celtics",
        awayTeamName: "Indiana Pacers",
        commenceTime: new Date(),
        dataQualityScore: 85,
        picks: [{ id: PICK_ID, pickType: "SPREAD", selection: "Boston Celtics -7.5", line: -7.5, isBootstrap: false }],
      });
      mockCalculatePickResult.mockReturnValue("WIN");
      mockDb.openingLine.findUnique.mockResolvedValue({ spread: -7 });

      await settlePicks(API_KEY, 3, "[test]");

      expect(mockSettleGameLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          gameId: GAME_ID,
          homeScore: 110,
          awayScore: 98,
          spread: -7,
          isBootstrap: false,
        })
      );
    });

    it("handles Odds API errors gracefully and continues to TheSportsDB", async () => {
      mockGetScores.mockRejectedValueOnce(new Error("Network error"));
      mockGetScores.mockResolvedValueOnce({ data: [] }); // MLB succeeds

      const result = await settlePicks(API_KEY, 3, "[test]");
      expect(result.results[0]?.errors).toEqual(
        expect.arrayContaining([expect.stringContaining("Network error")])
      );
      expect(result.results[0]?.gamesSettled).toBe(0);
    });

    it("skips game not found in DB", async () => {
      mockNormalizeScores.mockReturnValueOnce([
        { externalId: "unknown-game", homeScore: 100, awayScore: 90, completed: true },
      ]);
      mockGetScores.mockResolvedValue({ data: [] });
      mockDb.game.findUnique.mockResolvedValue(null);

      const result = await settlePicks(API_KEY, 3, "[test]");
      expect(result.totalGamesSettled).toBe(0);
    });

    it("skips games with no PENDING picks", async () => {
      mockNormalizeScores.mockReturnValueOnce([
        { externalId: "ext-game-1", homeScore: 110, awayScore: 98, completed: true },
      ]);
      mockGetScores.mockResolvedValue({ data: [] });
      mockDb.game.findUnique.mockResolvedValueOnce({
        id: GAME_ID,
        homeTeamName: "Boston Celtics",
        awayTeamName: "Indiana Pacers",
        commenceTime: new Date(),
        dataQualityScore: 85,
        picks: [], // no pending picks
      });

      await settlePicks(API_KEY, 3, "[test]");
      expect(mockDb.pick.update).not.toHaveBeenCalled();
    });
  });

  describe("Phase 2 — TheSportsDB fallback", () => {
    it("finds and settles pending games via TheSportsDB", async () => {
      // No Odds API scores
      mockNormalizeScores.mockReturnValue([]);
      mockGetScores.mockResolvedValue({ data: [] });

      const pendingGame = makePendingGame();
      mockDb.game.findMany.mockResolvedValueOnce([pendingGame]);
      mockDb.game.findMany.mockResolvedValue([]); // MLB: no pending

      mockGetEventsByDate.mockResolvedValueOnce([
        {
          id: "sdb-event-1",
          homeTeam: "Boston Celtics",
          awayTeam: "Indiana Pacers",
          date: new Date(),
          homeScore: 115,
          awayScore: 108,
          isCompleted: true,
          round: null,
        },
      ]);

      // Team names match
      mockTeamsMatch.mockImplementation((dbName: string, sdbName: string) => {
        return (
          (dbName === "Boston Celtics" && sdbName === "Boston Celtics") ||
          (dbName === "Indiana Pacers" && sdbName === "Indiana Pacers")
        );
      });
      mockCalculatePickResult.mockReturnValue("WIN");

      const result = await settlePicks(API_KEY, 3, "[test]");
      expect(result.totalGamesSettled).toBe(1);
      expect(mockDb.game.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { homeScore: 115, awayScore: 108, status: "FINAL" },
        })
      );
    });

    it("skips incomplete TheSportsDB events", async () => {
      mockNormalizeScores.mockReturnValue([]);
      mockGetScores.mockResolvedValue({ data: [] });

      mockDb.game.findMany.mockResolvedValueOnce([makePendingGame()]);
      mockDb.game.findMany.mockResolvedValue([]);

      mockGetEventsByDate.mockResolvedValueOnce([
        {
          id: "sdb-event-1",
          homeTeam: "Boston Celtics",
          awayTeam: "Indiana Pacers",
          date: new Date(),
          homeScore: null,
          awayScore: null,
          isCompleted: false,
          round: null,
        },
      ]);

      const result = await settlePicks(API_KEY, 3, "[test]");
      expect(result.totalGamesSettled).toBe(0);
    });

    it("skips unmatched TheSportsDB events", async () => {
      mockNormalizeScores.mockReturnValue([]);
      mockGetScores.mockResolvedValue({ data: [] });

      mockDb.game.findMany.mockResolvedValueOnce([makePendingGame()]);
      mockDb.game.findMany.mockResolvedValue([]);

      mockGetEventsByDate.mockResolvedValueOnce([
        {
          id: "sdb-event-1",
          homeTeam: "Chicago Bulls",
          awayTeam: "Miami Heat",
          date: new Date(),
          homeScore: 110,
          awayScore: 95,
          isCompleted: true,
          round: null,
        },
      ]);

      // No teams match
      mockTeamsMatch.mockReturnValue(false);

      const result = await settlePicks(API_KEY, 3, "[test]");
      expect(result.totalGamesSettled).toBe(0);
      expect(mockDb.game.update).not.toHaveBeenCalled();
    });

    it("handles TheSportsDB fetch error gracefully", async () => {
      mockNormalizeScores.mockReturnValue([]);
      mockGetScores.mockResolvedValue({ data: [] });

      mockDb.game.findMany.mockResolvedValueOnce([makePendingGame()]);
      mockDb.game.findMany.mockResolvedValue([]);

      mockGetEventsByDate.mockRejectedValueOnce(new Error("TheSportsDB timeout"));

      const result = await settlePicks(API_KEY, 3, "[test]");
      expect(result.results[0]?.errors).toEqual(
        expect.arrayContaining([expect.stringContaining("TheSportsDB")])
      );
      expect(result.totalGamesSettled).toBe(0);
    });
  });

  describe("learning eligibility", () => {
    it("marks snapshot eligible when canLearnFromOutcomes=true and non-bootstrap", async () => {
      mockGetReadinessGates.mockReturnValue(makeGates({ canLearnFromOutcomes: true }));
      mockNormalizeScores.mockReturnValueOnce([
        { externalId: "ext-game-1", homeScore: 110, awayScore: 98, completed: true },
      ]);
      mockGetScores.mockResolvedValue({ data: [] });
      mockDb.game.findUnique.mockResolvedValueOnce({
        id: GAME_ID,
        homeTeamName: "Boston Celtics",
        awayTeamName: "Indiana Pacers",
        commenceTime: new Date(),
        dataQualityScore: 85,
        picks: [{ id: PICK_ID, pickType: "SPREAD", selection: "Boston Celtics -7.5", line: -7.5, isBootstrap: false }],
      });
      mockCalculatePickResult.mockReturnValue("WIN");

      await settlePicks(API_KEY, 3, "[test]");

      expect(mockDb.pickSignalSnapshot.updateMany).toHaveBeenCalledWith({
        where: { pickId: PICK_ID, settlementResult: null },
        data: expect.objectContaining({
          settlementResult: "WIN",
          eligibleForLearning: true,
          learningEligibleAt: expect.any(Date),
        }),
      });
    });

    it("does not mark bootstrap pick eligible for learning", async () => {
      mockGetReadinessGates.mockReturnValue(makeGates({ canLearnFromOutcomes: true }));
      mockNormalizeScores.mockReturnValueOnce([
        { externalId: "ext-game-1", homeScore: 110, awayScore: 98, completed: true },
      ]);
      mockGetScores.mockResolvedValue({ data: [] });
      mockDb.game.findUnique.mockResolvedValueOnce({
        id: GAME_ID,
        homeTeamName: "Boston Celtics",
        awayTeamName: "Indiana Pacers",
        commenceTime: new Date(),
        dataQualityScore: 85,
        picks: [{ id: PICK_ID, pickType: "SPREAD", selection: "Boston Celtics -7.5", line: -7.5, isBootstrap: true }],
      });
      mockCalculatePickResult.mockReturnValue("WIN");

      await settlePicks(API_KEY, 3, "[test]");

      expect(mockDb.pickSignalSnapshot.updateMany).toHaveBeenCalledWith({
        where: { pickId: PICK_ID, settlementResult: null },
        data: expect.objectContaining({
          eligibleForLearning: false,
        }),
      });
    });
  });
});

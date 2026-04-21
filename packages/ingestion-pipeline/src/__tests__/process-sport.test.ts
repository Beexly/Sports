import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";
import type { ReadinessGates } from "@sports/prediction-engine";
import type { SportConfig } from "../process-sport.js";

// ── Mocks ────────────────────────────────────────────────────────────────────
// All three external I/O boundaries: DB, data-ingestion, prediction-engine.
// None of these make real network or DB calls in tests.

const mockDb = {
  ingestionRun: {
    create: vi.fn(),
    update: vi.fn(),
  },
  sport: { upsert: vi.fn() },
  game: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
  },
  odds: { create: vi.fn() },
  pick: { upsert: vi.fn() },
  pickSignalSnapshot: { upsert: vi.fn() },
};

vi.mock("@sports/db", () => ({ db: mockDb }));

const mockGetOdds = vi.fn();
const mockValidateFreshness = vi.fn();
const mockNormalizeGames = vi.fn();
const mockNormalizeOdds = vi.fn();
const mockEnrichGameContext = vi.fn();
const mockGetAtsForm = vi.fn();
const mockGetHeadToHeadForm = vi.fn();
const mockDetectPlayoffContext = vi.fn();

vi.mock("@sports/data-ingestion", () => ({
  OddsApiClient: vi.fn().mockImplementation(() => ({
    getOdds: mockGetOdds,
  })),
  DataNormalizer: vi.fn().mockImplementation(() => ({
    validateFreshness: mockValidateFreshness,
    normalizeGames: mockNormalizeGames,
    normalizeOdds: mockNormalizeOdds,
  })),
  MARKETS: ["h2h", "spreads", "totals"],
  enrichGameContext: mockEnrichGameContext,
  getAtsForm: mockGetAtsForm,
  getHeadToHeadForm: mockGetHeadToHeadForm,
  detectPlayoffContext: mockDetectPlayoffContext,
}));

const mockScoreGames = vi.fn();
const mockBuildPickSignalSnapshot = vi.fn();

vi.mock("@sports/prediction-engine", () => ({
  scoreGames: mockScoreGames,
  buildPickSignalSnapshot: mockBuildPickSignalSnapshot,
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const NBA: SportConfig = {
  key: "basketball_nba",
  name: "NBA",
  displayName: "National Basketball Association",
};

const API_KEY = "test-api-key-123";

function makeGates(overrides: Partial<ReadinessGates> = {}): ReadinessGates {
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
    confidenceDisplayMode: "precision",
    minDataQualityForGameLog: 40,
    canLearnFromOutcomes: false,
    canApplyCalibrationAdjustments: false,
    minSettledPicksForLearning: 100,
    config: {} as never,
    ...overrides,
  };
}

/** A minimal normalized game as returned by DataNormalizer.normalizeGames() */
function makeNormalizedGame(externalId = "ext-game-1") {
  return {
    externalId,
    homeTeam: "Boston Celtics",
    awayTeam: "Miami Heat",
    commenceTime: new Date("2025-05-20T00:00:00Z"),
  };
}

/** A minimal normalized odds record as returned by DataNormalizer.normalizeOdds() */
function makeNormalizedOdds(gameExternalId = "ext-game-1") {
  return [
    {
      gameExternalId,
      bookmaker: "fanduel",
      market: "SPREADS",
      spread: -4.5,
      homeSpreadPrice: -110,
      awaySpreadPrice: -110,
      fetchedAt: new Date(),
    },
    {
      gameExternalId,
      bookmaker: "draftkings",
      market: "SPREADS",
      spread: -4.5,
      homeSpreadPrice: -112,
      awaySpreadPrice: -108,
      fetchedAt: new Date(),
    },
    {
      gameExternalId,
      bookmaker: "fanduel",
      market: "H2H",
      homePrice: -180,
      awayPrice: 155,
      fetchedAt: new Date(),
    },
    {
      gameExternalId,
      bookmaker: "fanduel",
      market: "TOTALS",
      total: 212.5,
      overPrice: -110,
      underPrice: -110,
      fetchedAt: new Date(),
    },
    {
      gameExternalId,
      bookmaker: "draftkings",
      market: "TOTALS",
      total: 212.5,
      overPrice: -108,
      underPrice: -112,
      fetchedAt: new Date(),
    },
  ];
}

/** A minimal ScoredPick as returned by scoreGames() */
function makeScoredPick(gameId = "game-db-1") {
  return {
    gameId,
    pickType: "SPREAD",
    selection: "Boston Celtics -4.5",
    line: -4.5,
    confidence: 62,
    edgeScore: 45,
    consensusPct: 1.0,
    bookmakerCount: 2,
    dataQualityScore: 72,
    tier: "FREE",
    pickGrade: "SOLID_PLAY",
    riskLevel: "MODERATE",
    reasoning: "Celtics -4.5 backed by 100% of 2 bookmakers.",
    reasoningShort: "100% consensus on Celtics -4.5.",
    factorBreakdown: {
      consensusScore: 30,
      marketDepthScore: 4,
      edgeScore: 6.5,
      lineMovementScore: 0,
      volatilityPenalty: -10,
      dataQualityScore: 72,
      factors: [],
    },
    modelVersion: "v6.0.0",
    dataFreshnessAt: new Date(),
  };
}

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  // Default mock returns for happy-path tests
  mockDb.ingestionRun.create.mockResolvedValue({ id: "run-1" });
  mockDb.ingestionRun.update.mockResolvedValue({});
  mockDb.sport.upsert.mockResolvedValue({ id: "sport-1", key: "basketball_nba" });
  mockDb.game.upsert.mockResolvedValue({ id: "game-db-1" });
  mockDb.game.findUnique.mockResolvedValue({
    id: "game-db-1",
    openingSpread: null,
    openingTotal: null,
    restDaysHome: null,
    restDaysAway: null,
    isBackToBackHome: false,
    isBackToBackAway: false,
    scheduleDensityHome: null,
    scheduleDensityAway: null,
    dataQualityScore: 72,
  });
  mockDb.odds.create.mockResolvedValue({});
  mockDb.pick.upsert.mockResolvedValue({ id: "pick-db-1" });
  mockDb.pickSignalSnapshot.upsert.mockResolvedValue({});

  mockGetOdds.mockResolvedValue({ data: [{}], remainingRequests: 499 });
  mockValidateFreshness.mockReturnValue(true);
  mockNormalizeGames.mockReturnValue([makeNormalizedGame()]);
  mockNormalizeOdds.mockReturnValue(makeNormalizedOdds());
  mockEnrichGameContext.mockResolvedValue(undefined);
  mockGetAtsForm.mockResolvedValue(null);
  mockGetHeadToHeadForm.mockResolvedValue(null);
  mockDetectPlayoffContext.mockResolvedValue(null);

  mockScoreGames.mockReturnValue([makeScoredPick()]);
  mockBuildPickSignalSnapshot.mockReturnValue({ pickId: "pick-db-1" });
});

// ── processSport ─────────────────────────────────────────────────────────────

describe("processSport — happy path", () => {
  it("returns success with correct game/pick counts", async () => {
    const { processSport } = await import("../process-sport.js");
    const result = await processSport(NBA, API_KEY, makeGates());

    expect(result.status).toBe("success");
    expect(result.sport).toBe("basketball_nba");
    expect(result.games).toBe(1);
    expect(result.picks).toBe(1);
    expect(result.error).toBeUndefined();
  });

  it("calls OddsApiClient.getOdds with the correct sport key and markets", async () => {
    const { processSport } = await import("../process-sport.js");
    await processSport(NBA, API_KEY, makeGates());

    expect(mockGetOdds).toHaveBeenCalledOnce();
    expect(mockGetOdds).toHaveBeenCalledWith(
      "basketball_nba",
      expect.arrayContaining(["h2h", "spreads", "totals"])
    );
  });

  it("creates an ingestionRun record and finalizes it as SUCCESS", async () => {
    const { processSport } = await import("../process-sport.js");
    await processSport(NBA, API_KEY, makeGates());

    expect(mockDb.ingestionRun.create).toHaveBeenCalledOnce();
    expect(mockDb.ingestionRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "run-1" },
        data: expect.objectContaining({ status: "SUCCESS" }),
      })
    );
  });

  it("upserts one game record per normalized game", async () => {
    mockNormalizeGames.mockReturnValue([
      makeNormalizedGame("ext-1"),
      makeNormalizedGame("ext-2"),
    ]);
    mockDb.game.upsert
      .mockResolvedValueOnce({ id: "game-db-1" })
      .mockResolvedValueOnce({ id: "game-db-2" });
    mockDb.game.findUnique
      .mockResolvedValueOnce({ id: "game-db-1", openingSpread: null, openingTotal: null, restDaysHome: null, restDaysAway: null, isBackToBackHome: false, isBackToBackAway: false, scheduleDensityHome: null, scheduleDensityAway: null, dataQualityScore: 72 })
      .mockResolvedValueOnce({ id: "game-db-2", openingSpread: null, openingTotal: null, restDaysHome: null, restDaysAway: null, isBackToBackHome: false, isBackToBackAway: false, scheduleDensityHome: null, scheduleDensityAway: null, dataQualityScore: 72 });
    mockNormalizeOdds.mockReturnValue([
      ...makeNormalizedOdds("ext-1"),
      ...makeNormalizedOdds("ext-2"),
    ]);
    mockScoreGames.mockReturnValue([
      makeScoredPick("game-db-1"),
      makeScoredPick("game-db-2"),
    ]);

    const { processSport } = await import("../process-sport.js");
    const result = await processSport(NBA, API_KEY, makeGates());

    expect(result.games).toBe(2);
    expect(result.picks).toBe(2);
    expect(mockDb.game.upsert).toHaveBeenCalledTimes(2);
  });

  it("upserts a pick with the correct data", async () => {
    const { processSport } = await import("../process-sport.js");
    await processSport(NBA, API_KEY, makeGates());

    expect(mockDb.pick.upsert).toHaveBeenCalledOnce();
    const call = (mockDb.pick.upsert as Mock).mock.calls[0]![0];
    expect(call.create.pickType).toBe("SPREAD");
    expect(call.create.confidence).toBe(62);
    expect(call.create.modelVersion).toBe("v6.0.0");
  });

  it("captures a PickSignalSnapshot for each upserted pick", async () => {
    const { processSport } = await import("../process-sport.js");
    await processSport(NBA, API_KEY, makeGates());

    expect(mockBuildPickSignalSnapshot).toHaveBeenCalledOnce();
    expect(mockDb.pickSignalSnapshot.upsert).toHaveBeenCalledOnce();
    // Snapshot update:{} ensures it is immutable — never overwritten
    const call = (mockDb.pickSignalSnapshot.upsert as Mock).mock.calls[0]![0];
    expect(call.update).toEqual({});
  });

  it("calls enrichGameContext once per game", async () => {
    const { processSport } = await import("../process-sport.js");
    await processSport(NBA, API_KEY, makeGates());

    expect(mockEnrichGameContext).toHaveBeenCalledOnce();
    expect(mockEnrichGameContext).toHaveBeenCalledWith(
      expect.objectContaining({
        homeTeam: "Boston Celtics",
        awayTeam: "Miami Heat",
        sport: "basketball_nba",
      })
    );
  });
});

describe("processSport — bootstrap mode", () => {
  it("sets isBootstrap=true on picks when canPersistCanonicalHistory=false", async () => {
    const { processSport } = await import("../process-sport.js");
    await processSport(NBA, API_KEY, makeGates({ canPersistCanonicalHistory: false }));

    const call = (mockDb.pick.upsert as Mock).mock.calls[0]![0];
    expect(call.create.isBootstrap).toBe(true);
  });

  it("sets isBootstrap=false on picks when canPersistCanonicalHistory=true", async () => {
    const { processSport } = await import("../process-sport.js");
    await processSport(NBA, API_KEY, makeGates({ canPersistCanonicalHistory: true }));

    const call = (mockDb.pick.upsert as Mock).mock.calls[0]![0];
    expect(call.create.isBootstrap).toBe(false);
  });

  it("never changes isBootstrap on pick updates (only in create)", async () => {
    const { processSport } = await import("../process-sport.js");
    await processSport(NBA, API_KEY, makeGates({ canPersistCanonicalHistory: false }));

    const call = (mockDb.pick.upsert as Mock).mock.calls[0]![0];
    expect(call.update).not.toHaveProperty("isBootstrap");
  });
});

describe("processSport — derived history gating", () => {
  it("skips ATS/H2H form fetches when canUseDerivedHistory=false", async () => {
    const { processSport } = await import("../process-sport.js");
    await processSport(NBA, API_KEY, makeGates({ canUseDerivedHistory: false }));

    expect(mockGetAtsForm).not.toHaveBeenCalled();
    expect(mockGetHeadToHeadForm).not.toHaveBeenCalled();
  });

  it("fetches ATS + H2H form when canUseDerivedHistory=true", async () => {
    const { processSport } = await import("../process-sport.js");
    await processSport(NBA, API_KEY, makeGates({ canUseDerivedHistory: true }));

    // 4 getAtsForm calls per game: overall home, overall away, home-at-home, away-on-road
    expect(mockGetAtsForm).toHaveBeenCalledTimes(4);
    expect(mockGetHeadToHeadForm).toHaveBeenCalledTimes(1);
  });

  it("passes canonicalOnly=true to getAtsForm", async () => {
    const { processSport } = await import("../process-sport.js");
    await processSport(NBA, API_KEY, makeGates({ canUseDerivedHistory: true }));

    for (const call of (mockGetAtsForm as Mock).mock.calls) {
      expect(call[4]).toBe(true); // 5th arg is canonicalOnly
    }
  });
});

describe("processSport — playoff context", () => {
  it("calls detectPlayoffContext with correct team names and commence time", async () => {
    const { processSport } = await import("../process-sport.js");
    await processSport(NBA, API_KEY, makeGates());

    expect(mockDetectPlayoffContext).toHaveBeenCalledWith(
      "Boston Celtics",
      "Miami Heat",
      expect.any(Date)
    );
  });

  it("continues without playoff context when detectPlayoffContext returns null", async () => {
    mockDetectPlayoffContext.mockResolvedValue(null);

    const { processSport } = await import("../process-sport.js");
    const result = await processSport(NBA, API_KEY, makeGates());

    expect(result.status).toBe("success");
  });

  it("logs and continues when detectPlayoffContext throws", async () => {
    mockDetectPlayoffContext.mockRejectedValue(new Error("DB timeout"));

    const { processSport } = await import("../process-sport.js");
    const result = await processSport(NBA, API_KEY, makeGates());

    // Non-fatal — pipeline must not fail when playoff context is unavailable
    expect(result.status).toBe("success");
  });
});

describe("processSport — featured pick promotion", () => {
  it("does not set isFeatured=true when canPromoteFeaturedPicks=false", async () => {
    mockScoreGames.mockReturnValue([{ ...makeScoredPick(), pickGrade: "ELITE_PLAY", confidence: 90 }]);

    const { processSport } = await import("../process-sport.js");
    await processSport(NBA, API_KEY, makeGates({ canPromoteFeaturedPicks: false }));

    const call = (mockDb.pick.upsert as Mock).mock.calls[0]![0];
    expect(call.create.isFeatured).toBe(false);
  });

  it("sets isFeatured=true for ELITE_PLAY picks when canPromoteFeaturedPicks=true", async () => {
    mockScoreGames.mockReturnValue([{ ...makeScoredPick(), pickGrade: "ELITE_PLAY", confidence: 90 }]);

    const { processSport } = await import("../process-sport.js");
    await processSport(NBA, API_KEY, makeGates({ canPromoteFeaturedPicks: true }));

    const call = (mockDb.pick.upsert as Mock).mock.calls[0]![0];
    expect(call.create.isFeatured).toBe(true);
  });

  it("does not feature SOLID_PLAY picks even when promotion is enabled", async () => {
    mockScoreGames.mockReturnValue([{ ...makeScoredPick(), pickGrade: "SOLID_PLAY", confidence: 62 }]);

    const { processSport } = await import("../process-sport.js");
    await processSport(NBA, API_KEY, makeGates({ canPromoteFeaturedPicks: true }));

    const call = (mockDb.pick.upsert as Mock).mock.calls[0]![0];
    expect(call.create.isFeatured).toBe(false);
  });
});

describe("processSport — error handling", () => {
  it("returns status:failed when OddsApiClient.getOdds throws", async () => {
    mockGetOdds.mockRejectedValue(new Error("Network error"));

    const { processSport } = await import("../process-sport.js");
    const result = await processSport(NBA, API_KEY, makeGates());

    expect(result.status).toBe("failed");
    expect(result.error).toContain("Network error");
    expect(result.games).toBe(0);
    expect(result.picks).toBe(0);
  });

  it("finalizes ingestionRun as FAILED on error", async () => {
    mockGetOdds.mockRejectedValue(new Error("API key invalid"));

    const { processSport } = await import("../process-sport.js");
    await processSport(NBA, API_KEY, makeGates());

    expect(mockDb.ingestionRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED" }),
      })
    );
  });

  it("returns status:failed when freshness validation fails", async () => {
    mockValidateFreshness.mockReturnValue(false);

    const { processSport } = await import("../process-sport.js");
    const result = await processSport(NBA, API_KEY, makeGates());

    expect(result.status).toBe("failed");
  });

  it("continues with remaining games when enrichGameContext throws", async () => {
    mockEnrichGameContext.mockRejectedValue(new Error("Enrichment unavailable"));

    const { processSport } = await import("../process-sport.js");
    const result = await processSport(NBA, API_KEY, makeGates());

    // Non-fatal — pick generation continues without enrichment context
    expect(result.status).toBe("success");
    expect(result.picks).toBe(1);
  });

  it("does not throw when PickSignalSnapshot upsert fails", async () => {
    mockDb.pickSignalSnapshot.upsert.mockRejectedValue(new Error("Snapshot error"));

    const { processSport } = await import("../process-sport.js");
    const result = await processSport(NBA, API_KEY, makeGates());

    // Snapshot failure is explicitly non-fatal
    expect(result.status).toBe("success");
    expect(result.picks).toBe(1);
  });

  it("returns zero picks when scoreGames returns empty array", async () => {
    mockScoreGames.mockReturnValue([]);

    const { processSport } = await import("../process-sport.js");
    const result = await processSport(NBA, API_KEY, makeGates());

    expect(result.status).toBe("success");
    expect(result.picks).toBe(0);
    expect(mockDb.pick.upsert).not.toHaveBeenCalled();
  });

  it("returns zero games when API returns no events", async () => {
    mockNormalizeGames.mockReturnValue([]);
    mockNormalizeOdds.mockReturnValue([]);
    mockScoreGames.mockReturnValue([]);

    const { processSport } = await import("../process-sport.js");
    const result = await processSport(NBA, API_KEY, makeGates());

    expect(result.status).toBe("success");
    expect(result.games).toBe(0);
    expect(result.picks).toBe(0);
  });
});

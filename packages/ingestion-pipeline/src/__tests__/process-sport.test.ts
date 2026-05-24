import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@sports/db", () => ({
  db: {
    ingestionRun: {
      create: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
    },
    sport: {
      upsert: vi.fn(),
    },
    game: {
      upsert: vi.fn(),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    odds: {
      create: vi.fn().mockResolvedValue(undefined),
    },
    pick: {
      upsert: vi.fn(),
    },
    pickSignalSnapshot: {
      upsert: vi.fn().mockResolvedValue(undefined),
    },
    sourceSnapshot: {
      create: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

vi.mock("@sports/data-ingestion", () => ({
  OddsApiClient: vi.fn(),
  DataNormalizer: vi.fn(),
  MARKETS: ["h2h", "spreads", "totals"],
  enrichGameContext: vi.fn().mockResolvedValue(undefined),
  getAtsForm: vi.fn().mockResolvedValue(null),
  getHeadToHeadForm: vi.fn().mockResolvedValue(null),
}));

vi.mock("@sports/prediction-engine", () => ({
  scoreGames: vi.fn().mockReturnValue([]),
  buildPickSignalSnapshot: vi.fn().mockReturnValue({}),
}));

import { db } from "@sports/db";
import { OddsApiClient, DataNormalizer } from "@sports/data-ingestion";
import { scoreGames } from "@sports/prediction-engine";
import { processSport } from "../process-sport.js";
import type { SportConfig, ProcessSportResult } from "../process-sport.js";
import type { ReadinessGates } from "@sports/prediction-engine";

const mockIngestionRunCreate = vi.mocked(db.ingestionRun.create);
const mockIngestionRunUpdate = vi.mocked(db.ingestionRun.update);
const mockSportUpsert = vi.mocked(db.sport.upsert);
const mockGameUpsert = vi.mocked(db.game.upsert);
const mockOddsApiClient = vi.mocked(OddsApiClient);
const mockDataNormalizer = vi.mocked(DataNormalizer);
const mockScoreGames = vi.mocked(scoreGames);

const TEST_SPORT: SportConfig = {
  key: "americanfootball_nfl",
  name: "NFL",
  displayName: "NFL Football",
};

const ALL_GATES_OFF: ReadinessGates = {
  canScore: true,
  canPersistPicks: true,
  canPersistCanonicalHistory: false,
  canUseDerivedHistory: false,
  canExposePublicPicks: false,
  canPromoteFeaturedPicks: false,
  canPublishContent: false,
  canExposePerformanceStats: false,
  isBootstrapMode: true,
  confidenceDisplayMode: "internal",
  minDataQualityForGameLog: 50,
  canLearnFromOutcomes: false,
  canApplyCalibrationAdjustments: false,
  minSettledPicksForLearning: 100,
  config: {} as ReadinessGates["config"],
};

const ALL_GATES_ON: ReadinessGates = {
  ...ALL_GATES_OFF,
  canPersistCanonicalHistory: true,
  canUseDerivedHistory: true,
  canExposePublicPicks: true,
  canPromoteFeaturedPicks: true,
  canPublishContent: true,
  canExposePerformanceStats: true,
  isBootstrapMode: false,
};

function makeGetOdds(events: unknown[] = []) {
  return vi.fn().mockResolvedValue({ data: events, remainingRequests: 500 });
}

function makeNormalizerInstance(games = [], odds = []) {
  return {
    validateFreshness: vi.fn().mockReturnValue(true),
    normalizeGames: vi.fn().mockReturnValue(games),
    normalizeOdds: vi.fn().mockReturnValue(odds),
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  mockIngestionRunCreate.mockResolvedValue({ id: "run-001" } as Awaited<ReturnType<typeof db.ingestionRun.create>>);
  mockSportUpsert.mockResolvedValue({ id: "sport-001", key: TEST_SPORT.key, name: TEST_SPORT.name, displayName: TEST_SPORT.displayName } as Awaited<ReturnType<typeof db.sport.upsert>>);
  mockGameUpsert.mockResolvedValue({ id: "game-001" } as Awaited<ReturnType<typeof db.game.upsert>>);
  mockIngestionRunUpdate.mockResolvedValue(undefined as unknown as Awaited<ReturnType<typeof db.ingestionRun.update>>);

  const clientInstance = { getOdds: makeGetOdds() };
  mockOddsApiClient.mockImplementation(() => clientInstance as unknown as InstanceType<typeof OddsApiClient>);

  const normalizerInstance = makeNormalizerInstance();
  mockDataNormalizer.mockImplementation(() => normalizerInstance as unknown as InstanceType<typeof DataNormalizer>);

  mockScoreGames.mockReturnValue([]);
});

describe("processSport — return shape", () => {
  it("returns an object with sport, status, games, picks fields", async () => {
    const result = await processSport(TEST_SPORT, "api-key", ALL_GATES_OFF);

    expect(result).toHaveProperty("sport");
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("games");
    expect(result).toHaveProperty("picks");
  });

  it("sport field matches the configured sport key", async () => {
    const result = await processSport(TEST_SPORT, "api-key", ALL_GATES_OFF);
    expect(result.sport).toBe(TEST_SPORT.key);
  });

  it("returns status success and zero counts when API returns no events", async () => {
    const result = await processSport(TEST_SPORT, "api-key", ALL_GATES_OFF);

    expect(result.status).toBe("success");
    expect(result.games).toBe(0);
    expect(result.picks).toBe(0);
  });

  it("does not include error field on success", async () => {
    const result = await processSport(TEST_SPORT, "api-key", ALL_GATES_OFF);
    expect(result.error).toBeUndefined();
  });
});

describe("processSport — failure handling", () => {
  it("returns status failed when the API call throws", async () => {
    const clientInstance = { getOdds: vi.fn().mockRejectedValue(new Error("network error")) };
    mockOddsApiClient.mockImplementation(() => clientInstance as unknown as InstanceType<typeof OddsApiClient>);

    const result = await processSport(TEST_SPORT, "api-key", ALL_GATES_OFF);

    expect(result.status).toBe("failed");
    expect(result.sport).toBe(TEST_SPORT.key);
  });

  it("includes error message on failure", async () => {
    const clientInstance = { getOdds: vi.fn().mockRejectedValue(new Error("timeout")) };
    mockOddsApiClient.mockImplementation(() => clientInstance as unknown as InstanceType<typeof OddsApiClient>);

    const result = await processSport(TEST_SPORT, "api-key", ALL_GATES_OFF);

    expect(result.error).toBe("timeout");
  });

  it("returns games:0 and picks:0 on failure", async () => {
    const clientInstance = { getOdds: vi.fn().mockRejectedValue(new Error("fail")) };
    mockOddsApiClient.mockImplementation(() => clientInstance as unknown as InstanceType<typeof OddsApiClient>);

    const result = await processSport(TEST_SPORT, "api-key", ALL_GATES_OFF);

    expect(result.games).toBe(0);
    expect(result.picks).toBe(0);
  });

  it("does not throw — always returns a result object", async () => {
    const clientInstance = { getOdds: vi.fn().mockRejectedValue(new Error("boom")) };
    mockOddsApiClient.mockImplementation(() => clientInstance as unknown as InstanceType<typeof OddsApiClient>);

    await expect(processSport(TEST_SPORT, "api-key", ALL_GATES_OFF)).resolves.toBeDefined();
  });

  it("records FAILED status in ingestionRun on error", async () => {
    const clientInstance = { getOdds: vi.fn().mockRejectedValue(new Error("api down")) };
    mockOddsApiClient.mockImplementation(() => clientInstance as unknown as InstanceType<typeof OddsApiClient>);

    await processSport(TEST_SPORT, "api-key", ALL_GATES_OFF);

    expect(mockIngestionRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED" }),
      })
    );
  });

  it("returns status failed when freshness validation fails", async () => {
    const normalizerInstance = {
      validateFreshness: vi.fn().mockReturnValue(false),
      normalizeGames: vi.fn().mockReturnValue([]),
      normalizeOdds: vi.fn().mockReturnValue([]),
    };
    mockDataNormalizer.mockImplementation(() => normalizerInstance as unknown as InstanceType<typeof DataNormalizer>);

    const result = await processSport(TEST_SPORT, "api-key", ALL_GATES_OFF);

    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/freshness/i);
  });
});

describe("processSport — isBootstrap derivation", () => {
  it("isBootstrap=true when canPersistCanonicalHistory is false", async () => {
    const gates: ReadinessGates = { ...ALL_GATES_OFF, canPersistCanonicalHistory: false };

    await processSport(TEST_SPORT, "api-key", gates);

    expect(mockIngestionRunCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ sport: TEST_SPORT.key }) })
    );
  });

  it("isBootstrap=false when canPersistCanonicalHistory is true", async () => {
    await processSport(TEST_SPORT, "api-key", ALL_GATES_ON);

    expect(mockIngestionRunCreate).toHaveBeenCalledOnce();
  });

  it("creates ingestionRun before any API calls", async () => {
    const callOrder: string[] = [];

    // Use the looser mock type to record call order alongside the return value.
    (mockIngestionRunCreate as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      callOrder.push("ingestionRun.create");
      return { id: "run-002" };
    });

    const clientInstance = {
      getOdds: vi.fn().mockImplementation(async () => {
        callOrder.push("getOdds");
        return { data: [], remainingRequests: 500 };
      }),
    };
    mockOddsApiClient.mockImplementation(() => clientInstance as unknown as InstanceType<typeof OddsApiClient>);

    await processSport(TEST_SPORT, "api-key", ALL_GATES_OFF);

    expect(callOrder[0]).toBe("ingestionRun.create");
    expect(callOrder[1]).toBe("getOdds");
  });
});

describe("processSport — ingestion run lifecycle", () => {
  it("creates an ingestionRun with the correct sport key", async () => {
    await processSport(TEST_SPORT, "api-key", ALL_GATES_OFF);

    expect(mockIngestionRunCreate).toHaveBeenCalledWith({
      data: { sport: TEST_SPORT.key, status: "RUNNING" },
    });
  });

  it("marks ingestionRun as SUCCESS after a clean run", async () => {
    await processSport(TEST_SPORT, "api-key", ALL_GATES_OFF);

    expect(mockIngestionRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SUCCESS" }),
      })
    );
  });
});

describe("processSport — result type contract", () => {
  it("status is either 'success' or 'failed'", async () => {
    const result = await processSport(TEST_SPORT, "api-key", ALL_GATES_OFF);
    expect(["success", "failed"]).toContain(result.status);
  });

  it("games and picks are non-negative integers", async () => {
    const result = await processSport(TEST_SPORT, "api-key", ALL_GATES_OFF);
    expect(result.games).toBeGreaterThanOrEqual(0);
    expect(result.picks).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(result.games)).toBe(true);
    expect(Number.isInteger(result.picks)).toBe(true);
  });

  it("satisfies the ProcessSportResult type shape", async () => {
    const result: ProcessSportResult = await processSport(TEST_SPORT, "api-key", ALL_GATES_OFF);
    expect(typeof result.sport).toBe("string");
    expect(typeof result.status).toBe("string");
    expect(typeof result.games).toBe("number");
    expect(typeof result.picks).toBe("number");
  });
});

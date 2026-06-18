import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReadinessGates } from "@sports/prediction-engine";

/**
 * Behavioral tests for processSport — the single pick-generation path
 * shared by the data-refresh worker and the admin trigger-refresh route.
 *
 * Pins the documented invariants:
 *   - isBootstrap derives from gates and flows to picks/enrichment/snapshots
 *   - stale data is rejected (freshness gate)
 *   - the CLV lock is set once at creation and never refreshed
 *   - PickSignalSnapshot is immutable (update: {})
 *   - featured promotion respects the gate
 *   - derived history is never fetched when the gate is off
 *   - errors mark the IngestionRun FAILED and return status:"failed"
 */

const mocks = vi.hoisted(() => ({
  // data-ingestion
  getOdds: vi.fn<(sport: string, markets: string[]) => Promise<{ data: unknown[]; remainingRequests: number }>>(),
  validateFreshness: vi.fn<(at: Date) => boolean>(),
  normalizeGames: vi.fn<(events: unknown[]) => unknown[]>(),
  normalizeOdds: vi.fn<(events: unknown[], at: Date) => unknown[]>(),
  enrichGameContext: vi.fn<(args: unknown) => Promise<void>>(),
  getAtsForm: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  getHeadToHeadForm: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  // prediction-engine
  scoreGames: vi.fn<(inputs: unknown[], at: Date) => unknown[]>(),
  buildPickSignalSnapshot: vi.fn<(...args: unknown[]) => Record<string, unknown>>(),
  getPlatformConfig: vi.fn<() => { independentEdgeEnabled: boolean }>(),
  computeEloRatings: vi.fn<(...args: unknown[]) => unknown>(),
  eloFairValuesForGame: vi.fn<(...args: unknown[]) => unknown[]>(),
  // db
  ingestionRunCreate: vi.fn<(args: unknown) => Promise<{ id: string }>>(),
  ingestionRunUpdate: vi.fn<(args: unknown) => Promise<unknown>>(),
  sportUpsert: vi.fn<(args: unknown) => Promise<{ id: string }>>(),
  gameUpsert: vi.fn<(args: unknown) => Promise<{ id: string }>>(),
  gameFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  gameFindMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
  oddsCreate: vi.fn<(args: unknown) => Promise<unknown>>(),
  pickUpsert: vi.fn<(args: unknown) => Promise<{ id: string }>>(),
  snapshotUpsert: vi.fn<(args: unknown) => Promise<unknown>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    ingestionRun: { create: mocks.ingestionRunCreate, update: mocks.ingestionRunUpdate },
    sport: { upsert: mocks.sportUpsert },
    game: { upsert: mocks.gameUpsert, findUnique: mocks.gameFindUnique, findMany: mocks.gameFindMany },
    odds: { create: mocks.oddsCreate },
    pick: { upsert: mocks.pickUpsert },
    pickSignalSnapshot: { upsert: mocks.snapshotUpsert },
  },
}));

vi.mock("@sports/data-ingestion", () => ({
  OddsApiClient: vi.fn().mockImplementation(() => ({ getOdds: mocks.getOdds })),
  DataNormalizer: vi.fn().mockImplementation(() => ({
    validateFreshness: mocks.validateFreshness,
    normalizeGames: mocks.normalizeGames,
    normalizeOdds: mocks.normalizeOdds,
  })),
  MARKETS: ["h2h", "spreads", "totals"],
  enrichGameContext: mocks.enrichGameContext,
  getAtsForm: mocks.getAtsForm,
  getHeadToHeadForm: mocks.getHeadToHeadForm,
}));

vi.mock("@sports/prediction-engine", () => ({
  scoreGames: mocks.scoreGames,
  buildPickSignalSnapshot: mocks.buildPickSignalSnapshot,
  // Independent-edge wiring. Defaults to the flag OFF (set in beforeEach) so the
  // Elo block is skipped and pipeline behavior is unchanged; the dedicated tests
  // flip getPlatformConfig on to exercise the gated path.
  getPlatformConfig: mocks.getPlatformConfig,
  computeEloRatings: mocks.computeEloRatings,
  eloFairValuesForGame: mocks.eloFairValuesForGame,
}));

vi.mock("../source-snapshot.js", () => ({
  recordSourceSnapshot: vi.fn().mockResolvedValue(undefined),
}));

import { processSport } from "../process-sport.js";

const SPORT = { key: "americanfootball_nfl", name: "NFL", displayName: "NFL" } as const;

function gates(overrides: Partial<ReadinessGates> = {}): ReadinessGates {
  return {
    canPersistCanonicalHistory: true,
    canUseDerivedHistory: true,
    canPromoteFeaturedPicks: true,
    canLearnFromOutcomes: true,
    isBootstrapMode: false,
    minDataQualityForGameLog: 60,
    ...overrides,
  } as unknown as ReadinessGates;
}

function normalizedGame(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    externalId: "ext-1",
    homeTeam: "Chiefs",
    awayTeam: "Bills",
    commenceTime: new Date("2026-06-12T17:00:00.000Z"),
    ...overrides,
  };
}

function scoredPick(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    gameId: "game-1",
    pickType: "SPREAD",
    selection: "Chiefs -3.5",
    line: -3.5,
    confidence: 72,
    edgeScore: 61,
    consensusPct: 64,
    bookmakerCount: 8,
    tier: "PREMIUM",
    pickGrade: "SOLID_PLAY",
    riskLevel: "MODERATE",
    reasoning: "Line value against the market consensus.",
    reasoningShort: "Line value.",
    factorBreakdown: { dataQualityScore: 82 },
    modelVersion: "v5.0.0",
    dataFreshnessAt: new Date(),
    ...overrides,
  };
}

describe("processSport", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();

    mocks.ingestionRunCreate.mockResolvedValue({ id: "run-1" });
    mocks.ingestionRunUpdate.mockResolvedValue({});
    mocks.getOdds.mockResolvedValue({ data: [{ raw: true }], remainingRequests: 400 });
    mocks.validateFreshness.mockReturnValue(true);
    mocks.normalizeGames.mockReturnValue([normalizedGame()]);
    mocks.normalizeOdds.mockReturnValue([]);
    mocks.sportUpsert.mockResolvedValue({ id: "sport-1" });
    mocks.gameUpsert.mockResolvedValue({ id: "game-1" });
    mocks.gameFindUnique.mockResolvedValue({ id: "game-1" });
    mocks.enrichGameContext.mockResolvedValue(undefined);
    mocks.getAtsForm.mockResolvedValue(null);
    mocks.getHeadToHeadForm.mockResolvedValue(null);
    mocks.scoreGames.mockReturnValue([scoredPick()]);
    mocks.pickUpsert.mockResolvedValue({ id: "pick-1" });
    mocks.buildPickSignalSnapshot.mockReturnValue({ pickId: "pick-1" });
    mocks.snapshotUpsert.mockResolvedValue({});
    // Independent-edge wiring defaults OFF; the Elo helpers resolve harmlessly.
    mocks.getPlatformConfig.mockReturnValue({ independentEdgeEnabled: false });
    mocks.gameFindMany.mockResolvedValue([]);
    mocks.computeEloRatings.mockReturnValue({ ratings: new Map(), gamesRated: 0, initialRating: 1500 });
    mocks.eloFairValuesForGame.mockReturnValue([]);
  });

  it("runs the happy path and marks the IngestionRun SUCCESS with counts", async () => {
    const result = await processSport(SPORT, "key", gates());

    expect(result).toMatchObject({ sport: SPORT.key, status: "success", games: 1, picks: 1 });
    expect(mocks.ingestionRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "run-1" },
        data: expect.objectContaining({ status: "SUCCESS", gamesUpserted: 1 }),
      })
    );
  });

  it("marks the run FAILED and returns status failed when the odds API errors", async () => {
    mocks.getOdds.mockRejectedValue(new Error("quota exhausted"));

    const result = await processSport(SPORT, "key", gates());

    expect(result).toMatchObject({ status: "failed", error: "quota exhausted" });
    expect(mocks.ingestionRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED", errorMessage: "quota exhausted" }),
      })
    );
    expect(mocks.pickUpsert).not.toHaveBeenCalled();
  });

  it("rejects stale data — freshness failure fails the run (no-stale-data rule)", async () => {
    mocks.validateFreshness.mockReturnValue(false);

    const result = await processSport(SPORT, "key", gates());

    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/freshness/i);
    expect(mocks.pickUpsert).not.toHaveBeenCalled();
  });

  it("derives isBootstrap from the canonical-history gate and propagates it", async () => {
    await processSport(SPORT, "key", gates({ canPersistCanonicalHistory: false }));

    expect(mocks.enrichGameContext).toHaveBeenCalledWith(
      expect.objectContaining({ isBootstrap: true })
    );
    expect(mocks.pickUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ isBootstrap: true }) })
    );
  });

  it("never lets a refresh overwrite isBootstrap or the CLV lock (immutable creation fields)", async () => {
    await processSport(SPORT, "key", gates());

    const call = mocks.pickUpsert.mock.calls[0]![0] as {
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    };
    expect(call.create["clvLockLine"]).toBe(-3.5);
    expect(call.update).not.toHaveProperty("isBootstrap");
    expect(call.update).not.toHaveProperty("clvLockLine");
    expect(call.update).not.toHaveProperty("clvLockPrice");
    expect(call.update).not.toHaveProperty("result");
    expect(call.update).not.toHaveProperty("settledAt");
  });

  it("locks the American price (not the line) for moneyline picks", async () => {
    mocks.scoreGames.mockReturnValue([scoredPick({ pickType: "MONEYLINE", line: -135 })]);

    await processSport(SPORT, "key", gates());

    const call = mocks.pickUpsert.mock.calls[0]![0] as { create: Record<string, unknown> };
    expect(call.create["clvLockLine"]).toBeNull();
    expect(call.create["clvLockPrice"]).toBe(-135);
  });

  it("keeps PickSignalSnapshot immutable (upsert with empty update)", async () => {
    await processSport(SPORT, "key", gates());

    expect(mocks.snapshotUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { pickId: "pick-1" }, update: {} })
    );
  });

  it("a snapshot failure never kills the pick or the run", async () => {
    mocks.snapshotUpsert.mockRejectedValue(new Error("snapshot table locked"));

    const result = await processSport(SPORT, "key", gates());

    expect(result.status).toBe("success");
    expect(result.picks).toBe(1);
  });

  it("suppresses featured promotion when the gate is off", async () => {
    mocks.scoreGames.mockReturnValue([scoredPick({ pickGrade: "ELITE_PLAY", confidence: 90 })]);

    await processSport(SPORT, "key", gates({ canPromoteFeaturedPicks: false }));

    const call = mocks.pickUpsert.mock.calls[0]![0] as { create: Record<string, unknown> };
    expect(call.create["isFeatured"]).toBe(false);
  });

  it("promotes elite plays when the gate is on", async () => {
    mocks.scoreGames.mockReturnValue([scoredPick({ pickGrade: "ELITE_PLAY", confidence: 90 })]);

    await processSport(SPORT, "key", gates({ canPromoteFeaturedPicks: true }));

    const call = mocks.pickUpsert.mock.calls[0]![0] as { create: Record<string, unknown> };
    expect(call.create["isFeatured"]).toBe(true);
  });

  it("never fetches ATS/H2H history when the derived-history gate is off", async () => {
    await processSport(SPORT, "key", gates({ canUseDerivedHistory: false }));

    expect(mocks.getAtsForm).not.toHaveBeenCalled();
    expect(mocks.getHeadToHeadForm).not.toHaveBeenCalled();
  });

  it("an enrichment failure never blocks pick generation", async () => {
    mocks.enrichGameContext.mockRejectedValue(new Error("signal write failed"));

    const result = await processSport(SPORT, "key", gates());

    expect(result.status).toBe("success");
    expect(result.picks).toBe(1);
  });

  // ── Independent-edge wiring (INDEPENDENT_EDGE_ENABLED) ──────────────────────

  it("does NOT query settled games or attach fair values when the edge flag is off", async () => {
    // beforeEach default is flag-off.
    await processSport(SPORT, "key", gates());

    expect(mocks.gameFindMany).not.toHaveBeenCalled();
    expect(mocks.eloFairValuesForGame).not.toHaveBeenCalled();
    const scoreInput = mocks.scoreGames.mock.calls[0]![0] as Array<{ context?: { independentFairValues?: unknown } }>;
    expect(scoreInput[0]!.context!.independentFairValues).toBeUndefined();
  });

  it("attaches the Elo independent fair values to scoring input when the flag is on", async () => {
    mocks.getPlatformConfig.mockReturnValue({ independentEdgeEnabled: true });
    mocks.gameFindMany.mockResolvedValue([
      { homeTeamName: "Chiefs", awayTeamName: "Bills", homeScore: 27, awayScore: 24, commenceTime: new Date("2026-01-01T00:00:00Z") },
    ]);
    const fairValue = { source: "elo", homeFairProb: 0.6, awayFairProb: 0.4, capturedAt: new Date() };
    mocks.eloFairValuesForGame.mockReturnValue([fairValue]);

    const result = await processSport(SPORT, "key", gates());

    expect(result.status).toBe("success");
    expect(mocks.gameFindMany).toHaveBeenCalled();
    expect(mocks.computeEloRatings).toHaveBeenCalled();
    expect(mocks.eloFairValuesForGame).toHaveBeenCalledWith(
      expect.anything(),
      "Chiefs",
      "Bills",
    );
    const scoreInput = mocks.scoreGames.mock.calls[0]![0] as Array<{ context?: { independentFairValues?: unknown } }>;
    expect(scoreInput[0]!.context!.independentFairValues).toEqual([fairValue]);
  });

  it("a failure building Elo ratings never blocks pick generation (non-fatal)", async () => {
    mocks.getPlatformConfig.mockReturnValue({ independentEdgeEnabled: true });
    mocks.gameFindMany.mockRejectedValue(new Error("settled-games query failed"));

    const result = await processSport(SPORT, "key", gates());

    expect(result.status).toBe("success");
    expect(result.picks).toBe(1);
    const scoreInput = mocks.scoreGames.mock.calls[0]![0] as Array<{ context?: { independentFairValues?: unknown } }>;
    expect(scoreInput[0]!.context!.independentFairValues).toBeUndefined();
  });
});

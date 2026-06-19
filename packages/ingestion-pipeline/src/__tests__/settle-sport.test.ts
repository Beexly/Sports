import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReadinessGates } from "@sports/prediction-engine";

/**
 * Behavioral tests for settleSport — the single settlement path shared
 * by the data-refresh worker and the Vercel settle-picks cron.
 *
 * Pins the invariants the pipeline doc promises:
 *   - settlement always runs (bootstrap mode never blocks it)
 *   - one bad sport / CLV / game-log failure never aborts settlement
 *   - learning eligibility requires: gate on + canonical pick + decisive result
 *   - errors return status:"failed" instead of throwing
 */

const mocks = vi.hoisted(() => ({
  // data-ingestion
  getScores: vi.fn<(sport: string, daysFrom: number) => Promise<{ data: unknown[] }>>(),
  normalizeScores: vi.fn<(scores: unknown[]) => unknown[]>(),
  settleGameLogs: vi.fn<(args: unknown) => Promise<void>>(),
  fetchScoresWithPool: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  resolveFreeSettlementScores: vi.fn<(...args: unknown[]) => unknown[]>(),
  // prediction-engine
  calculatePickResult: vi.fn<(...args: unknown[]) => string>(),
  deriveClosingSnapshotFromOdds: vi.fn<(...args: unknown[]) => unknown>(),
  gradePickClv: vi.fn<(args: unknown) => unknown>(),
  // db
  gameFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  gameFindMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
  gameUpdate: vi.fn<(args: unknown) => Promise<unknown>>(),
  oddsFindMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
  pickUpdate: vi.fn<(args: unknown) => Promise<unknown>>(),
  pickUpdateMany: vi.fn<(args: unknown) => Promise<{ count: number }>>(),
  openingLineFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  snapshotUpdateMany: vi.fn<(args: unknown) => Promise<{ count: number }>>(),
  snapshotFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  snapshotCreate: vi.fn<(args: unknown) => Promise<unknown>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    game: {
      findUnique: mocks.gameFindUnique,
      findMany: mocks.gameFindMany,
      update: mocks.gameUpdate,
    },
    odds: { findMany: mocks.oddsFindMany },
    pick: { update: mocks.pickUpdate, updateMany: mocks.pickUpdateMany },
    openingLine: { findUnique: mocks.openingLineFindUnique },
    pickSignalSnapshot: {
      updateMany: mocks.snapshotUpdateMany,
      findUnique: mocks.snapshotFindUnique,
      create: mocks.snapshotCreate,
    },
  },
}));

vi.mock("@sports/data-ingestion", () => ({
  OddsApiClient: vi.fn().mockImplementation(() => ({ getScores: mocks.getScores })),
  DataNormalizer: vi.fn().mockImplementation(() => ({ normalizeScores: mocks.normalizeScores })),
  settleGameLogs: mocks.settleGameLogs,
  fetchScoresWithPool: mocks.fetchScoresWithPool,
  resolveFreeSettlementScores: mocks.resolveFreeSettlementScores,
}));

vi.mock("@sports/prediction-engine", () => ({
  calculatePickResult: mocks.calculatePickResult,
  deriveClosingSnapshotFromOdds: mocks.deriveClosingSnapshotFromOdds,
  gradePickClv: mocks.gradePickClv,
}));

import { settleSport } from "../settle-sport.js";

const SPORT = { key: "americanfootball_nfl", name: "NFL", displayName: "NFL" } as const;

function gates(overrides: Partial<ReadinessGates> = {}): ReadinessGates {
  return {
    canPersistCanonicalHistory: true,
    canLearnFromOutcomes: true,
    minDataQualityForGameLog: 60,
    isBootstrapMode: false,
    canUseDerivedHistory: true,
    canPromoteFeaturedPicks: true,
    ...overrides,
  } as unknown as ReadinessGates;
}

function completedScore(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    externalId: "ext-1",
    completed: true,
    homeScore: 27,
    awayScore: 20,
    ...overrides,
  };
}

function pendingPick(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "pick-1",
    gameId: "game-1",
    pickType: "SPREAD",
    selection: "Chiefs -3.5",
    line: -3.5,
    isBootstrap: false,
    bookmakerCount: 8,
    confidence: 71,
    modelVersion: "v5.0.0",
    factorBreakdown: null,
    clvLockLine: -3.5,
    clvLockPrice: -110,
    ...overrides,
  };
}

function dbGame(picks: Record<string, unknown>[], overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "game-1",
    homeTeamName: "Chiefs",
    awayTeamName: "Bills",
    commenceTime: new Date("2026-06-10T17:00:00.000Z"),
    dataQualityScore: 85,
    picks,
    ...overrides,
  };
}

describe("settleSport", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();

    // Healthy defaults: one completed game, one pending pick, no CLV close.
    mocks.getScores.mockResolvedValue({ data: ["raw"] });
    mocks.normalizeScores.mockReturnValue([completedScore()]);
    mocks.gameFindUnique.mockResolvedValue(dbGame([pendingPick()]));
    mocks.gameUpdate.mockResolvedValue({});
    mocks.oddsFindMany.mockResolvedValue([]);
    mocks.deriveClosingSnapshotFromOdds.mockReturnValue(null);
    mocks.calculatePickResult.mockReturnValue("WIN");
    mocks.pickUpdate.mockResolvedValue({});
    mocks.pickUpdateMany.mockResolvedValue({ count: 1 });
    mocks.openingLineFindUnique.mockResolvedValue({ spread: -3.5 });
    mocks.settleGameLogs.mockResolvedValue(undefined);
    mocks.snapshotUpdateMany.mockResolvedValue({ count: 1 });
    mocks.gameFindMany.mockResolvedValue([]);
    mocks.fetchScoresWithPool.mockResolvedValue({
      healthy: false,
      result: { provider: "score-pool", scores: [], healthy: false, error: "x" },
      servedBy: null,
      attempts: [],
    });
    mocks.resolveFreeSettlementScores.mockReturnValue([]);
    delete process.env["FREE_DATA_PROVIDER_ENABLED"];
  });

  afterEach(() => {
    delete process.env["FREE_DATA_PROVIDER_ENABLED"];
  });

  it("settles pending picks on completed games and reports counts", async () => {
    mocks.gameFindUnique.mockResolvedValue(
      dbGame([pendingPick({ id: "pick-1" }), pendingPick({ id: "pick-2" })])
    );

    const result = await settleSport(SPORT, "key", gates());

    expect(result).toMatchObject({
      sport: SPORT.key,
      status: "success",
      gamesSettled: 1,
      picksSettled: 2,
    });
    expect(mocks.gameUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "game-1" },
        data: { homeScore: 27, awayScore: 20, status: "FINAL" },
      })
    );
    expect(mocks.pickUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "pick-1", result: "PENDING" },
        data: expect.objectContaining({ result: "WIN", settledAt: expect.any(Date) }),
      })
    );
  });

  it("is idempotent: a pick already settled by a concurrent run is skipped", async () => {
    // The race loser's updateMany matches 0 rows (no longer PENDING).
    mocks.pickUpdateMany.mockResolvedValue({ count: 0 });
    mocks.deriveClosingSnapshotFromOdds.mockReturnValue({ capturedAt: new Date() });

    const result = await settleSport(SPORT, "key", gates());

    // Settle write was attempted, but nothing downstream ran for that pick:
    // no CLV grade, no snapshot, and it is not counted as newly settled.
    expect(result.picksSettled).toBe(0);
    expect(mocks.gradePickClv).not.toHaveBeenCalled();
    expect(mocks.snapshotUpdateMany).not.toHaveBeenCalled();
  });

  it("skips scores that are not completed", async () => {
    mocks.normalizeScores.mockReturnValue([completedScore({ completed: false })]);

    const result = await settleSport(SPORT, "key", gates());

    expect(result.gamesSettled).toBe(0);
    expect(mocks.gameFindUnique).not.toHaveBeenCalled();
  });

  it("skips completed scores with no matching game record", async () => {
    mocks.gameFindUnique.mockResolvedValue(null);

    const result = await settleSport(SPORT, "key", gates());

    expect(result).toMatchObject({ status: "success", gamesSettled: 0, picksSettled: 0 });
    expect(mocks.gameUpdate).not.toHaveBeenCalled();
  });

  it("returns status failed (never throws) when the scores API errors", async () => {
    mocks.getScores.mockRejectedValue(new Error("rate limited"));

    const result = await settleSport(SPORT, "key", gates());

    expect(result.status).toBe("failed");
    expect(result.error).toBe("rate limited");
  });

  it("settles picks even in bootstrap mode — outcomes are source truth", async () => {
    const result = await settleSport(
      SPORT,
      "key",
      gates({ canPersistCanonicalHistory: false, isBootstrapMode: true } as Partial<ReadinessGates>)
    );

    expect(result.status).toBe("success");
    expect(result.picksSettled).toBe(1);
    // Bootstrap provenance flows into the game log write.
    expect(mocks.settleGameLogs).toHaveBeenCalledWith(
      expect.objectContaining({ isBootstrap: true })
    );
  });

  describe("learning eligibility", () => {
    function snapshotEligibility(): boolean {
      const call = mocks.snapshotUpdateMany.mock.calls[0]![0] as {
        data: { eligibleForLearning: boolean };
      };
      return call.data.eligibleForLearning;
    }

    it("marks the snapshot eligible for a decisive canonical result with learning on", async () => {
      await settleSport(SPORT, "key", gates({ canLearnFromOutcomes: true }));
      expect(snapshotEligibility()).toBe(true);
    });

    it("never eligible when the learning gate is off", async () => {
      await settleSport(SPORT, "key", gates({ canLearnFromOutcomes: false }));
      expect(snapshotEligibility()).toBe(false);
    });

    it("never eligible for bootstrap-era picks", async () => {
      mocks.gameFindUnique.mockResolvedValue(dbGame([pendingPick({ isBootstrap: true })]));
      await settleSport(SPORT, "key", gates({ canLearnFromOutcomes: true }));
      expect(snapshotEligibility()).toBe(false);
    });

    it("never eligible for VOID results", async () => {
      mocks.calculatePickResult.mockReturnValue("VOID");
      await settleSport(SPORT, "key", gates({ canLearnFromOutcomes: true }));
      expect(snapshotEligibility()).toBe(false);
    });
  });

  describe("failure isolation", () => {
    it("a closing-line fetch failure never blocks settlement", async () => {
      mocks.oddsFindMany.mockRejectedValue(new Error("odds table locked"));

      const result = await settleSport(SPORT, "key", gates());

      expect(result.status).toBe("success");
      expect(result.picksSettled).toBe(1);
    });

    it("a CLV grading failure never blocks settlement", async () => {
      mocks.deriveClosingSnapshotFromOdds.mockReturnValue({ capturedAt: new Date() });
      mocks.gradePickClv.mockImplementation(() => {
        throw new Error("clv kind mismatch");
      });

      const result = await settleSport(SPORT, "key", gates());

      expect(result.status).toBe("success");
      expect(result.picksSettled).toBe(1);
    });

    it("a game-log failure never blocks settlement", async () => {
      mocks.settleGameLogs.mockRejectedValue(new Error("ats write failed"));

      const result = await settleSport(SPORT, "key", gates());

      expect(result.status).toBe("success");
      expect(result.gamesSettled).toBe(1);
    });
  });

  describe("CLV grading", () => {
    it("writes the CLV grade against the lock when a close exists", async () => {
      const capturedAt = new Date("2026-06-10T16:55:00.000Z");
      mocks.deriveClosingSnapshotFromOdds.mockReturnValue({ capturedAt });
      mocks.gradePickClv.mockReturnValue({
        closeLine: -4,
        closePrice: -112,
        kind: "LINE",
        value: 0.5,
        verdict: "BEAT_CLOSE",
      });

      await settleSport(SPORT, "key", gates());

      expect(mocks.pickUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "pick-1" },
          data: expect.objectContaining({
            clvCloseLine: -4,
            clvVerdict: "BEAT_CLOSE",
            clvCapturedAt: capturedAt,
            clvGradedAt: expect.any(Date),
          }),
        })
      );
    });

    it("skips CLV writes when no close can be derived", async () => {
      mocks.deriveClosingSnapshotFromOdds.mockReturnValue(null);

      await settleSport(SPORT, "key", gates());

      expect(mocks.gradePickClv).not.toHaveBeenCalled();
      // Settlement goes through updateMany; pick.update is CLV-only, so with no
      // close it is never called.
      expect(mocks.pickUpdateMany).toHaveBeenCalledTimes(1);
      expect(mocks.pickUpdate).not.toHaveBeenCalled();
    });
  });

  describe("free keyless settlement fallback", () => {
    const freeDeps = { fetchFn: (() => {}) as unknown as typeof fetch, checkClearance: () => ({ allowed: true as const, rightsSnapshot: null }) };

    it("is INERT when the flag is off: never queries pending games or the free pool, even with deps injected", async () => {
      // Paid path produces a completed score; flag unset.
      const result = await settleSport(SPORT, "key", gates(), "[settlement]", freeDeps);

      expect(result.status).toBe("success");
      expect(mocks.gameFindMany).not.toHaveBeenCalled();
      expect(mocks.fetchScoresWithPool).not.toHaveBeenCalled();
      expect(mocks.resolveFreeSettlementScores).not.toHaveBeenCalled();
    });

    it("is INERT when the flag is on but deps are absent (fail-closed no-op)", async () => {
      process.env["FREE_DATA_PROVIDER_ENABLED"] = "true";
      // No freeDeps argument → free path is a no-op.
      const result = await settleSport(SPORT, "key", gates());

      expect(result.status).toBe("success");
      expect(mocks.fetchScoresWithPool).not.toHaveBeenCalled();
    });

    it("is INERT when the flag is on and deps present but checkClearance is missing", async () => {
      process.env["FREE_DATA_PROVIDER_ENABLED"] = "true";
      const result = await settleSport(SPORT, "key", gates(), "[settlement]", {
        fetchFn: (() => {}) as unknown as typeof fetch,
      });

      expect(result.status).toBe("success");
      expect(mocks.fetchScoresWithPool).not.toHaveBeenCalled();
    });

    it("preserves status:failed (rethrows) when the paid scores API errors AND the free path is inert", async () => {
      mocks.getScores.mockRejectedValue(new Error("rate limited"));
      // flag off → inert → original behavior preserved
      const result = await settleSport(SPORT, "key", gates(), "[settlement]", freeDeps);

      expect(result.status).toBe("failed");
      expect(result.error).toBe("rate limited");
      expect(mocks.fetchScoresWithPool).not.toHaveBeenCalled();
    });

    it("does NOT run the free pool when the paid path already covered every pending game", async () => {
      process.env["FREE_DATA_PROVIDER_ENABLED"] = "true";
      // Paid completed score covers ext-1; the only pending game is ext-1.
      mocks.gameFindMany.mockResolvedValue([
        { externalId: "ext-1", homeTeamName: "Chiefs", awayTeamName: "Bills", commenceTime: new Date() },
      ]);

      const result = await settleSport(SPORT, "key", gates(), "[settlement]", freeDeps);

      expect(result.status).toBe("success");
      expect(mocks.gameFindMany).toHaveBeenCalledTimes(1);
      // Every pending game already covered → no pool fetch.
      expect(mocks.fetchScoresWithPool).not.toHaveBeenCalled();
    });

    it("fires the free fallback when a pending game is NOT covered by the paid path, and settles the resolved score", async () => {
      process.env["FREE_DATA_PROVIDER_ENABLED"] = "true";
      // Paid path returns NO completed scores.
      mocks.normalizeScores.mockReturnValue([]);
      // A pending game the paid path did not cover.
      mocks.gameFindMany.mockResolvedValue([
        { externalId: "ext-free", homeTeamName: "Chiefs", awayTeamName: "Bills", commenceTime: new Date() },
      ]);
      // Pool returns a (mock) score; the resolver re-keys it onto the real externalId.
      mocks.fetchScoresWithPool.mockResolvedValue({
        healthy: true,
        result: { provider: "espn-public-api", scores: [{ x: 1 }], healthy: true },
        servedBy: "espn-public-api",
        attempts: [],
      });
      mocks.resolveFreeSettlementScores.mockReturnValue([
        { externalId: "ext-free", homeScore: 27, awayScore: 20, completed: true },
      ]);
      // The settle loop then looks up the game by the resolved externalId.
      mocks.gameFindUnique.mockResolvedValue(dbGame([pendingPick()], { externalId: "ext-free" }));

      const result = await settleSport(SPORT, "key", gates(), "[settlement]", freeDeps);

      expect(mocks.fetchScoresWithPool).toHaveBeenCalledTimes(1);
      expect(mocks.resolveFreeSettlementScores).toHaveBeenCalledTimes(1);
      // The resolved free score drove the existing per-game settle loop.
      expect(mocks.gameFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { externalId: "ext-free" } }),
      );
      expect(result.status).toBe("success");
      expect(result.picksSettled).toBe(1);
    });

    it("runs the free fallback after a paid getScores error (paid threw) instead of failing", async () => {
      process.env["FREE_DATA_PROVIDER_ENABLED"] = "true";
      mocks.getScores.mockRejectedValue(new Error("rate limited"));
      mocks.gameFindMany.mockResolvedValue([
        { externalId: "ext-free", homeTeamName: "Chiefs", awayTeamName: "Bills", commenceTime: new Date() },
      ]);
      mocks.fetchScoresWithPool.mockResolvedValue({
        healthy: true,
        result: { provider: "nflverse", scores: [{ x: 1 }], healthy: true },
        servedBy: "nflverse",
        attempts: [],
      });
      mocks.resolveFreeSettlementScores.mockReturnValue([
        { externalId: "ext-free", homeScore: 27, awayScore: 20, completed: true },
      ]);
      mocks.gameFindUnique.mockResolvedValue(dbGame([pendingPick()], { externalId: "ext-free" }));

      const result = await settleSport(SPORT, "key", gates(), "[settlement]", freeDeps);

      // Paid error did NOT abort — the free path settled the game.
      expect(result.status).toBe("success");
      expect(result.picksSettled).toBe(1);
      expect(mocks.fetchScoresWithPool).toHaveBeenCalledTimes(1);
    });

    it("a free-fallback failure never throws — settlement still succeeds", async () => {
      process.env["FREE_DATA_PROVIDER_ENABLED"] = "true";
      mocks.gameFindMany.mockResolvedValue([
        { externalId: "ext-x", homeTeamName: "A", awayTeamName: "B", commenceTime: new Date() },
      ]);
      mocks.fetchScoresWithPool.mockRejectedValue(new Error("pool exploded"));

      const result = await settleSport(SPORT, "key", gates(), "[settlement]", freeDeps);

      // Paid path still settled its game; the free failure was swallowed.
      expect(result.status).toBe("success");
      expect(result.picksSettled).toBe(1);
    });
  });
});

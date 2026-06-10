import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OddsApiEvent } from "@sports/types";

/**
 * settleOnce — unit tests for the extracted settlement core (D-011).
 *
 * Mirrors the worker test pattern used by gate-decisions.test.ts: @sports/db
 * is mocked with the same shapes the real stub proxy returns, and the
 * provider boundary (@sports/data-ingestion) is mocked at the class/function
 * seam while keeping the pure helpers (pickClosingValues, marketForPickType,
 * providerStatusFromError, OddsApiError, PROVIDER_JOB_STATUS) real.
 *
 * Pinned contracts:
 *   - R-01: away SPREAD picks are graded through the chosen-side → home
 *     perspective conversion (the inverted-grade live repro).
 *   - R-04: CLV uses the bet-time locked snapshot line/price, never the
 *     drifted pick.line.
 *   - R-05: stale games' PENDING picks settle VOID, never learning-eligible.
 *   - Job truth: a failed scores pull is classified and counted — and
 *     settleOnce NEVER throws (fail-closed, stub-safe).
 */

const dbMocks = vi.hoisted(() => ({
  gameFindUnique: vi.fn<(args?: unknown) => Promise<unknown>>(),
  gameFindMany: vi.fn<(args?: unknown) => Promise<unknown[]>>(),
  gameUpdate: vi.fn<(args?: unknown) => Promise<unknown>>(),
  pickUpdate: vi.fn<(args?: unknown) => Promise<unknown>>(),
  snapshotUpdateMany: vi.fn<(args?: unknown) => Promise<{ count: number }>>(),
  openingLineFindUnique: vi.fn<(args?: unknown) => Promise<unknown>>(),
  closingLineFindUnique: vi.fn<(args?: unknown) => Promise<unknown>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    game: {
      findUnique: dbMocks.gameFindUnique,
      findMany: dbMocks.gameFindMany,
      update: dbMocks.gameUpdate,
    },
    pick: { update: dbMocks.pickUpdate },
    pickSignalSnapshot: { updateMany: dbMocks.snapshotUpdateMany },
    openingLine: { findUnique: dbMocks.openingLineFindUnique },
    closingLine: { findUnique: dbMocks.closingLineFindUnique },
  },
  // closing-line.ts (re-exported by the mocked-with-actual data-ingestion
  // module) imports this at module scope.
  isStubMode: () => true,
}));

const providerMocks = vi.hoisted(() => ({
  getScores: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  getOdds: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  settleGameLogs: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  captureClosingLine: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
}));

vi.mock("@sports/data-ingestion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sports/data-ingestion")>();
  class MockOddsApiClient {
    constructor(_apiKey: string) {}
    getScores = providerMocks.getScores;
    getOdds = providerMocks.getOdds;
  }
  return {
    ...actual,
    OddsApiClient: MockOddsApiClient as unknown as typeof actual.OddsApiClient,
    settleGameLogs: providerMocks.settleGameLogs,
    captureClosingLine: providerMocks.captureClosingLine,
    // Single-sport roster keeps per-sport assertions deterministic; settleOnce
    // only reads `.key`.
    SUPPORTED_SPORTS: [
      { key: "basketball_nba", name: "NBA", displayName: "National Basketball Association" },
    ] as unknown as typeof actual.SUPPORTED_SPORTS,
  };
});

import { OddsApiError, PROVIDER_JOB_STATUS } from "@sports/data-ingestion";
import { settleOnce } from "../settle.js";

const HOME = "Boston Celtics";
const AWAY = "Miami Heat";

function makeScore(overrides: Record<string, unknown> = {}) {
  return {
    id: "ext-1",
    sport_key: "basketball_nba",
    commence_time: "2026-06-09T23:00:00Z",
    completed: true,
    home_team: HOME,
    away_team: AWAY,
    scores: [
      { name: HOME, score: "100" },
      { name: AWAY, score: "99" },
    ],
    last_update: "2026-06-10T02:00:00Z",
    ...overrides,
  };
}

function makePick(overrides: Record<string, unknown> = {}) {
  return {
    id: "pick-1",
    pickType: "SPREAD",
    // Chosen-side AWAY pick: Pick.line is +3.5 from Miami's perspective.
    // Home perspective is -3.5 (R-01 conversion under test).
    selection: `${AWAY} +3.5`,
    line: 3.5,
    result: "PENDING",
    isBootstrap: true,
    signalSnapshot: null,
    ...overrides,
  };
}

function makeGame(overrides: Record<string, unknown> = {}) {
  return {
    id: "game-1",
    externalId: "ext-1",
    homeTeamName: HOME,
    awayTeamName: AWAY,
    commenceTime: new Date("2026-06-09T23:00:00.000Z"),
    status: "SCHEDULED",
    homeScore: null,
    awayScore: null,
    dataQualityScore: 80,
    picks: [makePick()],
    ...overrides,
  };
}

const regenMock = vi.fn<() => Promise<void>>();

function runSettleOnce() {
  return settleOnce({
    apiKey: "test-key",
    logPrefix: "[test]",
    regenerateCalibrationReport: regenMock,
  });
}

describe("settleOnce", () => {
  beforeEach(() => {
    for (const mock of Object.values(dbMocks)) mock.mockReset();
    for (const mock of Object.values(providerMocks)) mock.mockReset();
    regenMock.mockReset();
    regenMock.mockResolvedValue(undefined);

    // Defaults mirror the real @sports/db stub proxy (no-DB mode).
    dbMocks.gameFindUnique.mockResolvedValue(null);
    dbMocks.gameFindMany.mockResolvedValue([]);
    dbMocks.gameUpdate.mockResolvedValue({ id: "stub" });
    dbMocks.pickUpdate.mockResolvedValue({ id: "stub" });
    dbMocks.snapshotUpdateMany.mockResolvedValue({ count: 1 });
    dbMocks.openingLineFindUnique.mockResolvedValue(null);
    dbMocks.closingLineFindUnique.mockResolvedValue(null);

    providerMocks.getScores.mockResolvedValue({ data: [], remainingRequests: 99, usedRequests: 1 });
    providerMocks.getOdds.mockResolvedValue({ data: [], remainingRequests: 99, usedRequests: 1 });
    providerMocks.settleGameLogs.mockResolvedValue(undefined);
    providerMocks.captureClosingLine.mockResolvedValue({ written: 1, stale: 0, skipped: 0 });

    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("grades an away SPREAD pick through the R-01 home-perspective conversion (WIN, not the inverted LOSS)", async () => {
    providerMocks.getScores.mockResolvedValue({ data: [makeScore()], remainingRequests: 99, usedRequests: 1 });
    dbMocks.gameFindUnique.mockResolvedValue(makeGame());

    const result = await runSettleOnce();

    // Final score recorded on the game.
    expect(dbMocks.gameUpdate).toHaveBeenCalledWith({
      where: { id: "game-1" },
      data: { homeScore: 100, awayScore: 99, status: "FINAL" },
    });

    // Home won by 1; home-perspective line is -3.5 (Miami +3.5 chosen-side),
    // so the away side covered → WIN. Feeding the chosen-side +3.5 directly
    // would have produced the inverted LOSS — the exact R-01 live repro.
    const gradeCall = dbMocks.pickUpdate.mock.calls.find(
      (call) => ((call[0] as { data: Record<string, unknown> }).data)["result"] !== undefined
    );
    expect(gradeCall).toBeDefined();
    expect((gradeCall?.[0] as { where: unknown; data: Record<string, unknown> })).toMatchObject({
      where: { id: "pick-1" },
      data: { result: "WIN" },
    });

    // Snapshot mirror: outcome recorded once, never learning-eligible in
    // bootstrap mode (default gates: no env flags set in this suite).
    expect(dbMocks.snapshotUpdateMany).toHaveBeenCalledWith({
      where: { pickId: "pick-1", settlementResult: null },
      data: expect.objectContaining({
        settlementResult: "WIN",
        eligibleForLearning: false,
      }),
    });

    expect(providerMocks.settleGameLogs).toHaveBeenCalledTimes(1);
    expect(result.settled).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.errors).toEqual([]);
    expect(result.sports).toEqual([
      expect.objectContaining({ sport: "basketball_nba", ok: true, gamesSettled: 1, picksSettled: 1 }),
    ]);
    expect(regenMock).toHaveBeenCalledTimes(1);
    expect(result.calibrationRegenerated).toBe(true);
  });

  it("writes CLV from the R-04 bet-time locked price, not the drifted pick.line", async () => {
    providerMocks.getScores.mockResolvedValue({ data: [makeScore()], remainingRequests: 99, usedRequests: 1 });
    providerMocks.getOdds.mockResolvedValue({
      data: [{ id: "ext-1" } as unknown as OddsApiEvent],
      remainingRequests: 99,
      usedRequests: 1,
    });
    dbMocks.gameFindUnique.mockResolvedValue(
      makeGame({
        picks: [
          makePick({
            pickType: "MONEYLINE",
            selection: HOME,
            // Drifted last-refresh price — must NOT feed CLV.
            line: -110,
            signalSnapshot: {
              lineAtPrediction: -115, // immutable bet-time lock (R-04)
              selectionAtPrediction: HOME,
            },
          }),
        ],
      })
    );
    dbMocks.closingLineFindUnique.mockResolvedValue({
      market: "H2H",
      spread: null,
      total: null,
      homePrice: -130,
      awayPrice: 110,
      isStale: false,
    });

    const result = await runSettleOnce();

    expect(providerMocks.captureClosingLine).toHaveBeenCalledWith(
      expect.objectContaining({ gameId: "game-1" })
    );
    expect(dbMocks.closingLineFindUnique).toHaveBeenCalledWith({
      where: {
        gameId_market_closingRef: {
          gameId: "game-1",
          market: "H2H",
          closingRef: "consensus",
        },
      },
    });

    const clvCall = dbMocks.pickUpdate.mock.calls.find(
      (call) => ((call[0] as { data: Record<string, unknown> }).data)["clvComputedAt"] !== undefined
    );
    expect(clvCall).toBeDefined();
    const clvData = (clvCall?.[0] as { data: Record<string, unknown> }).data;
    expect(clvData["closingPrice"]).toBe(-130);
    // profitPer100(-115) − profitPer100(-130) = 86.96 − 76.92 = 10.03.
    // Had the drifted pick.line (-110) leaked in, this would be 13.99 —
    // the exact value pins the locked snapshot price as the input.
    expect(clvData["clvCents"]).toBeCloseTo(10.03, 2);
    expect(clvData["clvPositive"]).toBe(true);
    expect(result.settled).toBe(1);
    expect(result.failed).toBe(0);
  });

  it("R-05: voids stale PENDING picks (never learning-eligible) and counts them", async () => {
    const staleCommence = new Date(Date.now() - 24 * 60 * 60 * 1000);
    dbMocks.gameFindMany.mockResolvedValue([
      makeGame({
        id: "game-stale",
        commenceTime: staleCommence,
        picks: [{ id: "p-void", result: "PENDING" }],
      }),
    ]);

    const result = await runSettleOnce();

    expect(dbMocks.pickUpdate).toHaveBeenCalledWith({
      where: { id: "p-void" },
      data: expect.objectContaining({ result: "VOID" }),
    });
    expect(dbMocks.snapshotUpdateMany).toHaveBeenCalledWith({
      where: { pickId: "p-void", settlementResult: null },
      data: expect.objectContaining({
        settlementResult: "VOID",
        eligibleForLearning: false,
      }),
    });
    expect(result.voided).toBe(1);
    expect(result.settled).toBe(0);
    expect(result.failed).toBe(0);
  });

  it("classifies a failed scores pull (job truth) and NEVER throws", async () => {
    providerMocks.getScores.mockRejectedValue(
      new OddsApiError("The Odds API error: 401 — denied", 401)
    );

    const result = await runSettleOnce();

    expect(result.failed).toBe(1);
    expect(result.totalSports).toBe(1);
    expect(result.providerStatus).toBe(PROVIDER_JOB_STATUS.PROVIDER_AUTH_FAILED);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("basketball_nba");
    expect(result.sports).toEqual([
      expect.objectContaining({
        sport: "basketball_nba",
        ok: false,
        providerStatus: PROVIDER_JOB_STATUS.PROVIDER_AUTH_FAILED,
      }),
    ]);
    // No grading happened, but the pass still completed (sweep + regen ran).
    expect(dbMocks.pickUpdate).not.toHaveBeenCalled();
    expect(regenMock).toHaveBeenCalledTimes(1);
  });

  it("is an honest no-op in stub / no-DB mode (zero counts, zero failures)", async () => {
    const result = await runSettleOnce();

    expect(result).toMatchObject({
      settled: 0,
      voided: 0,
      failed: 0,
      totalSports: 1,
      errors: [],
      calibrationRegenerated: true,
    });
    expect(result.sports).toEqual([
      expect.objectContaining({ sport: "basketball_nba", ok: true }),
    ]);
  });

  it("treats a snapshot-mirror failure as non-fatal: the pick still settles", async () => {
    providerMocks.getScores.mockResolvedValue({ data: [makeScore()], remainingRequests: 99, usedRequests: 1 });
    dbMocks.gameFindUnique.mockResolvedValue(makeGame());
    dbMocks.snapshotUpdateMany.mockRejectedValue(new Error("snapshot write failed"));

    const result = await runSettleOnce();

    expect(result.settled).toBe(1);
    expect(result.failed).toBe(0);
    expect(dbMocks.pickUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "pick-1" } })
    );
  });

  it("records a void-sweep failure in errors[] without failing the sports pass", async () => {
    dbMocks.gameFindMany.mockRejectedValue(new Error("sweep query failed"));

    const result = await runSettleOnce();

    expect(result.failed).toBe(0);
    expect(result.errors).toEqual([expect.stringContaining("void-sweep:")]);
    expect(result.voided).toBe(0);
  });

  it("reports calibrationRegenerated:false on regen failure WITHOUT polluting errors[]", async () => {
    regenMock.mockRejectedValue(new Error("script not on disk"));

    const result = await runSettleOnce();

    expect(result.calibrationRegenerated).toBe(false);
    // Deliberate: a bundled host (Vercel) lacks the script by design; a
    // permanent errors[] entry would force an eternal 207 from the route.
    expect(result.errors).toEqual([]);
    expect(result.failed).toBe(0);
  });
});

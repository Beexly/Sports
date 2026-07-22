import { beforeEach, describe, expect, it, vi } from "vitest";
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
  // prediction-engine
  calculatePickResult: vi.fn<(...args: unknown[]) => string>(),
  deriveClosingSnapshotFromOdds: vi.fn<(...args: unknown[]) => unknown>(),
  gradePickClv: vi.fn<(args: unknown) => unknown>(),
  // db
  gameFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  gameUpdate: vi.fn<(args: unknown) => Promise<unknown>>(),
  oddsFindMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
  pickUpdate: vi.fn<(args: unknown) => Promise<unknown>>(),
  pickUpdateMany: vi.fn<(args: unknown) => Promise<{ count: number }>>(),
  openingLineFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  snapshotUpdateMany: vi.fn<(args: unknown) => Promise<{ count: number }>>(),
  snapshotFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  snapshotCreate: vi.fn<(args: unknown) => Promise<unknown>>(),
  // Phase 1E — settlement evidence + transactional outbox
  transaction: vi.fn<(fn: (tx: unknown) => Promise<unknown>) => Promise<unknown>>(),
  obsCreateMany: vi.fn<(args: unknown) => Promise<{ count: number }>>(),
  obsFindMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
  anomalyFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  anomalyUpsert: vi.fn<(args: unknown) => Promise<unknown>>(),
  anomalyUpdateMany: vi.fn<(args: unknown) => Promise<{ count: number }>>(),
  decisionCreate: vi.fn<(args: unknown) => Promise<unknown>>(),
  outboxCreate: vi.fn<(args: unknown) => Promise<unknown>>(),
  // Deletion tripwires — Phase 1E evidence is append-only. These exist on
  // the mock ONLY so the suite can assert they are NEVER invoked.
  obsDelete: vi.fn(),
  obsDeleteMany: vi.fn(),
  anomalyDelete: vi.fn(),
  anomalyDeleteMany: vi.fn(),
  decisionDelete: vi.fn(),
  decisionDeleteMany: vi.fn(),
  outboxDelete: vi.fn(),
  outboxDeleteMany: vi.fn(),
}));

vi.mock("@sports/db", () => {
  // Shared delegates: the interactive-transaction stub hands BACK the same
  // delegates, mirroring Prisma's tx client — so assertions on e.g.
  // pickUpdateMany apply whether the call rode inside $transaction or not,
  // and the suite can verify which calls happened transactionally by
  // inspecting mocks.transaction.
  const settlementObservation = {
    createMany: mocks.obsCreateMany,
    findMany: mocks.obsFindMany,
    delete: mocks.obsDelete,
    deleteMany: mocks.obsDeleteMany,
  };
  const settlementAnomaly = {
    findUnique: mocks.anomalyFindUnique,
    upsert: mocks.anomalyUpsert,
    updateMany: mocks.anomalyUpdateMany,
    delete: mocks.anomalyDelete,
    deleteMany: mocks.anomalyDeleteMany,
  };
  const settlementDecision = {
    create: mocks.decisionCreate,
    delete: mocks.decisionDelete,
    deleteMany: mocks.decisionDeleteMany,
  };
  const pickSettlementEvent = {
    create: mocks.outboxCreate,
    delete: mocks.outboxDelete,
    deleteMany: mocks.outboxDeleteMany,
  };
  const pick = { update: mocks.pickUpdate, updateMany: mocks.pickUpdateMany };
  const tx = { pick, settlementObservation, settlementAnomaly, settlementDecision, pickSettlementEvent };
  mocks.transaction.mockImplementation(async (fn: (t: unknown) => Promise<unknown>) => fn(tx));
  return {
    db: {
      $transaction: mocks.transaction,
      game: { findUnique: mocks.gameFindUnique, update: mocks.gameUpdate },
      odds: { findMany: mocks.oddsFindMany },
      pick,
      openingLine: { findUnique: mocks.openingLineFindUnique },
      pickSignalSnapshot: {
        updateMany: mocks.snapshotUpdateMany,
        findUnique: mocks.snapshotFindUnique,
        create: mocks.snapshotCreate,
      },
      settlementObservation,
      settlementAnomaly,
      settlementDecision,
      pickSettlementEvent,
    },
  };
});

vi.mock("@sports/data-ingestion", () => ({
  OddsApiClient: vi.fn().mockImplementation(() => ({ getScores: mocks.getScores })),
  DataNormalizer: vi.fn().mockImplementation(() => ({ normalizeScores: mocks.normalizeScores })),
  settleGameLogs: mocks.settleGameLogs,
}));

vi.mock("@sports/prediction-engine", () => ({
  calculatePickResult: mocks.calculatePickResult,
  deriveClosingSnapshotFromOdds: mocks.deriveClosingSnapshotFromOdds,
  gradePickClv: mocks.gradePickClv,
  // Real pure implementation of the no-drift helper settle-sport now imports:
  // the grading line is the locked CLV line, falling back to the pick line.
  selectGradingLine: (pick: { clvLockLine: number | null; line: number }) =>
    pick.clvLockLine ?? pick.line,
}));

import {
  settleSport,
  SCORELESS_REVIEW_THRESHOLD,
  SCORELESS_COMPLETED_ANOMALY,
} from "../settle-sport.js";
import { fingerprintScorePayload } from "../settlement-evidence.js";

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

    // Re-arm the transaction stub (mockReset wiped its implementation): the
    // callback receives the shared tx delegates defined in the vi.mock above.
    mocks.transaction.mockImplementation(async (fn: (t: unknown) => Promise<unknown>) =>
      fn({
        pick: { update: mocks.pickUpdate, updateMany: mocks.pickUpdateMany },
        settlementObservation: { createMany: mocks.obsCreateMany, findMany: mocks.obsFindMany },
        settlementAnomaly: {
          findUnique: mocks.anomalyFindUnique,
          upsert: mocks.anomalyUpsert,
          updateMany: mocks.anomalyUpdateMany,
        },
        settlementDecision: { create: mocks.decisionCreate },
        pickSettlementEvent: { create: mocks.outboxCreate },
      }),
    );

    // Evidence/outbox defaults: a fresh first sighting (1 distinct run, new
    // anomaly), no anomaly to resolve, outbox append succeeds.
    mocks.obsCreateMany.mockResolvedValue({ count: 1 });
    mocks.obsFindMany.mockResolvedValue([{ settlementRunId: "run-1" }]);
    mocks.anomalyFindUnique.mockResolvedValue(null);
    mocks.anomalyUpsert.mockResolvedValue({ id: "anomaly-1", state: "OPEN" });
    mocks.anomalyUpdateMany.mockResolvedValue({ count: 0 });
    mocks.decisionCreate.mockResolvedValue({});
    mocks.outboxCreate.mockResolvedValue({});

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
  });

  it("grades SPREAD/TOTAL against the LOCKED line, not the drifted live line", async () => {
    // Pick was published+receipted at -3.5 but pick.line drifted to -7 on a later refresh.
    mocks.gameFindUnique.mockResolvedValue(
      dbGame([pendingPick({ line: -7, selection: "Chiefs -7.0", clvLockLine: -3.5 })])
    );

    await settleSport(SPORT, "key", gates());

    // Settlement must grade against the frozen -3.5, never the drifted -7.
    expect(mocks.calculatePickResult).toHaveBeenCalledWith(
      "SPREAD",
      "Chiefs -7.0",
      -3.5,
      "Chiefs",
      expect.anything(),
      expect.anything(),
      expect.anything(),
      "Bills", // awayTeamName rides along (most-specific side derivation)
    );
  });

  it("falls back to pick.line when a legacy row has no clvLockLine", async () => {
    mocks.gameFindUnique.mockResolvedValue(
      dbGame([pendingPick({ line: -4.5, clvLockLine: null })])
    );

    await settleSport(SPORT, "key", gates());

    expect(mocks.calculatePickResult).toHaveBeenCalledWith(
      "SPREAD",
      expect.anything(),
      -4.5,
      "Chiefs",
      expect.anything(),
      expect.anything(),
      expect.anything(),
      "Bills",
    );
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

  it("never overwrites a recorded score with null on a completed-but-scoreless feed row", async () => {
    // Cycle 2: the same completed game comes back with the scores dropped
    // (Odds API omits the scores array for an older game, a PPD/cancelled game
    // flagged completed=true, or a name-format drift). This must NOT null out a
    // previously-recorded FINAL score, must NOT set status FINAL, and must not
    // settle any picks.
    mocks.normalizeScores.mockReturnValue([
      completedScore({ homeScore: null, awayScore: null }),
    ]);

    const result = await settleSport(SPORT, "key", gates());

    expect(result).toMatchObject({
      status: "success",
      gamesSettled: 0,
      picksSettled: 0,
    });

    // The game update is a harmless no-op: empty data, never null score fields,
    // never status FINAL.
    const updateCall = mocks.gameUpdate.mock.calls[0]?.[0] as
      | { data: Record<string, unknown> }
      | undefined;
    expect(updateCall?.data).toEqual({});

    // No settlement math ran for a scoreless game.
    expect(mocks.calculatePickResult).not.toHaveBeenCalled();
    expect(mocks.pickUpdateMany).not.toHaveBeenCalled();
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

  describe("settlement evidence — completed-but-scoreless (Phase 1E)", () => {
    beforeEach(() => {
      // Feed says completed=true but drops the scores while the game is
      // still open on our side.
      mocks.normalizeScores.mockReturnValue([
        completedScore({ homeScore: null, awayScore: null }),
      ]);
      mocks.gameFindUnique.mockResolvedValue(
        dbGame([pendingPick()], { status: "SCHEDULED", externalId: "ext-1" }),
      );
    });

    it("records a deduplicated observation in one transaction — never a counter, never a status change, never a void", async () => {
      const result = await settleSport(SPORT, "key", gates());

      expect(result).toMatchObject({
        status: "success",
        observationsRecorded: 1,
        anomaliesOpened: 1,
        anomaliesPromoted: 0,
      });

      // Everything rode inside $transaction.
      expect(mocks.transaction).toHaveBeenCalled();

      // Insert-or-noop with the dedupe key components: run id + deterministic
      // payload fingerprint (skipDuplicates → INSERT ON CONFLICT DO NOTHING).
      const createArgs = mocks.obsCreateMany.mock.calls[0]![0] as {
        data: Array<Record<string, unknown>>;
        skipDuplicates: boolean;
      };
      expect(createArgs.skipDuplicates).toBe(true);
      const row = createArgs.data[0]!;
      expect(row["gameId"]).toBe("game-1");
      expect(typeof row["settlementRunId"]).toBe("string");
      expect(row["payloadFingerprint"]).toBe(
        fingerprintScorePayload({
          externalId: "ext-1",
          completed: true,
          homeScore: null,
          awayScore: null,
        }),
      );
      expect(row["observedSourceStatus"]).toBe(SCORELESS_COMPLETED_ANOMALY);
      expect(row["homeScorePresent"]).toBe(false);
      expect(row["awayScorePresent"]).toBe(false);

      // The game row itself stays exactly as main left it: an empty no-op
      // update — no increment column, no flag column, no inferred status.
      const gameUpdateData = (mocks.gameUpdate.mock.calls[0]![0] as { data: unknown }).data;
      expect(gameUpdateData).toEqual({});

      // Picks are NEVER touched from a scoreless sighting.
      expect(mocks.pickUpdateMany).not.toHaveBeenCalled();
      expect(mocks.calculatePickResult).not.toHaveBeenCalled();
      expect(mocks.outboxCreate).not.toHaveBeenCalled();
    });

    it("mints one settlementRunId per settleSport() call and stamps every observation with it", async () => {
      mocks.normalizeScores.mockReturnValue([
        completedScore({ externalId: "ext-1", homeScore: null, awayScore: null }),
        completedScore({ externalId: "ext-2", homeScore: null, awayScore: null }),
      ]);
      mocks.gameFindUnique
        .mockResolvedValueOnce(dbGame([pendingPick()], { id: "game-1", status: "SCHEDULED" }))
        .mockResolvedValueOnce(dbGame([pendingPick()], { id: "game-2", status: "LIVE" }));

      await settleSport(SPORT, "key", gates());

      const runIds = mocks.obsCreateMany.mock.calls.map(
        (c) => ((c[0] as { data: Array<Record<string, unknown>> }).data[0]!)["settlementRunId"],
      );
      expect(runIds).toHaveLength(2);
      expect(runIds[0]).toBe(runIds[1]); // same run
      expect(String(runIds[0])).toMatch(/^[0-9a-f-]{36}$/); // crypto.randomUUID
    });

    it("a retried run/payload adds NO corroboration (unique-violation no-op path)", async () => {
      // The dedupe insert hits ON CONFLICT DO NOTHING: count 0. Distinct-run
      // derivation still sees only the runs that genuinely observed it.
      mocks.obsCreateMany.mockResolvedValue({ count: 0 });
      mocks.obsFindMany.mockResolvedValue([
        { settlementRunId: "run-1" },
        { settlementRunId: "run-2" },
      ]);
      mocks.anomalyFindUnique.mockResolvedValue({ id: "anomaly-1", state: "OPEN" });

      const result = await settleSport(SPORT, "key", gates());

      expect(result.observationsRecorded).toBe(0);
      expect(result.anomaliesOpened).toBe(0);
      expect(result.anomaliesPromoted).toBe(0);
      // 2 distinct runs < threshold(3): promotion never attempted, no receipt.
      expect(mocks.decisionCreate).not.toHaveBeenCalled();
      // Corroboration is DERIVED (distinct run ids), never an in-place
      // increment anywhere.
      const anyIncrement = mocks.gameUpdate.mock.calls.some((c) =>
        JSON.stringify(c[0]).includes("increment"),
      );
      expect(anyIncrement).toBe(false);
    });

    it("crossing the threshold promotes exactly once and creates exactly one SettlementDecision receipt", async () => {
      mocks.obsFindMany.mockResolvedValue([
        { settlementRunId: "run-1" },
        { settlementRunId: "run-2" },
        { settlementRunId: "run-3" },
      ]);
      mocks.anomalyFindUnique.mockResolvedValue({ id: "anomaly-1", state: "OPEN" });
      mocks.anomalyUpsert.mockResolvedValue({ id: "anomaly-1", state: "OPEN" });
      mocks.anomalyUpdateMany.mockResolvedValue({ count: 1 }); // won the promotion race

      const result = await settleSport(SPORT, "key", gates());

      expect(result.anomaliesPromoted).toBe(1);
      expect(SCORELESS_REVIEW_THRESHOLD).toBe(3);

      // Promotion is guarded on state:"OPEN" — the race gate.
      expect(mocks.anomalyUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "anomaly-1", state: "OPEN" },
          data: expect.objectContaining({ state: "OWNER_REVIEW" }),
        }),
      );
      // Exactly one durable receipt, tied to the anomaly by the unique FK.
      expect(mocks.decisionCreate).toHaveBeenCalledTimes(1);
      expect(mocks.decisionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            anomalyId: "anomaly-1",
            decisionKind: "REVIEW_REQUESTED",
            context: expect.objectContaining({ distinctRunCount: 3, threshold: 3 }),
          }),
        }),
      );
      // STILL never voids or infers: picks untouched.
      expect(mocks.pickUpdateMany).not.toHaveBeenCalled();
    });

    it("double-promotion race: the losing transaction (updateMany count 0) never writes a second receipt", async () => {
      // Both racers derived >=3 distinct runs; this transaction re-read the
      // anomaly as still OPEN, but the concurrent winner promoted it between
      // the read and the guarded update — so the guard matches 0 rows.
      mocks.obsFindMany.mockResolvedValue([
        { settlementRunId: "run-1" },
        { settlementRunId: "run-2" },
        { settlementRunId: "run-3" },
      ]);
      mocks.anomalyFindUnique.mockResolvedValue({ id: "anomaly-1", state: "OPEN" });
      mocks.anomalyUpsert.mockResolvedValue({ id: "anomaly-1", state: "OPEN" });
      mocks.anomalyUpdateMany.mockResolvedValue({ count: 0 }); // lost the race

      const result = await settleSport(SPORT, "key", gates());

      expect(result.anomaliesPromoted).toBe(0);
      expect(mocks.decisionCreate).not.toHaveBeenCalled();
    });

    it("an anomaly already in OWNER_REVIEW is never re-promoted and never gets a second receipt", async () => {
      mocks.obsFindMany.mockResolvedValue([
        { settlementRunId: "run-1" },
        { settlementRunId: "run-2" },
        { settlementRunId: "run-3" },
        { settlementRunId: "run-4" },
      ]);
      mocks.anomalyFindUnique.mockResolvedValue({ id: "anomaly-1", state: "OWNER_REVIEW" });
      mocks.anomalyUpsert.mockResolvedValue({ id: "anomaly-1", state: "OWNER_REVIEW" });

      const result = await settleSport(SPORT, "key", gates());

      expect(result.anomaliesPromoted).toBe(0);
      // No promotion attempt at all (the guard is not even exercised) and
      // certainly no receipt.
      expect(mocks.anomalyUpdateMany).not.toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ state: "OWNER_REVIEW" }) }),
      );
      expect(mocks.decisionCreate).not.toHaveBeenCalled();
    });

    it("terminal-game late source regression: FINAL games never enter the evidence path (preserved from main)", async () => {
      mocks.gameFindUnique.mockResolvedValue(dbGame([pendingPick()], { status: "FINAL" }));

      const result = await settleSport(SPORT, "key", gates());

      expect(result).toMatchObject({
        status: "success",
        gamesSettled: 0,
        picksSettled: 0,
        observationsRecorded: 0,
        anomaliesOpened: 0,
      });
      // Exactly main's behavior: the harmless empty update, nothing else.
      expect((mocks.gameUpdate.mock.calls[0]![0] as { data: unknown }).data).toEqual({});
      expect(mocks.transaction).not.toHaveBeenCalled();
      expect(mocks.obsCreateMany).not.toHaveBeenCalled();
    });

    it("an evidence write failure is isolated — settlement still succeeds", async () => {
      mocks.obsCreateMany.mockRejectedValue(new Error("evidence table locked"));

      const result = await settleSport(SPORT, "key", gates());

      expect(result.status).toBe("success");
      expect(result.observationsRecorded).toBe(0);
    });

    it("APPEND-ONLY: no delete of observations, anomalies, decisions, or outbox rows — ever", async () => {
      // Run both the evidence path and (separately re-mocked) a normal
      // settle+resolve pass, then assert none of the deletion tripwires fired.
      await settleSport(SPORT, "key", gates());
      mocks.normalizeScores.mockReturnValue([completedScore()]);
      mocks.gameFindUnique.mockResolvedValue(dbGame([pendingPick()], { status: "SCHEDULED" }));
      mocks.anomalyUpdateMany.mockResolvedValue({ count: 1 });
      await settleSport(SPORT, "key", gates());

      for (const tripwire of [
        mocks.obsDelete,
        mocks.obsDeleteMany,
        mocks.anomalyDelete,
        mocks.anomalyDeleteMany,
        mocks.decisionDelete,
        mocks.decisionDeleteMany,
        mocks.outboxDelete,
        mocks.outboxDeleteMany,
      ]) {
        expect(tripwire).not.toHaveBeenCalled();
      }
    });
  });

  describe("anomaly resolution — real scores arrive later (Phase 1E)", () => {
    it("marks OPEN/OWNER_REVIEW anomalies RESOLVED with reason scores-arrived; evidence and receipt survive", async () => {
      // Default fixtures: completed game WITH scores.
      mocks.anomalyUpdateMany.mockResolvedValue({ count: 1 });

      const result = await settleSport(SPORT, "key", gates());

      expect(result.anomaliesResolved).toBe(1);
      expect(mocks.anomalyUpdateMany).toHaveBeenCalledWith({
        where: {
          gameId: "game-1",
          anomalyType: SCORELESS_COMPLETED_ANOMALY,
          state: { in: ["OPEN", "OWNER_REVIEW"] },
        },
        data: {
          state: "RESOLVED",
          resolutionActor: "settlement-pipeline",
          resolutionReason: "scores-arrived",
          resolvedAt: expect.any(Date),
        },
      });
      // Resolution NEVER deletes the history (the rejected #157 reset it).
      expect(mocks.obsDeleteMany).not.toHaveBeenCalled();
      expect(mocks.decisionDeleteMany).not.toHaveBeenCalled();
      // And settlement itself proceeded normally.
      expect(result.picksSettled).toBe(1);
    });

    it("a resolution failure never blocks settlement", async () => {
      mocks.anomalyUpdateMany.mockRejectedValue(new Error("anomaly table locked"));

      const result = await settleSport(SPORT, "key", gates());

      expect(result.status).toBe("success");
      expect(result.picksSettled).toBe(1);
      expect(result.anomaliesResolved).toBe(0);
    });
  });

  describe("transactional outbox (Phase 1E)", () => {
    it("appends exactly one PickSettlementEvent per settled pick, inside the same transaction as the pick update", async () => {
      mocks.gameFindUnique.mockResolvedValue(
        dbGame([pendingPick({ id: "pick-1" }), pendingPick({ id: "pick-2" })]),
      );

      const result = await settleSport(SPORT, "key", gates());

      expect(result.picksSettled).toBe(2);
      expect(result.outboxAppended).toBe(2);
      // One $transaction per pick settle; the same callback performed BOTH
      // the pick update and the outbox append (mock-proven atomicity — the
      // real guarantee is Prisma's interactive transaction; the unique
      // pickId constraint is verified against real Postgres separately).
      expect(mocks.transaction).toHaveBeenCalledTimes(2);
      expect(mocks.outboxCreate).toHaveBeenCalledTimes(2);
      expect(mocks.outboxCreate).toHaveBeenCalledWith({
        data: {
          pickId: "pick-1",
          gameId: "game-1",
          result: "WIN",
          settledAt: expect.any(Date),
          status: "PENDING",
        },
      });
    });

    it("the settle-race loser (updateMany count 0) appends NO outbox row", async () => {
      mocks.pickUpdateMany.mockResolvedValue({ count: 0 });

      const result = await settleSport(SPORT, "key", gates());

      expect(result.picksSettled).toBe(0);
      expect(result.outboxAppended).toBe(0);
      expect(mocks.outboxCreate).not.toHaveBeenCalled();
    });

    it("a failed transaction (e.g. outbox append blows up) settles nothing for that pick and counts nothing", async () => {
      // The whole transaction rejects — pick update and outbox append fail
      // together (atomicity), and settlement of the SPORT still returns
      // failed-status honestly at the sport level... no: a per-pick throw is
      // caught at the sport level try/catch, reported as failed.
      mocks.outboxCreate.mockRejectedValue(new Error("outbox insert failed"));
      mocks.transaction.mockImplementation(async (fn: (t: unknown) => Promise<unknown>) => {
        // Simulate Prisma rolling back the interactive tx: the callback's
        // rejection propagates and nothing committed.
        return fn({
          pick: { update: mocks.pickUpdate, updateMany: mocks.pickUpdateMany },
          pickSettlementEvent: { create: mocks.outboxCreate },
          settlementObservation: { createMany: mocks.obsCreateMany, findMany: mocks.obsFindMany },
          settlementAnomaly: {
            findUnique: mocks.anomalyFindUnique,
            upsert: mocks.anomalyUpsert,
            updateMany: mocks.anomalyUpdateMany,
          },
          settlementDecision: { create: mocks.decisionCreate },
        });
      });

      const result = await settleSport(SPORT, "key", gates());

      expect(result.status).toBe("failed");
      expect(result.picksSettled).toBe(0);
      expect(result.outboxAppended).toBe(0);
    });
  });
});

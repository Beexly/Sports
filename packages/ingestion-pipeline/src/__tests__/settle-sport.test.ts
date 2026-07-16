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
    result: "PENDING",
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
    // Minted under the receipt contract (post-epoch, receipt carries sport=).
    generatedAt: new Date("2026-08-01T12:00:00.000Z"),
    proofReceipt: { payload: "gameId=game-1|sport=NFL" },
    ...overrides,
  };
}

/** A pick minted BEFORE the receipt contract epoch — no receipt at all. */
function legacyPick(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return pendingPick({
    generatedAt: new Date("2026-05-01T12:00:00.000Z"),
    proofReceipt: null,
    ...overrides,
  });
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
    mocks.gameFindMany.mockResolvedValue([]);
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
      "Bills",
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

    it("a settlement-snapshot write failure never blocks settlement (settle-time half of owner ruling R3)", async () => {
      // Snapshot mandatoriness is MINT-time only (R3): at settle time the
      // outcome is source truth, so a failing recordPickSettlementSnapshot —
      // every write path down, retries exhausted — must be contained. The pick
      // still settles (status flips, public W/L unaffected) and no error
      // escapes the settle pass.
      mocks.snapshotUpdateMany.mockRejectedValue(new Error("snapshot table locked"));
      mocks.snapshotFindUnique.mockRejectedValue(new Error("snapshot table locked"));
      mocks.snapshotCreate.mockRejectedValue(new Error("snapshot table locked"));

      const result = await settleSport(SPORT, "key", gates());

      expect(result.status).toBe("success");
      expect(result.gamesSettled).toBe(1);
      expect(result.picksSettled).toBe(1);
      // The settle write itself flipped the pick's status — the public W/L
      // record is unaffected by the snapshot failure.
      expect(mocks.pickUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "pick-1", result: "PENDING" },
          data: expect.objectContaining({ result: "WIN", settledAt: expect.any(Date) }),
        })
      );
    });
  });

  describe("catch-up settlement", () => {
    it("uses the maximum three-day score lookback", async () => {
      await settleSport(SPORT, "key", gates());

      expect(mocks.getScores).toHaveBeenCalledWith(SPORT.key, 3);
    });

    it("settles a recorded FINAL that was missed by the score feed", async () => {
      mocks.normalizeScores.mockReturnValue([]);
      mocks.gameFindMany
        .mockResolvedValueOnce([
          {
            externalId: "ext-1",
            homeScore: 31,
            awayScore: 17,
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await settleSport(SPORT, "key", gates());

      expect(mocks.calculatePickResult).toHaveBeenCalledWith(
        "SPREAD",
        expect.anything(),
        expect.anything(),
        "Chiefs",
        31,
        17,
        SPORT.key,
        "Bills"
      );
      expect(result).toMatchObject({
        status: "success",
        gamesSettled: 1,
        picksSettled: 1,
        picksVoided: 0,
      });
    });

    it("voids an old pending pick with no gradeable outcome", async () => {
      mocks.normalizeScores.mockReturnValue([]);
      mocks.gameFindMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          dbGame([pendingPick()], {
            status: "SCHEDULED",
            homeScore: null,
            awayScore: null,
            commenceTime: new Date("2026-06-01T17:00:00.000Z"),
          }),
        ]);

      const result = await settleSport(SPORT, "key", gates());

      expect(mocks.pickUpdateMany).toHaveBeenCalledWith({
        where: { id: "pick-1", result: "PENDING" },
        data: { result: "VOID", settledAt: expect.any(Date) },
      });
      expect(mocks.calculatePickResult).not.toHaveBeenCalled();
      expect(mocks.snapshotUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            settlementResult: "VOID",
            eligibleForLearning: false,
          }),
        })
      );
      expect(result).toMatchObject({
        status: "success",
        gamesSettled: 0,
        picksSettled: 0,
        picksVoided: 1,
      });
      expect(mocks.gameUpdate).not.toHaveBeenCalled();
    });

    it("NEVER voids on a pass where the scores feed errored (owner ruling R1)", async () => {
      // The feed failing is absence-of-data, not evidence the games are
      // ungradeable — the VOID sweep must not run at all on this pass.
      mocks.getScores.mockRejectedValue(new Error("quota exhausted"));
      mocks.gameFindMany.mockResolvedValue([
        dbGame([pendingPick()], {
          status: "POSTPONED",
          homeScore: null,
          awayScore: null,
          commenceTime: new Date("2026-06-01T17:00:00.000Z"),
        }),
      ]);

      const result = await settleSport(SPORT, "key", gates());

      expect(result).toMatchObject({
        status: "failed",
        error: "quota exhausted",
        picksVoided: 0,
      });
      // Only the recorded-final catch-up query ran — the stale-game VOID
      // sweep query was skipped entirely.
      expect(mocks.gameFindMany).toHaveBeenCalledTimes(1);
      expect(mocks.pickUpdateMany).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ result: "VOID" }),
        })
      );
    });

    it("still settles recorded FINALs when the feed fails — only voiding is feed-gated", async () => {
      mocks.getScores.mockRejectedValue(new Error("quota exhausted"));
      mocks.gameFindMany.mockResolvedValueOnce([
        { externalId: "ext-1", homeScore: 31, awayScore: 17 },
      ]);

      const result = await settleSport(SPORT, "key", gates());

      expect(result).toMatchObject({
        status: "failed",
        error: "quota exhausted",
        picksSettled: 1,
        picksVoided: 0,
      });
    });

    it("limits the VOID sweep to stale non-final games with pending picks", async () => {
      await settleSport(SPORT, "key", gates());

      const query = mocks.gameFindMany.mock.calls[1]?.[0] as {
        where: Record<string, unknown>;
      };
      expect(query.where).toMatchObject({
        sport: { key: SPORT.key },
        picks: { some: { result: "PENDING" } },
        NOT: {
          status: "FINAL",
          homeScore: { not: null },
          awayScore: { not: null },
        },
      });
      expect(query.where["commenceTime"]).toEqual({ lt: expect.any(Date) });
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

      expect(mocks.pickUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "pick-1", clvGradedAt: null },
          data: expect.objectContaining({
            clvCloseLine: -4,
            clvVerdict: "BEAT_CLOSE",
            clvCapturedAt: capturedAt,
            clvGradedAt: expect.any(Date),
          }),
        })
      );
    });

    it("stamps a terminal marker (clvGradedAt, null verdict) when no close can be derived", async () => {
      mocks.deriveClosingSnapshotFromOdds.mockReturnValue(null);

      await settleSport(SPORT, "key", gates());

      expect(mocks.gradePickClv).not.toHaveBeenCalled();
      // Two updateMany calls: the settle write, then the terminal CLV marker —
      // clvGradedAt alone, so the pick exits every CLV query without churn.
      expect(mocks.pickUpdateMany).toHaveBeenCalledTimes(2);
      expect(mocks.pickUpdateMany).toHaveBeenLastCalledWith({
        where: { id: "pick-1", clvGradedAt: null },
        data: { clvGradedAt: expect.any(Date) },
      });
      expect(mocks.pickUpdate).not.toHaveBeenCalled();
    });

    it("a LEGACY pre-receipt pick still gets old-path CLV (forward-only gate, owner ruling R2a)", async () => {
      const capturedAt = new Date("2026-06-10T16:55:00.000Z");
      mocks.gameFindUnique.mockResolvedValue(dbGame([legacyPick()]));
      mocks.deriveClosingSnapshotFromOdds.mockReturnValue({ capturedAt });
      mocks.gradePickClv.mockReturnValue({
        closeLine: -4,
        closePrice: null,
        kind: "POINTS",
        value: 0.5,
        verdict: "BEAT_CLOSE",
      });

      await settleSport(SPORT, "key", gates());

      // No receipt, no observed-market contract — but the pick predates the
      // receipt contract, so the pre-existing grading path applies unchanged.
      expect(mocks.gradePickClv).toHaveBeenCalledTimes(1);
      expect(mocks.pickUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "pick-1", clvGradedAt: null },
          data: expect.objectContaining({ clvVerdict: "BEAT_CLOSE" }),
        })
      );
    });

    it("a legacy pick that genuinely cannot be graded exits terminally (no clvGradedAt churn)", async () => {
      mocks.gameFindUnique.mockResolvedValue(
        dbGame([legacyPick({ clvLockLine: null, clvLockPrice: null })])
      );
      mocks.deriveClosingSnapshotFromOdds.mockReturnValue({ capturedAt: new Date() });
      mocks.gradePickClv.mockReturnValue(null); // no lock to compare — ungradeable

      await settleSport(SPORT, "key", gates());

      expect(mocks.pickUpdateMany).toHaveBeenLastCalledWith({
        where: { id: "pick-1", clvGradedAt: null },
        data: { clvGradedAt: expect.any(Date) },
      });
    });

    it("withholds CLV (terminal marker) for a post-epoch pick whose receipt lacks the market contract", async () => {
      mocks.gameFindUnique.mockResolvedValue(
        dbGame([pendingPick({ proofReceipt: { payload: "gameId=game-1" } })]),
      );
      mocks.deriveClosingSnapshotFromOdds.mockReturnValue({ capturedAt: new Date() });

      await settleSport(SPORT, "key", gates());

      expect(mocks.gradePickClv).not.toHaveBeenCalled();
      expect(mocks.pickUpdate).not.toHaveBeenCalled();
      expect(mocks.pickUpdateMany).toHaveBeenLastCalledWith({
        where: { id: "pick-1", clvGradedAt: null },
        data: { clvGradedAt: expect.any(Date) },
      });
    });

    it("queries PENDING picks ONLY — no retroactive CLV backfill of settled picks (owner ruling R2c)", async () => {
      await settleSport(SPORT, "key", gates());

      expect(mocks.gameFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            picks: expect.objectContaining({
              where: { result: "PENDING" },
            }),
          },
        })
      );
      // The recorded-final catch-up query is likewise PENDING-only.
      const catchUpQuery = mocks.gameFindMany.mock.calls[0]?.[0] as {
        where: Record<string, unknown>;
      };
      expect(catchUpQuery.where["picks"]).toEqual({ some: { result: "PENDING" } });
    });
  });
});

import { describe, expect, it, vi } from "vitest";
import {
  recordPickSettlementSnapshot,
  type RecordSettlementSnapshotInput,
  type SettlementSnapshotDb,
} from "../../../workers/data-refresh/src/settlement-snapshots";

function makeInput(db: SettlementSnapshotDb): RecordSettlementSnapshotInput {
  return {
    db,
    pick: {
      id: "pick-1",
      gameId: "game-1",
      isBootstrap: false,
      bookmakerCount: 8,
      confidence: 74,
      modelVersion: "v5.0.0",
      factorBreakdown: { dataQualityScore: 88 },
    },
    result: "WIN",
    settledAt: new Date("2026-05-29T20:00:00.000Z"),
    isEligibleForLearning: true,
    gameDataQualityScore: 71,
    baseDelayMs: 5,
    sleep: async () => undefined,
  };
}

describe("settlement PickSignalSnapshot durability", () => {
  it("updates an existing unsettled snapshot without creating a duplicate", async () => {
    const db: SettlementSnapshotDb = {
      pickSignalSnapshot: {
        updateMany: vi.fn(async () => ({ count: 1 })),
        findUnique: vi.fn(async () => null),
        create: vi.fn(async () => ({})),
      },
    };

    const status = await recordPickSettlementSnapshot(makeInput(db));

    expect(status).toBe("updated-existing");
    expect(db.pickSignalSnapshot.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { pickId: "pick-1", settlementResult: null },
        data: expect.objectContaining({
          settlementResult: "WIN",
          eligibleForLearning: true,
          learningEligibleAt: new Date("2026-05-29T20:00:00.000Z"),
        }),
      })
    );
    expect(db.pickSignalSnapshot.create).not.toHaveBeenCalled();
  });

  it("treats an already-settled snapshot as idempotent", async () => {
    const db: SettlementSnapshotDb = {
      pickSignalSnapshot: {
        updateMany: vi.fn(async () => ({ count: 0 })),
        findUnique: vi.fn(async () => ({ settlementResult: "WIN" })),
        create: vi.fn(async () => ({})),
      },
    };

    const status = await recordPickSettlementSnapshot(makeInput(db));

    expect(status).toBe("already-settled");
    expect(db.pickSignalSnapshot.create).not.toHaveBeenCalled();
  });

  it("creates a fallback learning record when the prediction-time snapshot is missing", async () => {
    const db: SettlementSnapshotDb = {
      pickSignalSnapshot: {
        updateMany: vi.fn(async () => ({ count: 0 })),
        findUnique: vi.fn(async () => null),
        create: vi.fn(async () => ({})),
      },
    };

    const status = await recordPickSettlementSnapshot(makeInput(db));

    expect(status).toBe("created-fallback");
    expect(db.pickSignalSnapshot.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        pickId: "pick-1",
        gameId: "game-1",
        hadOddsSignal: true,
        bookmakerCount: 8,
        dataQualityScore: 88,
        confidenceAtPrediction: 74,
        isBootstrap: false,
        settlementResult: "WIN",
        eligibleForLearning: true,
      }),
    });
  });

  it("retries transient write failures before giving up on settlement learning data", async () => {
    const delays: number[] = [];
    const db: SettlementSnapshotDb = {
      pickSignalSnapshot: {
        updateMany: vi
          .fn()
          .mockRejectedValueOnce(new Error("deadlock"))
          .mockResolvedValueOnce({ count: 1 }),
        findUnique: vi.fn(async () => null),
        create: vi.fn(async () => ({})),
      },
    };

    const status = await recordPickSettlementSnapshot({
      ...makeInput(db),
      sleep: async (ms) => {
        delays.push(ms);
      },
    });

    expect(status).toBe("updated-existing");
    expect(db.pickSignalSnapshot.updateMany).toHaveBeenCalledTimes(2);
    expect(delays).toEqual([5]);
  });
});

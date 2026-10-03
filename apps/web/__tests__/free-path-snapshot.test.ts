/**
 * Tripwire: free-path SNAPSHOT_OUTCOME write + drain (Claude Code image task A/C).
 * Uses vi.hoisted mocks so factory has no free top-level vars (vitest hoist rule).
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

const {
  recordPickSettlementSnapshot,
  markPostSettlementWorkDone,
  markPostSettlementWorkFailed,
} = vi.hoisted(() => ({
  recordPickSettlementSnapshot: vi.fn(async () => "created-fallback" as const),
  markPostSettlementWorkDone: vi.fn(async () => undefined),
  markPostSettlementWorkFailed: vi.fn(async () => undefined),
}));

vi.mock("@sports/ingestion-pipeline", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sports/ingestion-pipeline")>();
  return {
    ...actual,
    recordPickSettlementSnapshot,
    markPostSettlementWorkDone,
    markPostSettlementWorkFailed,
  };
});

vi.mock("@sports/prediction-engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sports/prediction-engine")>();
  return {
    ...actual,
    getReadinessGates: () => ({
      ...actual.getReadinessGates(),
      canLearnFromOutcomes: true,
    }),
  };
});

import {
  drainPendingSnapshotOutcomes,
  recordFreePathSnapshot,
} from "@/lib/settlement/free-path-snapshot";

beforeEach(() => {
  recordPickSettlementSnapshot.mockReset();
  markPostSettlementWorkDone.mockReset();
  markPostSettlementWorkFailed.mockReset();
  recordPickSettlementSnapshot.mockResolvedValue("created-fallback" as never);
  markPostSettlementWorkDone.mockResolvedValue(undefined);
  markPostSettlementWorkFailed.mockResolvedValue(undefined);
});

describe("recordFreePathSnapshot", () => {
  it("records snapshot and marks SNAPSHOT_OUTCOME done", async () => {
    const work = {};
    const db = {
      pickSignalSnapshot: {
        updateMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      postSettlementWork: work,
    };
    const r = await recordFreePathSnapshot(
      db,
      {
        id: "pick-1",
        gameId: "game-1",
        isBootstrap: false,
        bookmakerCount: 5,
        confidence: 72,
        modelVersion: "v5.1.0",
        factorBreakdown: null,
      },
      "WIN",
      new Date("2026-08-06T12:00:00Z"),
      80,
    );
    expect(r.status).toBe("created-fallback");
    expect(recordPickSettlementSnapshot).toHaveBeenCalled();
    expect(markPostSettlementWorkDone).toHaveBeenCalledWith(
      work,
      "pick-1",
      "SNAPSHOT_OUTCOME",
      expect.any(Date),
    );
  });

  it("marks failed and returns failed without throwing", async () => {
    recordPickSettlementSnapshot.mockRejectedValueOnce(new Error("db down"));
    const work = {};
    const db = {
      pickSignalSnapshot: {
        updateMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      postSettlementWork: work,
    };
    const r = await recordFreePathSnapshot(
      db,
      {
        id: "pick-2",
        gameId: "game-2",
        isBootstrap: true,
        bookmakerCount: 2,
        confidence: 50,
        modelVersion: null,
        factorBreakdown: null,
      },
      "LOSS",
      new Date("2026-08-06T12:00:00Z"),
    );
    expect(r.status).toBe("failed");
    expect(markPostSettlementWorkFailed).toHaveBeenCalled();
  });
});

describe("drainPendingSnapshotOutcomes", () => {
  it("returns zeros when no PENDING SNAPSHOT_OUTCOME", async () => {
    const db = {
      pickSignalSnapshot: {
        updateMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      postSettlementWork: {
        findMany: vi.fn(async () => []),
      },
      pick: { findMany: vi.fn() },
    };
    const r = await drainPendingSnapshotOutcomes(db as never, { take: 10 });
    expect(r).toEqual({ attempted: 0, done: 0, failed: 0 });
    expect(db.pick.findMany).not.toHaveBeenCalled();
  });

  it("drains settled picks with PENDING SNAPSHOT work", async () => {
    recordPickSettlementSnapshot.mockResolvedValue("updated-existing" as never);
    const db = {
      pickSignalSnapshot: {
        updateMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      postSettlementWork: {
        findMany: vi.fn(async () => [{ subjectId: "p-settled" }]),
      },
      pick: {
        findMany: vi.fn(async () => [
          {
            id: "p-settled",
            result: "WIN",
            isBootstrap: false,
            bookmakerCount: 4,
            confidence: 70,
            modelVersion: "v5.1.0",
            factorBreakdown: null,
            gameId: "g1",
            game: { dataQualityScore: 90 },
          },
        ]),
      },
    };
    const r = await drainPendingSnapshotOutcomes(db as never, {
      take: 10,
      now: new Date("2026-08-06T15:00:00Z"),
    });
    expect(r.attempted).toBe(1);
    expect(r.done).toBe(1);
    expect(r.failed).toBe(0);
  });
});

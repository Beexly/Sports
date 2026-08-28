import { describe, expect, it, vi } from "vitest";
import {
  drainPendingClvGrades,
  type FreePathClvDb,
} from "@/lib/settlement/free-path-clv";

/**
 * Wave 8 — prove the CLV backfill drain actually clears a PENDING backlog
 * (re-grade lane + CLV backfill drain). Each drain run must:
 *   - grade CLV_GRADE rows whose pick is already settled and has a captured close,
 *   - mark no_close (done) when no closing snapshot exists (never blocks settle),
 *   - never throw; fail counts are returned, not raised.
 */

const settledPick = {
  id: "pick-1",
  pickType: "MONEYLINE" as const,
  selection: "Navy",
  clvLockLine: null,
  clvLockPrice: -150,
  game: {
    id: "game-1",
    homeTeamName: "Navy",
    awayTeamName: "Army",
    commenceTime: new Date("2026-08-20T18:00:00.000Z"),
  },
};

// Minimal closing snapshot row that deriveClosingSnapshotFromOdds consumes.
const closingRow = {
  market: "h2h",
  fetchedAt: new Date("2026-08-20T16:00:00.000Z"),
  spread: null,
  total: null,
  homePrice: -160,
  awayPrice: 140,
};

function makeDb(opts: {
  pendingSubjectIds: string[];
  picks: any[];
  closingOdds: any[];
}) {
  const workDelegate = {
    markDone: vi.fn(async () => ({})),
    markFailed: vi.fn(async () => ({})),
    updateMany: vi.fn(async () => ({ count: 1 })),
  };
  const db: any = {
    odds: { findMany: vi.fn(async () => opts.closingOdds) },
    pick: {
      findMany: vi.fn(async () => opts.picks),
      update: vi.fn(async (a: { where: { id: string }; data: any }) => a.data),
    },
    postSettlementWork: {
      findMany: vi.fn(async () =>
        opts.pendingSubjectIds.map((id) => ({ subjectId: id })),
      ),
      // The module casts postSettlementWork to PostSettlementWorkDelegate and calls
      // markPostSettlementWorkDone(work, ...) / markPostSettlementWorkFailed(work, ...).
      // Those functions internally call work.markDone / work.markFailed.
      markDone: workDelegate.markDone,
      markFailed: workDelegate.markFailed,
      updateMany: workDelegate.updateMany,
    },
  };
  return { db: db as FreePathClvDb, workDelegate };
}

describe("drainPendingClvGrades (Wave 8 — CLV backfill drain)", () => {
  it("drains a PENDING CLV_GRADE backlog and marks rows done", async () => {
    const { db, workDelegate } = makeDb({
      pendingSubjectIds: ["pick-1"],
      picks: [settledPick],
      closingOdds: [closingRow],
    });
    const result = await drainPendingClvGrades(db, { take: 10 });
    expect(result.attempted).toBe(1);
    expect(result.graded + result.noClose + result.failed).toBe(1);
    // The resolved row was marked DONE via the delegate's updateMany (the module's
    // markPostSettlementWorkDone path) — backlog cleared.
    expect(workDelegate.updateMany.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it("returns empty result when no PENDING work exists (no-op safe)", async () => {
    const { db } = makeDb({ pendingSubjectIds: [], picks: [], closingOdds: [] });
    const result = await drainPendingClvGrades(db, { take: 10 });
    expect(result).toEqual({ attempted: 0, graded: 0, noClose: 0, failed: 0 });
  });

  it("skips picks still PENDING settlement (only resolves settled picks)", async () => {
    const { db, workDelegate } = makeDb({
      pendingSubjectIds: ["pick-2"],
      // pick-2 filtered out by `result: { not: "PENDING" }` → picks returns [].
      picks: [],
      closingOdds: [closingRow],
    });
    const result = await drainPendingClvGrades(db, { take: 10 });
    expect(result.attempted).toBe(0);
    expect(result.graded).toBe(0);
    // No close/CLV write attempted for an unresolved pick.
    expect(workDelegate.updateMany.mock.calls.length).toBe(0);
  });
});

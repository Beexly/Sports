import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  POST_SETTLEMENT_WORK_MAX_ATTEMPTS,
  retryablePostSettlementWorkWhere,
  exhaustedPostSettlementWorkWhere,
} from "@sports/ingestion-pipeline";

/**
 * REGRESSION: PostSettlementWork FAILED was a terminal black hole.
 *
 * `markPostSettlementWorkFailed` (packages/ingestion-pipeline/src/post-settlement-work.ts)
 * writes `status: "FAILED"`, while all three drains selected `status: "PENDING"`
 * ONLY:
 *   • apps/web/lib/settlement/free-path-clv.ts        drainPendingClvGrades
 *   • apps/web/lib/settlement/free-path-snapshot.ts   drainPendingSnapshotOutcomes
 *   • packages/ingestion-pipeline/src/team-game-log-repair.ts
 *                                                    drainPendingTeamGameLogs
 * `attemptCount` was incremented on every failure and NEVER READ, and the
 * "repair job (or an owner query) can list PENDING/FAILED rows" the module
 * header promised did not exist.
 *
 * So ONE transient Postgres blip during a CLV grade permanently abandoned that
 * pick: Elite's headline CLV/line-value ledger developed silent holes and
 * calibration inputs thinned out, with nothing alerting.
 *
 * The drains now claim PENDING **or** FAILED-under-the-attempt-cap. A row at or
 * over the cap is never re-selected again — that is the terminal state, and it
 * needs no schema change.
 *
 * The fake store below EVALUATES the `where` the drain actually sends (a canned
 * findMany return value would pass with either predicate and prove nothing).
 */

type WorkRow = {
  subjectId: string;
  kind: string;
  status: string;
  attemptCount: number;
  createdAt: Date;
};

type ClaimWhere = {
  kind?: string;
  status?: string;
  OR?: ReadonlyArray<{ status?: string; attemptCount?: { lt?: number; gte?: number } }>;
};

function leafMatches(
  row: WorkRow,
  leaf: { status?: string; attemptCount?: { lt?: number; gte?: number } },
): boolean {
  if (leaf.status !== undefined && row.status !== leaf.status) return false;
  const a = leaf.attemptCount;
  if (a) {
    if (typeof a.lt === "number" && !(row.attemptCount < a.lt)) return false;
    if (typeof a.gte === "number" && !(row.attemptCount >= a.gte)) return false;
  }
  return true;
}

function workMatches(row: WorkRow, where: ClaimWhere): boolean {
  if (where.kind !== undefined && row.kind !== where.kind) return false;
  if (!leafMatches(row, where)) return false;
  if (where.OR) return where.OR.some((leaf) => leafMatches(row, leaf));
  return true;
}

function makeWorkDelegate(rows: WorkRow[]) {
  const claimed: string[][] = [];
  return {
    claimed,
    createMany: vi.fn(async () => ({ count: 0 })),
    updateMany: vi.fn(async () => ({ count: 1 })),
    findMany: vi.fn(async (args: { where: ClaimWhere; take: number }) => {
      const hits = rows
        .filter((r) => workMatches(r, args.where))
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .slice(0, args.take)
        .map((r) => ({ subjectId: r.subjectId }));
      claimed.push(hits.map((h) => h.subjectId));
      return hits;
    }),
  };
}

const T0 = new Date("2026-08-25T00:00:00.000Z");
function created(order: number): Date {
  return new Date(T0.getTime() + order * 60_000);
}

const snapshotMocks = vi.hoisted(() => ({
  recordPickSettlementSnapshot: vi.fn(async () => "created-fallback" as const),
}));

vi.mock("@sports/ingestion-pipeline", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sports/ingestion-pipeline")>();
  return {
    ...actual,
    // The real retryablePostSettlementWorkWhere / cap constant are NOT mocked —
    // they are the thing under test.
    recordPickSettlementSnapshot: snapshotMocks.recordPickSettlementSnapshot,
  };
});

import { drainPendingClvGrades } from "@/lib/settlement/free-path-clv";
import { drainPendingSnapshotOutcomes } from "@/lib/settlement/free-path-snapshot";

beforeEach(() => {
  snapshotMocks.recordPickSettlementSnapshot.mockClear();
});

describe("retryablePostSettlementWorkWhere", () => {
  it("claims PENDING and FAILED-under-cap, and nothing at or over the cap", () => {
    const where = retryablePostSettlementWorkWhere("CLV_GRADE");
    const row = (status: string, attemptCount: number): WorkRow => ({
      subjectId: "x",
      kind: "CLV_GRADE",
      status,
      attemptCount,
      createdAt: T0,
    });

    expect(workMatches(row("PENDING", 0), where)).toBe(true);
    expect(workMatches(row("FAILED", 0), where)).toBe(true);
    expect(workMatches(row("FAILED", POST_SETTLEMENT_WORK_MAX_ATTEMPTS - 1), where)).toBe(true);
    expect(workMatches(row("FAILED", POST_SETTLEMENT_WORK_MAX_ATTEMPTS), where)).toBe(false);
    expect(workMatches(row("FAILED", POST_SETTLEMENT_WORK_MAX_ATTEMPTS + 4), where)).toBe(false);
    // DONE is terminal and must stay terminal.
    expect(workMatches(row("DONE", 1), where)).toBe(false);
    // Never crosses kinds.
    expect(workMatches({ ...row("PENDING", 0), kind: "TEAM_GAME_LOG" }, where)).toBe(false);
  });

  it("exhaustedPostSettlementWorkWhere selects exactly the rows the drains gave up on", () => {
    const where = exhaustedPostSettlementWorkWhere("CLV_GRADE");
    expect(where).toEqual({
      status: "FAILED",
      attemptCount: { gte: POST_SETTLEMENT_WORK_MAX_ATTEMPTS },
      kind: "CLV_GRADE",
    });
    // The owner query and the drain predicate must partition FAILED rows with
    // no overlap and no gap.
    const drainWhere = retryablePostSettlementWorkWhere("CLV_GRADE");
    for (let n = 0; n <= POST_SETTLEMENT_WORK_MAX_ATTEMPTS + 2; n++) {
      const row: WorkRow = {
        subjectId: "x",
        kind: "CLV_GRADE",
        status: "FAILED",
        attemptCount: n,
        createdAt: T0,
      };
      expect(workMatches(row, drainWhere)).toBe(!workMatches(row, where));
    }
  });
});

describe("drainPendingClvGrades — FAILED rows are retryable, not abandoned", () => {
  function makeDb(rows: WorkRow[]) {
    const work = makeWorkDelegate(rows);
    const pickIdsQueried: string[][] = [];
    const db = {
      odds: { findMany: vi.fn(async () => []) },
      pick: {
        update: vi.fn(async () => ({})),
        findMany: vi.fn(async (args: { where: { id: { in: string[] } } }) => {
          pickIdsQueried.push(args.where.id.in);
          return args.where.id.in.map((id) => ({
            id,
            pickType: "SPREAD",
            selection: "BUF",
            clvLockLine: -3,
            clvLockPrice: -110,
            game: {
              id: `g-${id}`,
              homeTeamName: "BUF",
              awayTeamName: "KC",
              commenceTime: new Date("2026-08-20T00:00:00.000Z"),
            },
          }));
        }),
      },
      postSettlementWork: work,
    };
    return { db, work, pickIdsQueried };
  }

  it("re-selects a FAILED row still under the attempt cap", async () => {
    const { db, work, pickIdsQueried } = makeDb([
      {
        subjectId: "p-failed-2",
        kind: "CLV_GRADE",
        status: "FAILED",
        attemptCount: 2,
        createdAt: created(1),
      },
    ]);

    const r = await drainPendingClvGrades(db as never, { take: 50 });

    expect(work.claimed[0]).toEqual(["p-failed-2"]);
    expect(pickIdsQueried[0]).toEqual(["p-failed-2"]);
    // and it is actually worked, not merely listed
    expect(r.attempted).toBe(1);
  });

  it("never re-selects a FAILED row at or over the cap, while still draining one under it", async () => {
    const { db, work, pickIdsQueried } = makeDb([
      {
        subjectId: "p-under-cap",
        kind: "CLV_GRADE",
        status: "FAILED",
        attemptCount: POST_SETTLEMENT_WORK_MAX_ATTEMPTS - 1,
        createdAt: created(1),
      },
      {
        subjectId: "p-at-cap",
        kind: "CLV_GRADE",
        status: "FAILED",
        attemptCount: POST_SETTLEMENT_WORK_MAX_ATTEMPTS,
        createdAt: created(2),
      },
      {
        subjectId: "p-over-cap",
        kind: "CLV_GRADE",
        status: "FAILED",
        attemptCount: POST_SETTLEMENT_WORK_MAX_ATTEMPTS + 7,
        createdAt: created(3),
      },
    ]);

    const r = await drainPendingClvGrades(db as never, { take: 50 });

    expect(work.claimed[0]).toEqual(["p-under-cap"]);
    expect(pickIdsQueried[0]).toEqual(["p-under-cap"]);
    expect(r.attempted).toBe(1);
  });

  it("claims PENDING and FAILED-under-cap together, in createdAt order, and nothing else", async () => {
    // PENDING claiming is strictly additive — it must keep working — but the
    // FAILED row alongside it has to come through in the same drain pass.
    const { db, work } = makeDb([
      {
        subjectId: "p-pending",
        kind: "CLV_GRADE",
        status: "PENDING",
        attemptCount: 0,
        createdAt: created(1),
      },
      {
        subjectId: "p-failed-1",
        kind: "CLV_GRADE",
        status: "FAILED",
        attemptCount: 1,
        createdAt: created(2),
      },
      {
        subjectId: "p-done",
        kind: "CLV_GRADE",
        status: "DONE",
        attemptCount: 1,
        createdAt: created(3),
      },
      {
        subjectId: "p-other-kind",
        kind: "TEAM_GAME_LOG",
        status: "PENDING",
        attemptCount: 0,
        createdAt: created(4),
      },
    ]);

    await drainPendingClvGrades(db as never, { take: 50 });

    expect(work.claimed[0]).toEqual(["p-pending", "p-failed-1"]);
  });
});

describe("drainPendingSnapshotOutcomes — FAILED rows are retryable, not abandoned", () => {
  function makeDb(rows: WorkRow[]) {
    const work = makeWorkDelegate(rows);
    const pickIdsQueried: string[][] = [];
    const db = {
      pickSignalSnapshot: {
        updateMany: vi.fn(async () => ({ count: 1 })),
        findUnique: vi.fn(async () => null),
        create: vi.fn(async () => ({})),
      },
      pick: {
        findMany: vi.fn(async (args: { where: { id: { in: string[] } } }) => {
          pickIdsQueried.push(args.where.id.in);
          return args.where.id.in.map((id) => ({
            id,
            result: "WIN",
            isBootstrap: false,
            bookmakerCount: 4,
            confidence: 61,
            modelVersion: "v5.0.0",
            factorBreakdown: null,
            gameId: `g-${id}`,
            game: { dataQualityScore: 90 },
          }));
        }),
      },
      postSettlementWork: work,
    };
    return { db, work, pickIdsQueried };
  }

  it("re-selects a FAILED row still under the attempt cap", async () => {
    const { db, work, pickIdsQueried } = makeDb([
      {
        subjectId: "s-failed-1",
        kind: "SNAPSHOT_OUTCOME",
        status: "FAILED",
        attemptCount: 1,
        createdAt: created(1),
      },
    ]);

    const r = await drainPendingSnapshotOutcomes(db as never, { take: 50 });

    expect(work.claimed[0]).toEqual(["s-failed-1"]);
    expect(pickIdsQueried[0]).toEqual(["s-failed-1"]);
    expect(r.attempted).toBe(1);
    expect(snapshotMocks.recordPickSettlementSnapshot).toHaveBeenCalledTimes(1);
  });

  it("never re-selects a FAILED row at or over the cap, while still draining one under it", async () => {
    const { db, work, pickIdsQueried } = makeDb([
      {
        subjectId: "s-under-cap",
        kind: "SNAPSHOT_OUTCOME",
        status: "FAILED",
        attemptCount: POST_SETTLEMENT_WORK_MAX_ATTEMPTS - 1,
        createdAt: created(1),
      },
      {
        subjectId: "s-at-cap",
        kind: "SNAPSHOT_OUTCOME",
        status: "FAILED",
        attemptCount: POST_SETTLEMENT_WORK_MAX_ATTEMPTS,
        createdAt: created(2),
      },
      {
        subjectId: "s-over-cap",
        kind: "SNAPSHOT_OUTCOME",
        status: "FAILED",
        attemptCount: POST_SETTLEMENT_WORK_MAX_ATTEMPTS * 3,
        createdAt: created(3),
      },
    ]);

    const r = await drainPendingSnapshotOutcomes(db as never, { take: 50 });

    expect(work.claimed[0]).toEqual(["s-under-cap"]);
    expect(pickIdsQueried[0]).toEqual(["s-under-cap"]);
    expect(r.attempted).toBe(1);
  });
});

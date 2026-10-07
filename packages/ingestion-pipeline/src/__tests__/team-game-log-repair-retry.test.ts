import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * REGRESSION: PostSettlementWork FAILED was a terminal black hole.
 *
 * `markPostSettlementWorkFailed` writes `status: "FAILED"`, but this drain (and
 * its two siblings in apps/web/lib/settlement) selected `status: "PENDING"`
 * ONLY, while `attemptCount` was incremented on every failure and never read.
 * A single transient error during `settleGameLogs()` therefore abandoned that
 * game's team log permanently — no retry, no alert, no owner-visible queue.
 *
 * The drain now claims PENDING **or** FAILED-under-the-attempt-cap; a row at or
 * over `POST_SETTLEMENT_WORK_MAX_ATTEMPTS` is never re-selected again, which is
 * the terminal state (no schema change needed).
 *
 * The fake store below EVALUATES the `where` the drain sends. A canned findMany
 * return value would satisfy either predicate and prove nothing.
 */

const mocks = vi.hoisted(() => ({
  settleGameLogs: vi.fn<(args: unknown) => Promise<void>>(),
}));

vi.mock("@sports/data-ingestion", () => ({
  settleGameLogs: mocks.settleGameLogs,
}));

import { drainPendingTeamGameLogs } from "../team-game-log-repair.js";
import { POST_SETTLEMENT_WORK_MAX_ATTEMPTS } from "../post-settlement-work.js";

type WorkRow = {
  subjectId: string;
  kind: string;
  status: string;
  attemptCount: number;
  createdAt: Date;
};

type Leaf = { status?: string; attemptCount?: { lt?: number; gte?: number } };
type ClaimWhere = Leaf & { kind?: string; OR?: readonly Leaf[] };

function leafMatches(row: WorkRow, leaf: Leaf): boolean {
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

const T0 = new Date("2026-08-25T00:00:00.000Z");
const gates = { canPersistCanonicalHistory: true, minDataQualityForGameLog: 40 };

function makeDb(rows: WorkRow[]) {
  const claimed: string[][] = [];
  const gameIdsQueried: string[][] = [];
  const work = {
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
  const db = {
    postSettlementWork: work,
    game: {
      findMany: vi.fn(async (args: { where: { id: { in: string[] } } }) => {
        gameIdsQueried.push(args.where.id.in);
        return args.where.id.in.map((id) => ({
          id,
          homeTeamName: "BUF",
          awayTeamName: "KC",
          commenceTime: new Date("2026-08-20T18:00:00.000Z"),
          homeScore: 24,
          awayScore: 20,
          dataQualityScore: 90,
          sport: { key: "americanfootball_nfl" },
        }));
      }),
    },
    openingLine: { findUnique: vi.fn(async () => ({ spread: -3 })) },
  };
  return { db, work, claimed, gameIdsQueried };
}

function row(subjectId: string, status: string, attemptCount: number, order: number): WorkRow {
  return {
    subjectId,
    kind: "TEAM_GAME_LOG",
    status,
    attemptCount,
    createdAt: new Date(T0.getTime() + order * 60_000),
  };
}

beforeEach(() => {
  mocks.settleGameLogs.mockReset();
  mocks.settleGameLogs.mockResolvedValue(undefined);
});

describe("drainPendingTeamGameLogs — FAILED rows are retryable, not abandoned", () => {
  it("re-selects a FAILED row still under the attempt cap", async () => {
    const { db, claimed, gameIdsQueried } = makeDb([row("g-failed-2", "FAILED", 2, 1)]);

    const r = await drainPendingTeamGameLogs(db as never, gates, { take: 50 });

    expect(claimed[0]).toEqual(["g-failed-2"]);
    expect(gameIdsQueried[0]).toEqual(["g-failed-2"]);
    // and it is actually worked, not merely listed
    expect(r).toEqual({ attempted: 1, done: 1, failed: 0 });
    expect(mocks.settleGameLogs).toHaveBeenCalledTimes(1);
  });

  it("never re-selects a FAILED row at or over the cap, while still draining one under it", async () => {
    const { db, claimed, gameIdsQueried } = makeDb([
      row("g-under-cap", "FAILED", POST_SETTLEMENT_WORK_MAX_ATTEMPTS - 1, 1),
      row("g-at-cap", "FAILED", POST_SETTLEMENT_WORK_MAX_ATTEMPTS, 2),
      row("g-over-cap", "FAILED", POST_SETTLEMENT_WORK_MAX_ATTEMPTS + 11, 3),
    ]);

    const r = await drainPendingTeamGameLogs(db as never, gates, { take: 50 });

    expect(claimed[0]).toEqual(["g-under-cap"]);
    expect(gameIdsQueried[0]).toEqual(["g-under-cap"]);
    expect(r).toEqual({ attempted: 1, done: 1, failed: 0 });
  });

  it("a row that fails its way to the cap stops being retried — the terminal state", async () => {
    // Walk one row through the full attempt budget the way production would:
    // every drain run fails, markPostSettlementWorkFailed bumps attemptCount.
    const live = row("g-poison", "PENDING", 0, 1);
    const { db, claimed } = makeDb([live]);
    mocks.settleGameLogs.mockRejectedValue(new Error("transient pg blip"));

    let runs = 0;
    for (let i = 0; i < POST_SETTLEMENT_WORK_MAX_ATTEMPTS + 3; i++) {
      const r = await drainPendingTeamGameLogs(db as never, gates, { take: 50 });
      if (r.attempted === 0) break;
      runs++;
      live.status = "FAILED";
      live.attemptCount += 1;
    }

    expect(runs).toBe(POST_SETTLEMENT_WORK_MAX_ATTEMPTS);
    expect(live.attemptCount).toBe(POST_SETTLEMENT_WORK_MAX_ATTEMPTS);
    // The last claim in the loop found nothing — the row is terminal.
    expect(claimed[claimed.length - 1]).toEqual([]);
  });

  it("claims PENDING and FAILED-under-cap together, in createdAt order, and ignores DONE and other kinds", async () => {
    // PENDING claiming is strictly additive — it must keep working — but the
    // FAILED row alongside it has to come through in the same drain pass.
    const { db, claimed } = makeDb([
      row("g-pending", "PENDING", 0, 1),
      row("g-failed-1", "FAILED", 1, 2),
      row("g-done", "DONE", 1, 3),
      { ...row("g-other", "PENDING", 0, 4), kind: "CLV_GRADE" },
    ]);

    await drainPendingTeamGameLogs(db as never, gates, { take: 50 });

    expect(claimed[0]).toEqual(["g-pending", "g-failed-1"]);
  });
});

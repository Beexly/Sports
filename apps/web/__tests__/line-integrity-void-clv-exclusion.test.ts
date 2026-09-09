import { describe, expect, it } from "vitest";
import { loadPublicClvPolicy } from "@/lib/performance/public-clv-policy";
import { drainPendingClvGrades } from "@/lib/settlement/free-path-clv";
import { voidDefectiveSettledPicks, type LineIntegrityDb, type LineIntegrityPickRow } from "@/lib/settlement/line-integrity-lane";

/**
 * C-278 (ledger C-197 / C-282 / C-277; Devin Review #733 round 4).
 *
 * A withdrawn (VOID) pick must not carry a public CLV claim. CLV is a statement
 * about a bet that stood; "we beat the close" on a pick we retracted is exactly
 * the unearned claim this product's premise forbids.
 *
 * Three independent places have to agree, and this file pins all three: the
 * lane must not reopen CLV grading, the drain must not grade a VOID pick, and
 * the public policy must not count one that was graded before its withdrawal.
 *
 * No scores, win rates or product data below — pick states and lines only.
 */

describe("loadPublicClvPolicy excludes withdrawn picks", () => {
  it("every count filters out VOID, alongside the bootstrap/published rules", async () => {
    const wheres: Array<Record<string, unknown>> = [];
    const db = {
      pick: {
        count: async (args: { where: Record<string, unknown> }) => {
          wheres.push(args.where);
          return 0;
        },
      },
    };
    await loadPublicClvPolicy(db, { canExposePerformanceStats: true, minGradedForPublic: 10 });
    expect(wheres).toHaveLength(4);
    for (const w of wheres) {
      expect(w).toMatchObject({
        isBootstrap: false,
        isPublished: true,
        result: { not: "VOID" },
      });
    }
  });
});

describe("drainPendingClvGrades never grades a withdrawn pick", () => {
  /**
   * Models the real queue: work rows carry a status, the drain takes the
   * OLDEST `take` PENDING ones, and a row only leaves the queue when something
   * writes a terminal status to it. That is what makes the starvation visible.
   */
  function drainDb(picks: Array<{ id: string; result: string }>) {
    const updates: Array<Record<string, unknown>> = [];
    let selection: Record<string, unknown> = {};
    const queue = picks.map((p) => ({ subjectId: p.id, kind: "CLV_GRADE", status: "PENDING" }));
    const db = {
      odds: { findMany: async () => [] },
      pick: {
        update: async (args: Record<string, unknown>) => {
          updates.push(args);
          return {};
        },
        findMany: async (args: { where: Record<string, unknown> }) => {
          selection = args.where;
          const ids = (args.where["id"] as { in: string[] }).in;
          return picks
            .filter((p) => ids.includes(p.id))
            .map((p) => ({
              id: p.id,
              result: p.result,
              pickType: "SPREAD",
              selection: "Fixture Home Bears -3.5",
              clvLockLine: -3.5,
              clvLockPrice: null,
              game: {
                id: "game-1",
                homeTeamName: "Fixture Home Bears",
                awayTeamName: "Fixture Away Hawks",
                commenceTime: new Date("2026-09-01T20:00:00Z"),
              },
            }));
        },
      },
      postSettlementWork: {
        findMany: async (args: { take: number }) =>
          queue.filter((w) => w.status === "PENDING").slice(0, args.take).map((w) => ({ subjectId: w.subjectId })),
        createMany: async () => ({ count: 0 }),
        updateMany: async (args: { where: { subjectId: string }; data: { status?: string } }) => {
          const row = queue.find((w) => w.subjectId === args.where.subjectId);
          if (row && typeof args.data.status === "string") row.status = args.data.status;
          return { count: row ? 1 : 0 };
        },
      },
    };
    return { db, updates, selection: () => selection, queue };
  }

  it("loads the selected subjects WITH their result and partitions in code", async () => {
    // Filtering VOID out in SQL was the round-4 fix and it starved the queue
    // (round 7): the row was skipped but never retired, so it was re-selected
    // forever. The query must not filter on result at all.
    const h = drainDb([{ id: "p1", result: "LOSS" }]);
    await drainPendingClvGrades(h.db as never, { take: 10 });
    expect(h.selection()["result"]).toBeUndefined();
    expect(h.selection()["id"]).toEqual({ in: ["p1"] });
  });

  it("a VOID pick is not attempted, so no fresh verdict is minted", async () => {
    const h = drainDb([{ id: "voided", result: "VOID" }]);
    const out = await drainPendingClvGrades(h.db as never, { take: 10 });
    expect(out.graded).toBe(0);
    expect(h.updates).toHaveLength(0);
  });

  it("RETIRES the withdrawn work row so it leaves the queue", async () => {
    const h = drainDb([{ id: "voided", result: "VOID" }]);
    const out = await drainPendingClvGrades(h.db as never, { take: 10 });
    expect(out.retired).toBe(1);
    expect(h.queue[0]!.status).toBe("CANCELLED");
  });

  it("an all-VOID oldest batch no longer blocks the next batch", async () => {
    // take=2, and the two oldest are both withdrawn. Before the fix they were
    // re-selected every cycle and `valid` could never be reached.
    const h = drainDb([
      { id: "a-void", result: "VOID" },
      { id: "b-void", result: "VOID" },
      { id: "c-valid", result: "LOSS" },
    ]);
    const first = await drainPendingClvGrades(h.db as never, { take: 2 });
    expect(first.retired).toBe(2);
    expect(first.graded).toBe(0);

    // The liveness property: the second batch REACHES the valid pick, and its
    // work row leaves the queue. (It takes the no-close path here because the
    // fixture has no odds rows, so `pick.update` is not the artifact to assert.)
    const second = await drainPendingClvGrades(h.db as never, { take: 2 });
    expect(second.attempted).toBe(1);
    expect(second.retired).toBe(0);
    expect(h.queue.find((w) => w.subjectId === "c-valid")!.status).not.toBe("PENDING");
  });

  it("a mixed batch grades the valid picks AND retires the withdrawn work", async () => {
    const h = drainDb([
      { id: "a-void", result: "VOID" },
      { id: "b-valid", result: "WIN" },
    ]);
    const out = await drainPendingClvGrades(h.db as never, { take: 2 });
    expect(out.retired).toBe(1);
    expect(out.attempted).toBe(1);
    expect(h.queue.find((w) => w.subjectId === "a-void")!.status).toBe("CANCELLED");
    expect(h.queue.find((w) => w.subjectId === "b-valid")!.status).not.toBe("PENDING");
  });

  // ── C-286: a retirement that did not land must not be reported as one ──
  //
  // Retirement is best-effort by design (it must not abort a drain that is
  // otherwise progressing), and the first version turned that into a lie by
  // counting every attempt. A row whose cancellation threw or matched nothing
  // is still PENDING and still occupies the oldest batch next cycle — exactly
  // the starvation the retirement exists to end, now hidden behind a count
  // that said it was handled.
  it("does NOT count a retirement the database refused", async () => {
    const h = drainDb([{ id: "voided", result: "VOID" }]);
    // updateMany matches nothing (the work row is gone, or its status moved).
    h.db.postSettlementWork.updateMany = async () => ({ count: 0 });
    const out = await drainPendingClvGrades(h.db as never, { take: 10 });
    expect(out.retired).toBe(0);
    expect(out.retireFailed).toBe(1);
  });

  it("does NOT count one whose update threw, and keeps draining", async () => {
    const h = drainDb([
      { id: "a-void", result: "VOID" },
      { id: "b-valid", result: "WIN" },
    ]);
    const realUpdate = h.db.postSettlementWork.updateMany;
    h.db.postSettlementWork.updateMany = async (args: never) => {
      const a = args as unknown as { where: { subjectId: string } };
      if (a.where.subjectId === "a-void") throw new Error("connection reset");
      return realUpdate(args as never);
    };
    const out = await drainPendingClvGrades(h.db as never, { take: 10 });
    expect(out.retired).toBe(0);
    expect(out.retireFailed).toBe(1);
    // The failed retirement does not stop the valid pick being worked.
    expect(out.attempted).toBe(1);
    // And it stays PENDING, which is the honest state — it really was not
    // retired, so the next cycle must see it again.
    expect(h.queue.find((w) => w.subjectId === "a-void")!.status).toBe("PENDING");
  });

  it("a confirmed retirement is still counted as one", async () => {
    const h = drainDb([{ id: "voided", result: "VOID" }]);
    const out = await drainPendingClvGrades(h.db as never, { take: 10 });
    expect(out.retired).toBe(1);
    expect(out.retireFailed).toBe(0);
  });

  it("a still-PENDING pick is left in the queue, not retired", async () => {
    const h = drainDb([{ id: "waiting", result: "PENDING" }]);
    const out = await drainPendingClvGrades(h.db as never, { take: 10 });
    expect(out.retired).toBe(0);
    expect(h.queue[0]!.status).toBe("PENDING");
  });
});

describe("the void lane does not reopen CLV grading", () => {
  const PUBLISH = new Date("2026-09-01T12:00:00Z");

  function laneDb(row: LineIntegrityPickRow) {
    const work: Array<Record<string, unknown>> = [];
    const db = {
      pick: {
        findMany: async () => [row],
        updateMany: async () => ({ count: 1 }),
      },
      odds: {
        findMany: async () => [
          { id: "o1", bookmaker: "a", fetchedAt: new Date("2026-09-01T09:00:00Z"), spread: -3, total: null },
          { id: "o2", bookmaker: "b", fetchedAt: new Date("2026-09-01T09:00:00Z"), spread: -3.5, total: null },
        ],
      },
      jarvisMemoryEvent: {
        create: async () => undefined,
        count: async () => 0,
        findMany: async () => [],
      },
      $transaction: async (fn: (tx: never) => Promise<{ count: number }>) =>
        fn({
          pick: { updateMany: async () => ({ count: 1 }) },
          pickSettlementEvent: {
            create: async () => {
              throw new Error("Unique constraint failed on the fields: (`pickId`)");
            },
          },
          jarvisMemoryEvent: { create: async () => undefined },
          pickSignalSnapshot: { updateMany: async () => ({ count: 1 }) },
          postSettlementWork: {
            createMany: async (q: Record<string, unknown>) => {
              work.push({ op: "createMany", ...q });
              return { count: 1 };
            },
            updateMany: async (q: Record<string, unknown>) => {
              work.push({ op: "updateMany", ...q });
              return { count: 1 };
            },
          },
        } as never),
    };
    return { db: db as unknown as LineIntegrityDb, work };
  }

  const row: LineIntegrityPickRow = {
    id: "pick-1",
    gameId: "game-1",
    pickType: "SPREAD",
    selection: "Fixture Home Bears -3.2",
    line: -3.25,
    clvLockLine: -3.25,
    proofReceipt: null,
    result: "LOSS",
    settledAt: new Date("2026-09-01T23:00:00Z"),
    isPublished: true,
    generatedAt: PUBLISH,
    modelVersion: "v5.2.7",
    game: { id: "game-1", sport: { key: "americanfootball_nfl" } },
  };

  it("touches SNAPSHOT_OUTCOME and never CLV_GRADE", async () => {
    const h = laneDb(row);
    const half = await voidDefectiveSettledPicks({ db: h.db, enabled: true, now: PUBLISH });
    expect(half.acted).toBe(1);

    const kinds = h.work.flatMap((w) => {
      const data = w["data"];
      if (Array.isArray(data)) return (data as Array<{ kind: string }>).map((d) => d.kind);
      const where = w["where"] as { kind?: string } | undefined;
      return where?.kind ? [where.kind] : [];
    });
    expect(kinds.length).toBeGreaterThan(0);
    expect(kinds).toContain("SNAPSHOT_OUTCOME");
    // The withdrawn pick keeps its historical verdict; it is filtered out of
    // public samples, never re-graded into a new one.
    expect(kinds).not.toContain("CLV_GRADE");
  });
});

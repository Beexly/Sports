import { describe, expect, it } from "vitest";
import { loadPublicClvPolicy } from "@/lib/performance/public-clv-policy";
import { drainPendingClvGrades } from "@/lib/settlement/free-path-clv";
import { voidDefectiveSettledPicks, type LineIntegrityDb, type LineIntegrityPickRow } from "@/lib/settlement/line-integrity-lane";

/**
 * C-278 (ledger C-197 / C-271 / C-277; Devin Review #733 round 4).
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
  function drainDb(picks: Array<{ id: string; result: string }>) {
    const updates: Array<Record<string, unknown>> = [];
    let selection: Record<string, unknown> = {};
    const db = {
      odds: { findMany: async () => [] },
      pick: {
        update: async (args: Record<string, unknown>) => {
          updates.push(args);
          return {};
        },
        findMany: async (args: { where: Record<string, unknown> }) => {
          selection = args.where;
          const filter = args.where["result"] as { notIn?: string[] } | undefined;
          const blocked = filter?.notIn ?? [];
          return picks
            .filter((p) => !blocked.includes(p.result))
            .map((p) => ({
              id: p.id,
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
        findMany: async () => picks.map((p) => ({ subjectId: p.id })),
        createMany: async () => ({ count: 0 }),
        updateMany: async () => ({ count: 1 }),
      },
    };
    return { db, updates, selection: () => selection };
  }

  it("asks the database to exclude PENDING and VOID", async () => {
    const h = drainDb([{ id: "p1", result: "LOSS" }]);
    await drainPendingClvGrades(h.db as never, { take: 10 });
    expect(h.selection()["result"]).toEqual({ notIn: ["PENDING", "VOID"] });
  });

  it("a VOID pick is not attempted, so no fresh verdict is minted", async () => {
    const h = drainDb([{ id: "voided", result: "VOID" }]);
    const out = await drainPendingClvGrades(h.db as never, { take: 10 });
    expect(out.graded).toBe(0);
    expect(h.updates).toHaveLength(0);
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

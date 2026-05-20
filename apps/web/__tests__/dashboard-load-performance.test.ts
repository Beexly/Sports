import { describe, it, expect } from "vitest";
import {
  loadDashboardPerformance,
  type DashboardLoaderDb,
  type DashboardRecentPick,
} from "@/lib/dashboard/load-performance";

const NOW = new Date("2026-05-18T12:00:00Z");

function mockDb(opts: {
  recentPicks?: DashboardRecentPick[];
  counts: Partial<Record<string, number>>;
}): { db: DashboardLoaderDb; calls: { where: Record<string, unknown> }[] } {
  const calls: { where: Record<string, unknown> }[] = [];
  // Sequence of count() calls per loadDashboardPerformance:
  //  0: canonicalSettledCount
  //  1: canonicalWins
  //  2: canonicalLosses
  //  3: canonicalPushes
  //  4: canonicalPending
  //  5: bootstrapSettled
  //  6: recentTotal
  //  7: recentBootstrap
  const keys = [
    "canonicalSettled",
    "canonicalWins",
    "canonicalLosses",
    "canonicalPushes",
    "canonicalPending",
    "bootstrapSettled",
    "recentTotal",
    "recentBootstrap",
  ] as const;
  let idx = 0;

  const db: DashboardLoaderDb = {
    pick: {
      findMany: async ({ where }) => {
        calls.push({ where });
        return opts.recentPicks ?? [];
      },
      count: async ({ where }) => {
        calls.push({ where });
        const k = keys[idx++];
        return opts.counts[k as string] ?? 0;
      },
    },
  };
  return { db, calls };
}

describe("loadDashboardPerformance defaults", () => {
  it("default window is 14 days when recentWindowDays is unspecified", async () => {
    const { db, calls } = mockDb({ counts: {} });
    await loadDashboardPerformance(db, {
      canExposePerformanceStats: true,
      minSettledPicksForLearning: 25,
      now: NOW,
      // recentWindowDays intentionally omitted
    });
    // The first call is findMany — its where.generatedAt.gte should be
    // 14 days before NOW (within a tolerance of milliseconds).
    const where = calls[0]?.where as {
      generatedAt?: { gte?: Date };
    };
    const since = where.generatedAt?.gte;
    expect(since).toBeInstanceOf(Date);
    const diffMs = NOW.getTime() - (since as Date).getTime();
    const diffDays = diffMs / (24 * 60 * 60 * 1000);
    expect(Math.round(diffDays)).toBe(14);
  });
});

describe("loadDashboardPerformance", () => {
  it("computes a blocked policy when canonicalSettled < min", async () => {
    const { db } = mockDb({
      counts: {
        canonicalSettled: 5,
        canonicalWins: 3,
        canonicalLosses: 2,
        canonicalPushes: 0,
        canonicalPending: 1,
        bootstrapSettled: 2,
        recentTotal: 4,
        recentBootstrap: 1,
      },
    });
    const result = await loadDashboardPerformance(db, {
      canExposePerformanceStats: true,
      minSettledPicksForLearning: 25,
      now: NOW,
    });
    expect(result.policy.canExposePerformanceStats).toBe(false);
    expect(result.policy.primaryReason).toBe("INSUFFICIENT_CANONICAL_SAMPLE");
    expect(result.policy.publicWinRate).toBeNull();
  });

  it("computes an allowed policy when sample is sufficient and gate is open", async () => {
    const { db } = mockDb({
      counts: {
        canonicalSettled: 100,
        canonicalWins: 55,
        canonicalLosses: 40,
        canonicalPushes: 5,
        canonicalPending: 0,
        bootstrapSettled: 0,
        recentTotal: 20,
        recentBootstrap: 0,
      },
    });
    const result = await loadDashboardPerformance(db, {
      canExposePerformanceStats: true,
      minSettledPicksForLearning: 25,
      now: NOW,
    });
    expect(result.policy.canExposePerformanceStats).toBe(true);
    expect(result.policy.publicWinRate).toBe(57.9);
  });

  it("always blocks when the readiness gate is off, regardless of sample size", async () => {
    const { db } = mockDb({
      counts: {
        canonicalSettled: 9999,
        canonicalWins: 9000,
        canonicalLosses: 100,
        canonicalPushes: 0,
      },
    });
    const result = await loadDashboardPerformance(db, {
      canExposePerformanceStats: false,
      minSettledPicksForLearning: 25,
      now: NOW,
    });
    expect(result.policy.canExposePerformanceStats).toBe(false);
    expect(result.policy.primaryReason).toBe("GATE_OFF_PERFORMANCE_STATS");
  });

  it("never filters bootstrap out of recentPicks (UI tags them; policy excludes them)", async () => {
    const bootstrapRow: DashboardRecentPick = {
      id: "p1",
      selection: "Chiefs -3.5",
      pickType: "SPREAD" as never,
      confidence: 70,
      result: "WIN" as never,
      generatedAt: new Date(NOW.getTime() - 60 * 60 * 1000),
      isBootstrap: true,
      game: { homeTeamName: "KC", awayTeamName: "BUF", sport: { name: "NFL" } },
    };
    const { db, calls } = mockDb({
      recentPicks: [bootstrapRow],
      counts: { canonicalSettled: 0 },
    });
    const result = await loadDashboardPerformance(db, {
      canExposePerformanceStats: true,
      minSettledPicksForLearning: 25,
      now: NOW,
    });
    expect(result.recentPicks).toHaveLength(1);
    // First call is findMany — verify the where clause does not filter bootstrap.
    const findManyWhere = calls[0]?.where;
    expect(findManyWhere && "isBootstrap" in (findManyWhere as Record<string, unknown>)).toBe(false);
  });
});

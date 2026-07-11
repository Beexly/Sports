import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * /api/picks/daily-slate — recentRecord honesty (adversarial finding
 * T-daily-slate).
 *
 * The route once returned a HARDCODED {wins:0, losses:0, pushes:0} whenever
 * the performance gate was open — a fabricated record on a public surface
 * (non-negotiable #2: no fabricated stats). These pins prove the record is
 * now REAL (grouped from settled picks under the official filter) and is
 * WITHHELD — never invented — when the window is empty or the query fails.
 */

const dbMocks = vi.hoisted(() => ({
  pickCount: vi.fn<(args: unknown) => Promise<number>>(),
  pickFindMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
  pickGroupBy: vi.fn<(args: unknown) => Promise<unknown[]>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    pick: {
      count: dbMocks.pickCount,
      findMany: dbMocks.pickFindMany,
      groupBy: dbMocks.pickGroupBy,
    },
  },
  isStubMode: () => false,
  isDemoPicksEnabled: () => false,
  getSamplePicks: () => [],
}));

vi.mock("@sports/prediction-engine", () => ({
  getReadinessGates: () => ({
    canExposePerformanceStats: true, // the gate is OPEN in every case here
    forceNoBetIfStale: false,
  }),
}));

async function callGet(): Promise<Record<string, unknown>> {
  const mod = await import("@/app/api/picks/daily-slate/route");
  const res = (await mod.GET()) as unknown as Response;
  const body = (await res.json()) as { data: Record<string, unknown> };
  return body.data;
}

describe("/api/picks/daily-slate — recentRecord is real or withheld, never fabricated", () => {
  beforeEach(() => {
    dbMocks.pickCount.mockReset().mockResolvedValue(0);
    dbMocks.pickFindMany.mockReset().mockResolvedValue([]);
    dbMocks.pickGroupBy.mockReset();
  });

  it("returns the REAL grouped 7-day record when settled picks exist", async () => {
    dbMocks.pickGroupBy.mockResolvedValue([
      { result: "WIN", _count: { _all: 9 } },
      { result: "LOSS", _count: { _all: 4 } },
      { result: "PUSH", _count: { _all: 1 } },
    ]);

    const data = await callGet();

    expect(data["recentRecord"]).toEqual({
      wins: 9,
      losses: 4,
      pushes: 1,
      period: "Last 7 days",
    });
    // The query rides the official filter and the settled window.
    expect(dbMocks.pickGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["result"],
        where: expect.objectContaining({
          isPublished: true,
          isBootstrap: false,
          result: { in: ["WIN", "LOSS", "PUSH"] },
          settledAt: { gte: expect.any(Date) },
        }),
      }),
    );
  });

  it("WITHHOLDS the record (null) when nothing settled in the window — no fabricated 0-0-0", async () => {
    dbMocks.pickGroupBy.mockResolvedValue([]);

    const data = await callGet();

    expect(data["recentRecord"]).toBeNull();
  });

  it("WITHHOLDS the record (null) when the query fails — an outage is never dressed as a record", async () => {
    dbMocks.pickGroupBy.mockRejectedValue(new Error("db down"));

    const data = await callGet();

    expect(data["recentRecord"]).toBeNull();
  });
});

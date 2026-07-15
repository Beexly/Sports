import { beforeEach, describe, expect, it, vi } from "vitest";

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
    canExposePerformanceStats: true,
    forceNoBetIfStale: false,
  }),
}));

async function callGet(): Promise<Record<string, unknown>> {
  const mod = await import("@/app/api/picks/daily-slate/route");
  const response = (await mod.GET()) as unknown as Response;
  const body = (await response.json()) as { data: Record<string, unknown> };
  return body.data;
}

describe("daily slate recent record", () => {
  beforeEach(() => {
    dbMocks.pickCount.mockReset().mockResolvedValue(0);
    dbMocks.pickFindMany.mockReset().mockResolvedValue([]);
    dbMocks.pickGroupBy.mockReset();
  });

  it("reports the canonical settled record for the last seven days", async () => {
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
    expect(dbMocks.pickGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["result"],
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              isPublished: true,
              isBootstrap: false,
            }),
            expect.objectContaining({ settledAt: { gte: expect.any(Date) } }),
          ]),
        }),
      })
    );
  });

  it("withholds an empty record", async () => {
    dbMocks.pickGroupBy.mockResolvedValue([]);

    const data = await callGet();

    expect(data["recentRecord"]).toBeNull();
  });

  it("withholds the record when the database query fails", async () => {
    dbMocks.pickGroupBy.mockRejectedValue(new Error("db down"));

    const data = await callGet();

    expect(data["recentRecord"]).toBeNull();
  });
});

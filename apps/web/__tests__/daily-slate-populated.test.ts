import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isStubMode: vi.fn<() => boolean>(),
  isDemoPicksEnabled: vi.fn<() => boolean>(),
  getSamplePicks: vi.fn<() => unknown[]>(),
  pickCount: vi.fn<(args: unknown) => Promise<number>>(),
  pickFindMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
  pickGroupBy: vi.fn<(args: unknown) => Promise<unknown[]>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    pick: {
      count: mocks.pickCount,
      findMany: mocks.pickFindMany,
      groupBy: mocks.pickGroupBy,
    },
  },
  isStubMode: mocks.isStubMode,
  isDemoPicksEnabled: mocks.isDemoPicksEnabled,
  getSamplePicks: mocks.getSamplePicks,
}));

vi.mock("@sports/prediction-engine", () => ({
  getReadinessGates: () => ({
    canExposePerformanceStats: false,
    forceNoBetIfStale: false,
  }),
}));

vi.mock("@/lib/data-reliability/public-freshness-gate", () => ({
  getFreshPublicOddsSportKeys: async () => new Set<string>(),
  isPublicPicksSurfaceStale: async () => false,
}));

import { GET } from "@/app/api/picks/daily-slate/route";
import { MIN_PUBLIC_PICK_DATA_QUALITY_SCORE } from "@/lib/public-picks-quality";

async function loadSlate(): Promise<Record<string, unknown>> {
  const response = (await GET()) as Response;
  const body = (await response.json()) as { data: Record<string, unknown> };
  return body.data;
}

describe("daily slate populated data", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.isStubMode.mockReturnValue(false);
    mocks.isDemoPicksEnabled.mockReturnValue(false);
    mocks.getSamplePicks.mockReturnValue([]);
    mocks.pickGroupBy.mockResolvedValue([]);
  });

  it("derives counts, games, and sport breakdown from stored picks", async () => {
    mocks.pickCount.mockImplementation(async (args) => {
      const where = (args as { where: Record<string, unknown> }).where;
      return where["tier"] === "FREE" ? 1 : 3;
    });
    mocks.pickFindMany.mockResolvedValue([
      { gameId: "game-1", game: { sport: { name: "NFL" } } },
      { gameId: "game-1", game: { sport: { name: "NFL" } } },
      { gameId: "game-2", game: { sport: { name: "MLB" } } },
    ]);

    const data = await loadSlate();

    expect(data).toMatchObject({
      totalPicks: 3,
      freePickCount: 1,
      premiumPickCount: 2,
      totalGames: 2,
      sportBreakdown: [
        { sport: "NFL", pickCount: 2 },
        { sport: "MLB", pickCount: 1 },
      ],
      isSampleData: false,
    });
    const requiredWhere = expect.objectContaining({
      isPublished: true,
      result: "PENDING",
      isBootstrap: false,
      game: { dataQualityScore: { gte: MIN_PUBLIC_PICK_DATA_QUALITY_SCORE } },
    });
    expect(mocks.pickCount).toHaveBeenCalledWith({ where: requiredWhere });
    expect(mocks.pickFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: requiredWhere })
    );
  });

  it("uses samples as the only source of demo counts", async () => {
    mocks.isStubMode.mockReturnValue(true);
    mocks.isDemoPicksEnabled.mockReturnValue(true);
    mocks.pickCount.mockResolvedValue(0);
    mocks.getSamplePicks.mockReturnValue([
      { gameId: "sample-1", tier: "FREE", game: { sport: { name: "NFL" } } },
      { gameId: "sample-2", tier: "PRO", game: { sport: { name: "MLB" } } },
    ]);

    const data = await loadSlate();

    expect(data).toMatchObject({
      totalPicks: 2,
      freePickCount: 1,
      premiumPickCount: 1,
      totalGames: 2,
      isSampleData: true,
    });
  });
});

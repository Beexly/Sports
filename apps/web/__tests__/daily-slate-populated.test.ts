/**
 * O-6 — non-vacuous daily-slate test. The stub-mode route test asserts zeroed
 * counts the stub returns unconditionally; this one feeds a POPULATED db mock
 * and pins that the counts, premium math, distinct-game derivation, and sport
 * breakdown actually flow from the data (a broken baseWhere or aggregation
 * now fails instead of passing on stub emptiness).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isStubMode: vi.fn<() => boolean>(),
  isDemoPicksEnabled: vi.fn<() => boolean>(),
  pickCount: vi.fn<(args: unknown) => Promise<number>>(),
  pickFindMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
  getSamplePicks: vi.fn<() => unknown[]>(),
}));

vi.mock("@sports/db", () => ({
  db: { pick: { count: mocks.pickCount, findMany: mocks.pickFindMany } },
  isStubMode: mocks.isStubMode,
  isDemoPicksEnabled: mocks.isDemoPicksEnabled,
  getSamplePicks: mocks.getSamplePicks,
}));

vi.mock("@/lib/data-reliability/public-freshness-gate", () => ({
  isPublicPicksSurfaceStale: async () => false,
}));

import { GET } from "@/app/api/picks/daily-slate/route";
import { MIN_PUBLIC_PICK_DATA_QUALITY_SCORE } from "@/lib/public-picks-quality";

/** The published-slate filter every count on this surface must carry. */
const BASE_WHERE = expect.objectContaining({
  isPublished: true,
  result: "PENDING",
  isBootstrap: false,
  game: { dataQualityScore: { gte: MIN_PUBLIC_PICK_DATA_QUALITY_SCORE } },
});

beforeEach(() => {
  for (const m of Object.values(mocks)) m.mockReset();
  mocks.isStubMode.mockReturnValue(false);
  mocks.isDemoPicksEnabled.mockReturnValue(false);
  mocks.getSamplePicks.mockReturnValue([]);
  delete process.env["FORCE_NO_BET_IF_STALE"];
});

describe("daily slate with a POPULATED db (O-6)", () => {
  it("derives every count from the data — totals, premium math, games, breakdown", async () => {
    // 3 published PENDING picks: two on game-1 (NFL), one on game-2 (MLB).
    mocks.pickCount.mockImplementation(async (args) => {
      const where = (args as { where: Record<string, unknown> }).where;
      return where["tier"] === "FREE" ? 1 : 3;
    });
    mocks.pickFindMany.mockResolvedValue([
      { gameId: "game-1", game: { sport: { name: "NFL" } } },
      { gameId: "game-1", game: { sport: { name: "NFL" } } },
      { gameId: "game-2", game: { sport: { name: "MLB" } } },
    ]);

    const res = (await GET()) as Response;
    const body = (await res.json()) as { data: Record<string, unknown> };

    expect(res.status).toBe(200);
    expect(body.data["totalPicks"]).toBe(3);
    expect(body.data["freePickCount"]).toBe(1);
    expect(body.data["premiumPickCount"]).toBe(2); // total − free, from DATA
    expect(body.data["totalGames"]).toBe(2); // distinct gameIds
    expect(body.data["sportBreakdown"]).toEqual([
      { sport: "NFL", pickCount: 2 },
      { sport: "MLB", pickCount: 1 },
    ]);
    expect(body.data["isSampleData"]).toBe(false);

    // The counts are only meaningful UNDER the published-slate filter — pin
    // the exact predicate on every query so a dropped isPublished/result/
    // isBootstrap/data-quality clause fails here (Codex round on O-6).
    expect(mocks.pickCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: BASE_WHERE }),
    );
    expect(mocks.pickCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isPublished: true, result: "PENDING", isBootstrap: false, tier: "FREE" }),
      }),
    );
    expect(mocks.pickFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: BASE_WHERE }),
    );
  });

  it("demo mode derives EVERY count from the samples — internally consistent", async () => {
    mocks.isStubMode.mockReturnValue(true);
    mocks.isDemoPicksEnabled.mockReturnValue(true);
    mocks.pickCount.mockResolvedValue(0); // stub reality: DB counts are empty
    mocks.getSamplePicks.mockReturnValue([
      { gameId: "s-1", tier: "FREE", game: { sport: { name: "NFL" } } },
      { gameId: "s-2", tier: "PRO", game: { sport: { name: "MLB" } } },
    ]);

    const res = (await GET()) as Response;
    const body = (await res.json()) as {
      data: Record<string, unknown>;
      meta: Record<string, unknown>;
    };

    expect(body.meta["isSampleData"]).toBe(true);
    expect(body.data["isSampleData"]).toBe(true);
    // ONE source of truth (the samples): totals, free, premium, and games all
    // agree — the route previously published totalPicks 0 beside free 1
    // because totalPicks came from the stub DB count (Codex round on O-6).
    expect(body.data["totalPicks"]).toBe(2);
    expect(body.data["freePickCount"]).toBe(1);
    expect(body.data["premiumPickCount"]).toBe(1); // total − free
    expect(body.data["totalGames"]).toBe(2);
  });
});

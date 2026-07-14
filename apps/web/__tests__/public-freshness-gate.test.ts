import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("@sports/db", () => ({
  db: { ingestionRun: { findMany: mocks.findMany } },
}));

import { getFreshPublicOddsSportKeys } from "@/lib/data-reliability/public-freshness-gate";

const NOW = new Date("2026-07-14T16:00:00.000Z");

describe("getFreshPublicOddsSportKeys", () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
  });

  it("returns only sports whose latest odds-inserting run is inside the SLA", async () => {
    mocks.findMany.mockResolvedValue([
      { sport: "americanfootball_nfl", completedAt: new Date("2026-07-14T15:30:00.000Z") },
      { sport: "basketball_nba", completedAt: new Date("2026-07-14T10:00:00.000Z") },
      { sport: null, completedAt: new Date("2026-07-14T15:45:00.000Z") },
    ]);

    const result = await getFreshPublicOddsSportKeys(NOW);

    expect([...result]).toEqual(["americanfootball_nfl"]);
    expect(mocks.findMany).toHaveBeenCalledWith({
      where: { status: "SUCCESS", oddsInserted: { gt: 0 }, sport: { not: null } },
      orderBy: { completedAt: "desc" },
      distinct: ["sport"],
      select: { sport: true, completedAt: true },
    });
  });

  it("treats a missing completion timestamp as stale", async () => {
    mocks.findMany.mockResolvedValue([{ sport: "baseball_mlb", completedAt: null }]);

    await expect(getFreshPublicOddsSportKeys(NOW)).resolves.toEqual(new Set());
  });
});

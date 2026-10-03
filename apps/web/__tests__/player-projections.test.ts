import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 2026 projection loader: aggregates PlayerGameStat into per-player season lines,
 * projects with the real prediction-engine method, and reports the backtest.
 * Only the DB is mocked.
 */

const mocks = vi.hoisted(() => ({ groupBy: vi.fn(), playerFindMany: vi.fn() }));
vi.mock("@sports/db", () => ({ db: {
  playerGameStat: { groupBy: mocks.groupBy },
  player: { findMany: mocks.playerFindMany },
} }));

import { loadPlayerProjections } from "@/lib/projections/player-projections";

beforeEach(() => {
  mocks.groupBy.mockReset();
  mocks.playerFindMany.mockReset();
  mocks.playerFindMany.mockResolvedValue([{ id: "p1", fullName: "Alpha", position: "RB", recentTeam: "KC" }]);
});

describe("loadPlayerProjections", () => {
  it("aggregates per-player seasons, projects, joins names, and reports the backtest", async () => {
    mocks.groupBy.mockResolvedValue([
      { playerId: "p1", season: 2023, _count: { _all: 16 }, _avg: { fantasyPointsPpr: 18 } },
      { playerId: "p1", season: 2022, _count: { _all: 16 }, _avg: { fantasyPointsPpr: 12 } },
      { playerId: "p2", season: 2023, _count: { _all: 10 }, _avg: { fantasyPointsPpr: 8 } },
    ]);

    const r = await loadPlayerProjections(2024);

    expect(r.status).toBe("ok");
    expect(r.playerCount).toBe(2);
    expect(r.top[0]!.name).toBe("Alpha"); // p1 has the higher projection
    expect(r.top[0]!.position).toBe("RB");
    expect(r.top[0]!.team).toBe("KC");
    expect(r.top[1]!.name).toBe("p2"); // not in the player table → falls back to id
    expect(r.top[0]!.projectedPprPerGame).toBeGreaterThan(r.top[1]!.projectedPprPerGame);
    // p1 has two seasons → exactly one projectable backtest point; p2 has one season → none.
    expect(r.backtest.sampleSize).toBe(1);
  });

  it("skips season rows with a null PPR average", async () => {
    mocks.groupBy.mockResolvedValue([
      { playerId: "p1", season: 2023, _count: { _all: 16 }, _avg: { fantasyPointsPpr: null } },
    ]);
    expect((await loadPlayerProjections(2024)).status).toBe("no-data");
  });

  it("returns no-data when nothing is loaded, and is stub-safe on null", async () => {
    mocks.groupBy.mockResolvedValue([]);
    expect((await loadPlayerProjections(2024)).status).toBe("no-data");
    mocks.groupBy.mockResolvedValue(null);
    expect((await loadPlayerProjections(2024)).status).toBe("no-data");
  });
});

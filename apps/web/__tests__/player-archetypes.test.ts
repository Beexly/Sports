import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Player archetypes loader: aggregates PlayerGameStat usage and classifies role
 * via the real engine. Only the DB is mocked.
 */

const mocks = vi.hoisted(() => ({ groupBy: vi.fn(), playerFindMany: vi.fn() }));
vi.mock("@sports/db", () => ({ db: {
  playerGameStat: { groupBy: mocks.groupBy },
  player: { findMany: mocks.playerFindMany },
} }));

import { loadPlayerArchetypes } from "@/lib/intelligence/player-archetypes";

beforeEach(() => {
  mocks.groupBy.mockReset();
  mocks.playerFindMany.mockResolvedValue([
    { id: "rb1", fullName: "Power Back", position: "RB", recentTeam: "KC" },
    { id: "rb2", fullName: "Pass Catcher", position: "RB", recentTeam: "SF" },
  ]);
});

describe("loadPlayerArchetypes", () => {
  it("classifies roles from usage and ranks by workload", async () => {
    mocks.groupBy.mockResolvedValue([
      { playerId: "rb1", _count: { _all: 16 }, _sum: { carries: 280, receptions: 20, targets: 25, rushingYards: 1200, receivingYards: 150 } },
      { playerId: "rb2", _count: { _all: 16 }, _sum: { carries: 70, receptions: 75, targets: 95, rushingYards: 320, receivingYards: 650 } },
    ]);
    const r = await loadPlayerArchetypes(2024);
    expect(r.status).toBe("ok");
    expect(r.playerCount).toBe(2);
    expect(r.players[0]!.name).toBe("Power Back"); // higher touches/game ranks first
    const rb1 = r.players.find((p) => p.playerId === "rb1")!;
    const rb2 = r.players.find((p) => p.playerId === "rb2")!;
    expect(rb1.archetype).toBe("early-down/power");
    expect(rb2.archetype).toBe("receiving");
  });

  it("skips no-touch players", async () => {
    mocks.groupBy.mockResolvedValue([
      { playerId: "rb1", _count: { _all: 4 }, _sum: { carries: 0, receptions: 0, targets: 0, rushingYards: 0, receivingYards: 0 } },
    ]);
    const r = await loadPlayerArchetypes(2024);
    expect(r.playerCount).toBe(0);
  });

  it("returns no-data when empty, and is stub-safe on null", async () => {
    mocks.groupBy.mockResolvedValue([]);
    expect((await loadPlayerArchetypes(2024)).status).toBe("no-data");
    mocks.groupBy.mockResolvedValue(null);
    expect((await loadPlayerArchetypes(2024)).status).toBe("no-data");
  });
});

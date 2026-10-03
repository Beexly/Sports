import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Player movers loader: recent N-game form vs season baseline. Only the DB is
 * mocked; the form math is exercised directly.
 */

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), playerFindMany: vi.fn() }));
vi.mock("@sports/db", () => ({ db: {
  playerGameStat: { findMany: mocks.findMany },
  player: { findMany: mocks.playerFindMany },
} }));

import { loadPlayerMovers } from "@/lib/intelligence/player-movers";

function weeks(playerId: string, ppr: number[]): Array<{ playerId: string; week: number; fantasyPointsPpr: number }> {
  return ppr.map((v, i) => ({ playerId, week: i + 1, fantasyPointsPpr: v }));
}

beforeEach(() => {
  mocks.findMany.mockReset();
  mocks.playerFindMany.mockReset().mockResolvedValue([
    { id: "p1", fullName: "Riser", position: "RB", recentTeam: "KC" },
    { id: "p2", fullName: "Faller", position: "WR", recentTeam: "SF" },
  ]);
});

describe("loadPlayerMovers", () => {
  it("ranks risers and fallers by recent form vs season, skipping thin samples", async () => {
    mocks.findMany.mockResolvedValue([
      ...weeks("p1", [5, 5, 5, 20, 20, 20]), // recent 4 hot vs season → heating
      ...weeks("p2", [20, 20, 20, 5, 5, 5]), // recent 4 cold vs season → cooling
      ...weeks("p3", [10, 10, 10]), // only 3 games (< recentN+1) → skipped
    ]);

    const r = await loadPlayerMovers(2024, 4);
    expect(r.status).toBe("ok");
    expect(r.qualified).toBe(2);
    expect(r.risers[0]!.name).toBe("Riser");
    expect(r.risers[0]!.trend).toBe("heating");
    expect(r.risers[0]!.delta).toBeGreaterThan(0);
    expect(r.fallers[0]!.name).toBe("Faller");
    expect(r.fallers[0]!.trend).toBe("cooling");
    expect(r.fallers[0]!.delta).toBeLessThan(0);
  });

  it("returns no-data when empty, and is stub-safe on null", async () => {
    mocks.findMany.mockResolvedValue([]);
    expect((await loadPlayerMovers(2024)).status).toBe("no-data");
    mocks.findMany.mockResolvedValue(null);
    expect((await loadPlayerMovers(2024)).status).toBe("no-data");
  });
});

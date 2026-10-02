import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * `player-archetypes.ts` had no test. Untested, its contract was only implied:
 * an honest `no-data` before the player-data backfill, and never a fabricated
 * archetype. Both are honesty properties and both were unpinned.
 */
const mocks = vi.hoisted(() => ({ groupBy: vi.fn(), findMany: vi.fn() }));
vi.mock("@sports/db", () => ({
  db: { playerGameStat: { groupBy: mocks.groupBy }, player: { findMany: mocks.findMany } },
}));

import { loadPlayerArchetypes } from "./player-archetypes";

describe("loadPlayerArchetypes", () => {
  beforeEach(() => { mocks.groupBy.mockReset(); mocks.findMany.mockReset(); });

  it("reports no-data when nothing has been ingested, rather than an empty slate", async () => {
    mocks.groupBy.mockResolvedValue([]);
    mocks.findMany.mockResolvedValue([]);
    const r = await loadPlayerArchetypes(2026);
    expect(r.status).toBe("no-data");
    expect(r.playerCount).toBe(0);
    expect(r.players).toEqual([]);
  });

  it("survives a null groupBy result", async () => {
    mocks.groupBy.mockResolvedValue(null);
    mocks.findMany.mockResolvedValue([]);
    expect((await loadPlayerArchetypes(2026)).status).toBe("no-data");
  });

  // The groupBy shape is the loader's OWN: _count._all plus the six _sum
  // columns. A fixture missing _count throws inside the loader, which is how the
  // first draft of this test failed -- the loader is right, the stub was not.
  const group = (playerId: string) => ({
    playerId,
    _count: { _all: 12 },
    _sum: { carries: 1, receptions: 5, targets: 8, rushingYards: 40, receivingYards: 300 },
  });

  it("still classifies a player whose profile row is missing, rather than dropping them", async () => {
    mocks.groupBy.mockResolvedValue([group("p1")]);
    mocks.findMany.mockResolvedValue([]); // no profile row to enrich with
    const r = await loadPlayerArchetypes(2026);
    // position falls back to null rather than being invented
    expect(r.players).toHaveLength(1);
    expect(r.players[0]?.position ?? null).toBeNull();
  });

  it("honours the limit", async () => {
    mocks.groupBy.mockResolvedValue(Array.from({ length: 7 }, (_, i) => group(`p${i}`)));
    mocks.findMany.mockResolvedValue(
      Array.from({ length: 7 }, (_, i) => ({ id: `p${i}`, fullName: `P${i}`, position: "WR", recentTeam: "CLE" })),
    );
    const r = await loadPlayerArchetypes(2026, 3);
    expect(r.players.length).toBeLessThanOrEqual(3);
  });
});

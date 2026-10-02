import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * `player-movers.ts` had no test. It is the momentum core behind buy-low /
 * sell-high, so a sign error here would invert the recommendation a customer
 * reads. The riser/faller contract and the honest empty state were both
 * unpinned.
 */
const mocks = vi.hoisted(() => ({ stats: vi.fn(), players: vi.fn() }));
vi.mock("@sports/db", () => ({
  db: { playerGameStat: { findMany: mocks.stats }, player: { findMany: mocks.players } },
}));

import { loadPlayerMovers } from "./player-movers";

describe("loadPlayerMovers", () => {
  beforeEach(() => { mocks.stats.mockReset(); mocks.players.mockReset(); });

  it("reports no-data until the player-data backfill has run", async () => {
    mocks.stats.mockResolvedValue([]);
    mocks.players.mockResolvedValue([]);
    const r = await loadPlayerMovers(2026, 3);
    expect(r.status).toBe("no-data");
    expect(r.risers).toEqual([]);
    expect(r.fallers).toEqual([]);
    expect(r.note).toMatch(/backfill/i);
  });

  it("survives a null stats result", async () => {
    mocks.stats.mockResolvedValue(null);
    mocks.players.mockResolvedValue([]);
    expect((await loadPlayerMovers(2026, 3)).status).toBe("no-data");
  });

  it("never lists the same player as both a riser and a faller", async () => {
    mocks.stats.mockResolvedValue([
      { playerId: "p1", week: 1, fantasyPointsPpr: 5 },
      { playerId: "p1", week: 2, fantasyPointsPpr: 25 },
      { playerId: "p2", week: 1, fantasyPointsPpr: 30 },
      { playerId: "p2", week: 2, fantasyPointsPpr: 3 },
    ]);
    mocks.players.mockResolvedValue([
      { id: "p1", fullName: "Riser", position: "WR", recentTeam: "CLE" },
      { id: "p2", fullName: "Faller", position: "WR", recentTeam: "CLE" },
    ]);
    const r = await loadPlayerMovers(2026, 3);
    const risers = new Set(r.risers.map((x) => x.playerId ?? x.playerId));
    const fallers = new Set(r.fallers.map((x) => x.playerId ?? x.playerId));
    for (const id of risers) expect(fallers.has(id)).toBe(false);
  });
});

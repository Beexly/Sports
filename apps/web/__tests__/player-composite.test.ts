import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Player composite (Galaxy Index) loader: production z-score vs position +
 * availability (injury/practice/concussion) blended via the real composite
 * matrix. Only the DB is mocked.
 */

const mocks = vi.hoisted(() => ({ groupBy: vi.fn(), playerFindMany: vi.fn(), injuryFindMany: vi.fn() }));
vi.mock("@sports/db", () => ({ db: {
  playerGameStat: { groupBy: mocks.groupBy },
  player: { findMany: mocks.playerFindMany },
  injury: { findMany: mocks.injuryFindMany },
} }));

import { loadPlayerCompositeScores, availabilitySignalValue } from "@/lib/scoring/player-composite";

beforeEach(() => {
  mocks.groupBy.mockReset();
  mocks.playerFindMany.mockReset();
  mocks.injuryFindMany.mockReset();
  mocks.injuryFindMany.mockResolvedValue([]);
});

describe("availabilitySignalValue", () => {
  it("scores report status, practice, and concussion (clamped)", () => {
    expect(availabilitySignalValue({ reportStatus: "Out", practiceStatus: null, primaryInjury: null })).toBe(-2);
    expect(availabilitySignalValue({ reportStatus: "Questionable", practiceStatus: null, primaryInjury: null })).toBe(-0.5);
    expect(availabilitySignalValue({ reportStatus: null, practiceStatus: "Limited", primaryInjury: "Concussion" })).toBe(-1);
    expect(availabilitySignalValue({ reportStatus: "Out", practiceStatus: "Did Not Participate", primaryInjury: "Concussion" })).toBe(-2.5); // clamped
    expect(availabilitySignalValue({ reportStatus: null, practiceStatus: null, primaryInjury: null })).toBe(0);
  });
});

describe("loadPlayerCompositeScores", () => {
  it("ranks by blended score and an injured player is dragged below an equal producer", async () => {
    mocks.groupBy.mockResolvedValue([
      { playerId: "p1", _count: { _all: 16 }, _avg: { fantasyPointsPpr: 20 } },
      { playerId: "p2", _count: { _all: 16 }, _avg: { fantasyPointsPpr: 10 } },
      { playerId: "p3", _count: { _all: 16 }, _avg: { fantasyPointsPpr: 20 } }, // same production as p1, but injured
    ]);
    mocks.playerFindMany.mockResolvedValue([
      { id: "p1", fullName: "Alpha", position: "RB", recentTeam: "KC" },
      { id: "p2", fullName: "Bravo", position: "RB", recentTeam: "BUF" },
      { id: "p3", fullName: "Charlie", position: "RB", recentTeam: "SF" },
    ]);
    mocks.injuryFindMany.mockResolvedValue([
      { playerId: "p3", week: 5, reportStatus: "Out", practiceStatus: "Did Not Participate", primaryInjury: "Concussion" },
    ]);

    const r = await loadPlayerCompositeScores(2024);
    expect(r.status).toBe("ok");
    expect(r.playerCount).toBe(3);
    expect(r.top[0]!.name).toBe("Alpha"); // top producer, no injury

    const p1 = r.top.find((x) => x.playerId === "p1")!;
    const p3 = r.top.find((x) => x.playerId === "p3")!;
    const p2 = r.top.find((x) => x.playerId === "p2")!;
    expect(p1.score).toBeGreaterThan(p3.score); // same production z, but p3 hurt by availability
    expect(p3.score).toBeGreaterThan(p2.score);
    // p3's drivers include the availability signal pulling it down
    const avail = p3.drivers.find((d) => d.key === "availability")!;
    expect(avail.contribution).toBeLessThan(0);
  });

  it("returns no-data when empty, and is stub-safe on null", async () => {
    mocks.groupBy.mockResolvedValue([]);
    expect((await loadPlayerCompositeScores(2024)).status).toBe("no-data");
    mocks.groupBy.mockResolvedValue(null);
    expect((await loadPlayerCompositeScores(2024)).status).toBe("no-data");
  });
});

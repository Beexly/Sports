import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Player composite (Galaxy Index): reads weekly PlayerGameStat and blends
 * production (z vs position) + workload + momentum + availability via the real
 * composite matrix. Only the DB is mocked.
 */

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), playerFindMany: vi.fn(), injuryFindMany: vi.fn() }));
vi.mock("@sports/db", () => ({ db: {
  playerGameStat: { findMany: mocks.findMany },
  player: { findMany: mocks.playerFindMany },
  injury: { findMany: mocks.injuryFindMany },
} }));

import { loadPlayerCompositeScores, availabilitySignalValue } from "@/lib/scoring/player-composite";

function weekRows(playerId: string, ppr: number[], carries: number, receptions: number) {
  return ppr.map((v, i) => ({ playerId, week: i + 1, fantasyPointsPpr: v, carries, receptions }));
}

beforeEach(() => {
  mocks.findMany.mockReset();
  mocks.playerFindMany.mockReset().mockResolvedValue([
    { id: "p1", fullName: "Alpha", position: "RB", recentTeam: "KC" },
    { id: "p2", fullName: "Bravo", position: "RB", recentTeam: "SF" },
    { id: "p3", fullName: "Charlie", position: "RB", recentTeam: "BUF" },
  ]);
  mocks.injuryFindMany.mockReset().mockResolvedValue([]);
});

describe("availabilitySignalValue", () => {
  it("scores report status, practice, and concussion (clamped)", () => {
    expect(availabilitySignalValue({ reportStatus: "Out", practiceStatus: null, primaryInjury: null })).toBe(-2);
    expect(availabilitySignalValue({ reportStatus: "Questionable", practiceStatus: null, primaryInjury: null })).toBe(-0.5);
    expect(availabilitySignalValue({ reportStatus: null, practiceStatus: "Limited", primaryInjury: "Concussion" })).toBe(-1);
    expect(availabilitySignalValue({ reportStatus: "Out", practiceStatus: "Did Not Participate", primaryInjury: "Concussion" })).toBe(-2.5);
    expect(availabilitySignalValue({ reportStatus: null, practiceStatus: null, primaryInjury: null })).toBe(0);
  });
});

describe("loadPlayerCompositeScores", () => {
  it("blends production + workload + momentum + availability and attributes drivers", async () => {
    mocks.findMany.mockResolvedValue([
      ...weekRows("p1", [15, 15, 15, 22, 22, 22], 15, 3), // strong, rising, workhorse
      ...weekRows("p2", [15, 15, 15, 22, 22, 22], 15, 3), // same production but injured below
      ...weekRows("p3", [5, 5, 5, 5, 5, 5], 5, 0), // weak, flat, low usage
    ]);
    mocks.injuryFindMany.mockResolvedValue([
      { playerId: "p2", week: 5, reportStatus: "Out", practiceStatus: null, primaryInjury: null },
    ]);

    const r = await loadPlayerCompositeScores(2024);
    expect(r.status).toBe("ok");
    expect(r.playerCount).toBe(3);
    expect(r.top[0]!.name).toBe("Alpha"); // healthy, rising, workhorse

    const p1 = r.top.find((x) => x.playerId === "p1")!;
    const p2 = r.top.find((x) => x.playerId === "p2")!;
    const p3 = r.top.find((x) => x.playerId === "p3")!;
    expect(p1.score).toBeGreaterThan(p2.score); // identical production, p2 hurt by availability
    expect(p2.score).toBeGreaterThan(p3.score);
    expect(p1.touchesPerGame).toBeCloseTo(18, 1);
    expect(p1.recentPpg).toBeGreaterThan(p1.seasonPpg); // rising → recent above season

    // drivers reflect the multi-signal blend
    expect(p1.drivers.some((d) => d.key === "momentum" && d.contribution > 0)).toBe(true);
    expect(p1.drivers.some((d) => d.key === "workload" && d.contribution > 0)).toBe(true);
    expect(p2.drivers.some((d) => d.key === "availability" && d.contribution < 0)).toBe(true);
  });

  it("returns no-data when empty, and is stub-safe on null", async () => {
    mocks.findMany.mockResolvedValue([]);
    expect((await loadPlayerCompositeScores(2024)).status).toBe("no-data");
    mocks.findMany.mockResolvedValue(null);
    expect((await loadPlayerCompositeScores(2024)).status).toBe("no-data");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Player composite (Galaxy Index): reads weekly PlayerGameStat and blends
 * production (z vs position) + workload + snap share + momentum + availability
 * via the real composite matrix. Only the DB is mocked.
 */

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), playerFindMany: vi.fn(), injuryFindMany: vi.fn(), snapFindMany: vi.fn() }));
vi.mock("@sports/db", () => ({ db: {
  playerGameStat: { findMany: mocks.findMany },
  player: { findMany: mocks.playerFindMany },
  injury: { findMany: mocks.injuryFindMany },
  snapCount: { findMany: mocks.snapFindMany },
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
  mocks.snapFindMany.mockReset().mockResolvedValue([]);
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

    // snap data is absent (empty mock) → snapShare is null and unchanged from baseline
    expect(p1.snapShare).toBeNull();
    expect(p1.drivers.some((d) => d.key === "snapShare")).toBe(false);
  });

  it("returns no-data when empty, and is stub-safe on null", async () => {
    mocks.findMany.mockResolvedValue([]);
    expect((await loadPlayerCompositeScores(2024)).status).toBe("no-data");
    mocks.findMany.mockResolvedValue(null);
    expect((await loadPlayerCompositeScores(2024)).status).toBe("no-data");
  });

  it("ranks a high-snap-share player above an equal-volume low-snap-share player", async () => {
    // Identical production and touches — the ONLY differentiator is snap share.
    mocks.findMany.mockResolvedValue([
      ...weekRows("p1", [20, 20, 20, 20, 20, 20], 10, 2), // 12 touches/game @ 90% snaps
      ...weekRows("p2", [20, 20, 20, 20, 20, 20], 10, 2), // 12 touches/game @ 40% snaps
    ]);
    mocks.injuryFindMany.mockResolvedValue([]);
    mocks.snapFindMany.mockResolvedValue([
      { playerId: "p1", offensePct: 90 },
      { playerId: "p2", offensePct: 40 },
    ]);

    const r = await loadPlayerCompositeScores(2024);
    const p1 = r.top.find((x) => x.playerId === "p1")!;
    const p2 = r.top.find((x) => x.playerId === "p2")!;
    expect(p1.touchesPerGame).toBeCloseTo(p2.touchesPerGame, 1); // equal volume
    expect(p1.snapShare).toBe(90);
    expect(p2.snapShare).toBe(40);
    // snap share is a real, differentiator signal — both appear in drivers
    expect(p1.drivers.some((d) => d.key === "snapShare")).toBe(true);
    // p1 (high snap share) scores higher than p2 (low snap share) with equal production
    expect(p1.score).toBeGreaterThan(p2.score);
  });

  it("omits the snap signal and nulls snapShare when no snap data exists", async () => {
    mocks.findMany.mockResolvedValue([
      ...weekRows("p1", [20, 20, 20, 20, 20, 20], 10, 2),
    ]);
    mocks.injuryFindMany.mockResolvedValue([]);
    mocks.snapFindMany.mockResolvedValue([]); // empty → snap share inert

    const r = await loadPlayerCompositeScores(2024);
    const p1 = r.top.find((x) => x.playerId === "p1")!;
    // snap data is absent (empty mock) → snapShare is null and the signal is
    // structurally absent from the composite, so this path is byte-identical
    // to the pre-snap wiring (the snap feature is purely additive).
    expect(p1.snapShare).toBeNull();
    expect(p1.drivers.some((d) => d.key === "snapShare")).toBe(false);
    expect(Number.isFinite(p1.score)).toBe(true);
  });

  it("ignores snap rows without a resolved playerId (never name-guesses)", async () => {
    mocks.findMany.mockResolvedValue([
      ...weekRows("p1", [20, 20, 20, 20, 20, 20], 10, 2),
    ]);
    mocks.injuryFindMany.mockResolvedValue([]);
    mocks.snapFindMany.mockResolvedValue([
      { playerId: "p1", offensePct: 50 },
      { playerId: null, offensePct: 99 }, // unresolved gsis link → must NOT leak onto p1
    ]);
    const r = await loadPlayerCompositeScores(2024);
    const p1 = r.top.find((x) => x.playerId === "p1")!;
    expect(p1.snapShare).toBe(50);
  });
});

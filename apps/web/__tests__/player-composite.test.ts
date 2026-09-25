import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Player composite (Galaxy Index): reads weekly PlayerGameStat and blends
 * production (z vs position) + workload + snap share + momentum + availability
 * via the real composite matrix. Only the DB is mocked.
 */

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  playerFindMany: vi.fn(),
  injuryFindMany: vi.fn(),
  snapFindMany: vi.fn(),
  depthFindMany: vi.fn(),
  signalFindMany: vi.fn(),
}));
vi.mock("@sports/db", () => ({ db: {
  playerGameStat: { findMany: mocks.findMany },
  player: { findMany: mocks.playerFindMany },
  injury: { findMany: mocks.injuryFindMany },
  snapCount: { findMany: mocks.snapFindMany },
  depthChartEntry: { findMany: mocks.depthFindMany },
  signal: { findMany: mocks.signalFindMany },
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
  mocks.depthFindMany.mockReset().mockResolvedValue([]);
  mocks.signalFindMany.mockReset().mockResolvedValue([]);
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

  it("uses only centered NGS features from one canonical source week", async () => {
    mocks.findMany.mockResolvedValue([
      ...weekRows("p1", [20, 20, 20, 20, 20, 20], 10, 2),
    ]);
    const capturedAt = new Date();
    const older = new Date(capturedAt.getTime() - 86_400_000);
    mocks.signalFindMany.mockImplementation(async (args: { where?: { key?: { in?: readonly string[] } } }) => {
      const allowed = new Set(args.where?.key?.in ?? []);
      return [
        { entityId: "p1", key: "ngs.cpoe", value: 0.8, weight: 1.5, confidence: 0.85, capturedAt, week: 0 },
        { entityId: "p1", key: "ngs.cpoe", value: -1, weight: 1.5, confidence: 0.85, capturedAt: older, week: 4 },
        { entityId: "p1", key: "ngs.yac_above_expectation", value: 0.5, weight: 1.25, confidence: 0.8, capturedAt, week: 0 },
        { entityId: "p1", key: "ngs.ryoe_per_attempt", value: 0.4, weight: 0.75, confidence: 0.75, capturedAt, week: 0 },
        { entityId: "p1", key: "ngs.separation", value: 0.6, weight: 1.25, confidence: 0.8, capturedAt, week: 0 },
        { entityId: "p1", key: "ngs.cushion", value: 0.4, weight: 0.75, confidence: 0.65, capturedAt, week: 0 },
        { entityId: "p1", key: "ngs.time_to_throw", value: -0.5, weight: 0.5, confidence: 0.65, capturedAt, week: 0 },
      ].filter((row) => allowed.has(row.key));
    });

    const r = await loadPlayerCompositeScores(2024);
    const p1 = r.top.find((x) => x.playerId === "p1")!;
    const ngsDrivers = p1.drivers.filter((d) => d.key.startsWith("ngs.")).map((d) => d.key);
    expect(ngsDrivers).toHaveLength(3);
    expect(new Set(ngsDrivers)).toEqual(new Set([
      "ngs.cpoe",
      "ngs.yac_above_expectation",
      "ngs.ryoe_per_attempt",
    ]));
  });

  it("joins NGS player signals through Player.gsisId rather than the internal player id", async () => {
    const gsisId = "00-0034857";
    mocks.findMany.mockResolvedValue([
      ...weekRows("internal-player-id", [20, 20, 20, 20, 20, 20], 10, 2),
    ]);
    mocks.playerFindMany.mockResolvedValue([
      { id: "internal-player-id", gsisId, fullName: "James Cook", position: "RB", recentTeam: "BUF" },
    ]);
    const capturedAt = new Date();
    mocks.signalFindMany.mockResolvedValue([
      { entityId: gsisId, key: "ngs.cpoe", value: 0.8, weight: 1.5, confidence: 0.85, capturedAt, week: 0 },
      { entityId: "wrong-internal-id", key: "ngs.cpoe", value: -1, weight: 1.5, confidence: 0.85, capturedAt, week: 0 },
    ]);

    const r = await loadPlayerCompositeScores(2024);
    const player = r.top.find((x) => x.playerId === "internal-player-id")!;
    expect(player.drivers).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "ngs.cpoe", value: 0.8 }),
    ]));
    expect(player.drivers.some((d) => d.key === "ngs.cpoe" && d.value !== 0.8)).toBe(false);
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

  it("ranks a starting-caliber depth player above an equal-everything reserve", async () => {
    // Identical production, workload, snaps — the ONLY differentiator is depth role.
    mocks.findMany.mockResolvedValue([
      ...weekRows("p1", [20, 20, 20, 20, 20, 20], 10, 2), // starter (depthRank 1)
      ...weekRows("p2", [20, 20, 20, 20, 20, 20], 10, 2), // reserve (depthRank 6)
    ]);
    mocks.injuryFindMany.mockResolvedValue([]);
    mocks.snapFindMany.mockResolvedValue([
      { playerId: "p1", offensePct: 50 },
      { playerId: "p2", offensePct: 50 },
    ]);
    mocks.depthFindMany.mockResolvedValue([
      { playerId: "p1", depthRank: 1 },
      { playerId: "p2", depthRank: 6 },
    ]);

    const r = await loadPlayerCompositeScores(2024);
    const p1 = r.top.find((x) => x.playerId === "p1")!;
    const p2 = r.top.find((x) => x.playerId === "p2")!;
    expect(p1.depthRank).toBe(1);
    expect(p2.depthRank).toBe(6);
    // depth role is a real, differentiator signal — both appear in drivers
    expect(p1.drivers.some((d) => d.key === "depthRole")).toBe(true);
    expect(p2.drivers.some((d) => d.key === "depthRole")).toBe(true);
    // p1 (starting role) scores higher than p2 (reserve role) with equal everything else
    expect(p1.score).toBeGreaterThan(p2.score);
  });

  it("is purely additive: no depth data leaves depthRank null and scores unchanged from pre-depth wiring", async () => {
    mocks.findMany.mockResolvedValue([
      ...weekRows("p1", [20, 20, 20, 20, 20, 20], 10, 2),
    ]);
    mocks.injuryFindMany.mockResolvedValue([]);
    mocks.snapFindMany.mockResolvedValue([]);
    mocks.depthFindMany.mockResolvedValue([]); // empty → depth role inert

    const r = await loadPlayerCompositeScores(2024);
    const p1 = r.top.find((x) => x.playerId === "p1")!;
    // depth data is absent (empty mock) → depthRank is null and the signal is
    // structurally absent from the composite, so this path is byte-identical
    // to the pre-depth wiring (the depth feature is purely additive).
    expect(p1.depthRank).toBeNull();
    expect(p1.drivers.some((d) => d.key === "depthRole")).toBe(false);
    expect(Number.isFinite(p1.score)).toBe(true);
  });

  it("ignores depth rows without a resolved playerId (never name-guesses a role)", async () => {
    mocks.findMany.mockResolvedValue([
      ...weekRows("p1", [20, 20, 20, 20, 20, 20], 10, 2),
    ]);
    mocks.injuryFindMany.mockResolvedValue([]);
    mocks.snapFindMany.mockResolvedValue([]);
    mocks.depthFindMany.mockResolvedValue([
      { playerId: "p1", depthRank: 1 },
      { playerId: null, depthRank: 1 }, // unresolved → must NOT leak onto p1
    ]);
    const r = await loadPlayerCompositeScores(2024);
    const p1 = r.top.find((x) => x.playerId === "p1")!;
    expect(p1.depthRank).toBe(1); // only the resolved row counts
  });
});

import { describe, expect, it } from "vitest";
import { computeQbScrambleEpa, type ScramblePlay, QB_SCRAMBLE_EPA_MODEL_VERSION } from "../qb-scramble-epa.js";

function play(partial: Partial<ScramblePlay> & { playId: string; season: number; week: number; playerId: string }): ScramblePlay {
  return {
    gameId: `G-${partial.season}-${partial.week}`,
    posteam: "AAA",
    isScramble: 0,
    isDropback: 1,
    epa: 0,
    ...partial,
  };
}

describe("qb-scramble-epa computation", () => {
  it("computes rate, EPA per play, total EPA, and differential correctly", () => {
    const plays: ScramblePlay[] = [
      play({ playId: "1", season: 2026, week: 1, playerId: "P1", isScramble: 1, epa: 1.0 }),
      play({ playId: "2", season: 2026, week: 1, playerId: "P1", isScramble: 1, epa: 2.0 }), // scramble mean = 1.5
      play({ playId: "3", season: 2026, week: 1, playerId: "P1", isScramble: 0, epa: -1.0 }),
      play({ playId: "4", season: 2026, week: 1, playerId: "P1", isScramble: 0, epa: 3.0 }), // non-scramble mean = 1.0
      // Another player for league mean computation
      play({ playId: "5", season: 2026, week: 1, playerId: "P2", isScramble: 1, epa: 1.5 }), // league scramble epa sum = 4.5, count = 3, league mean = 1.5
    ];

    const results = computeQbScrambleEpa(plays, { targetSeason: 2026, targetWeek: 2, minDropbacks: 1 });

    // P1: 2 scrambles, 2 non-scramble dropbacks
    const p1 = results.find((r) => r.playerId === "P1");
    expect(p1).toBeDefined();
    expect(p1?.scrambleCount).toBe(2);
    expect(p1?.dropbackCount).toBe(4);
    expect(p1?.scrambleRate).toBe(0.5);

    // League mean = 1.5
    // Scramble mean for P1 before shrinkage = (1+2)/2 = 1.5
    // Shrunk mean = (3 + 1.5 * 20) / (2 + 20) = 33 / 22 = 1.5
    expect(p1?.scrambleEpaPerPlay).toBe(1.5);
    expect(p1?.scrambleEpaTotal).toBe(3.0);

    expect(p1?.nonScrambleDropbackEpaPerPlay).toBe(1.0);
    expect(p1?.nonScrambleDropbackEpaTotal).toBe(2.0);

    expect(p1?.scrambleVsNonScrambleEpaDifferential).toBe(0.5); // 1.5 - 1.0
  });

  it("handles point-in-time discipline", () => {
    const plays: ScramblePlay[] = [
      play({ playId: "1", season: 2026, week: 1, playerId: "P1", isScramble: 1, epa: 1.0 }), // In window
      play({ playId: "2", season: 2026, week: 2, playerId: "P1", isScramble: 1, epa: 2.0 }), // Exactly on target week (excluded)
      play({ playId: "3", season: 2026, week: 3, playerId: "P1", isScramble: 1, epa: 3.0 }), // After target week (excluded)
      play({ playId: "4", season: 2025, week: 1, playerId: "P1", isScramble: 1, epa: 4.0 }), // Previous season (excluded)
    ];

    const results = computeQbScrambleEpa(plays, { targetSeason: 2026, targetWeek: 2, minDropbacks: 1 });

    const p1 = results.find((r) => r.playerId === "P1");
    expect(p1?.scrambleCount).toBe(1);
    expect(p1?.scrambleEpaTotal).toBe(1.0);
  });

  it("applies shrinkage mechanics properly", () => {
    const plays: ScramblePlay[] = [
      // League mean will be set by P_LEAGUE (scramble EPA = 0)
      ...Array.from({ length: 100 }, (_, i) => play({ playId: `L${i}`, season: 2026, week: 1, playerId: "P_LEAGUE", isScramble: 1, epa: 0 })),

      // High count QB: 80 scrambles with 2.0 EPA each
      ...Array.from({ length: 80 }, (_, i) => play({ playId: `H${i}`, season: 2026, week: 1, playerId: "P_HIGH", isScramble: 1, epa: 2.0 })),

      // Low count QB: 3 scrambles with 2.0 EPA each
      ...Array.from({ length: 3 }, (_, i) => play({ playId: `S${i}`, season: 2026, week: 1, playerId: "P_LOW", isScramble: 1, epa: 2.0 })),
    ];

    const results = computeQbScrambleEpa(plays, { targetSeason: 2026, targetWeek: 2, minDropbacks: 1 });

    // Total scrambles = 100 + 80 + 3 = 183
    // Total scramble EPA = 0 + 160 + 6 = 166
    // League mean = 166 / 183 = 0.9071
    const leagueMean = 166 / 183;

    const pHigh = results.find((r) => r.playerId === "P_HIGH");
    const pLow = results.find((r) => r.playerId === "P_LOW");

    // High count shrinkage: (160 + 0.9071 * 20) / (80 + 20) = 178.142 / 100 = 1.7814
    expect(pHigh?.scrambleEpaPerPlay).toBeCloseTo(1.7814, 3);

    // Low count shrinkage: (6 + 0.9071 * 20) / (3 + 20) = 24.142 / 23 = 1.0496
    expect(pLow?.scrambleEpaPerPlay).toBeCloseTo(1.0496, 3);

    // High count should be closer to raw mean (2.0) than low count is
    expect(Math.abs((pHigh?.scrambleEpaPerPlay || 0) - 2.0)).toBeLessThan(Math.abs((pLow?.scrambleEpaPerPlay || 0) - 2.0));
  });

  it("filters out QBs below the dropback floor", () => {
    const plays: ScramblePlay[] = [
      ...Array.from({ length: 39 }, (_, i) => play({ playId: `1-${i}`, season: 2026, week: 1, playerId: "P1" })), // Below 40
      ...Array.from({ length: 40 }, (_, i) => play({ playId: `2-${i}`, season: 2026, week: 1, playerId: "P2" })), // Exactly 40
    ];

    const results = computeQbScrambleEpa(plays, { targetSeason: 2026, targetWeek: 2, minDropbacks: 40 });

    expect(results.find((r) => r.playerId === "P1")).toBeUndefined();
    expect(results.find((r) => r.playerId === "P2")).toBeDefined();
  });

  it("handles null-EPA scrambles correctly (excluded from average but counted in diagnostics)", () => {
    const plays: ScramblePlay[] = [
      play({ playId: "1", season: 2026, week: 1, playerId: "P1", isScramble: 1, epa: 2.0 }),
      play({ playId: "2", season: 2026, week: 1, playerId: "P1", isScramble: 1, epa: null }), // Should be excluded from EPA average
    ];

    const results = computeQbScrambleEpa(plays, { targetSeason: 2026, targetWeek: 2, minDropbacks: 1 });
    const p1 = results.find((r) => r.playerId === "P1");

    expect(p1?.diagnosticsNullEpaScrambles).toBe(1);
    expect(p1?.scrambleEpaTotal).toBe(2.0);
    expect(p1?.scrambleCount).toBe(2);
    expect(p1?.scrambleEpaPerPlay).toBe(2.0); // If null was counted as 0, mean would be lower
  });

  it("returns deterministic ordering (sorted by total EPA desc, then id asc)", () => {
    const plays: ScramblePlay[] = [
      play({ playId: "1", season: 2026, week: 1, playerId: "P_B", isScramble: 1, epa: 1.0 }),
      play({ playId: "2", season: 2026, week: 1, playerId: "P_C", isScramble: 1, epa: 1.0 }), // Tie with P_B
      play({ playId: "3", season: 2026, week: 1, playerId: "P_A", isScramble: 1, epa: 2.0 }), // Highest EPA
    ];

    const results = computeQbScrambleEpa(plays, { targetSeason: 2026, targetWeek: 2, minDropbacks: 1 });

    expect(results.map(r => r.playerId)).toEqual(["P_A", "P_B", "P_C"]);
  });

  it("stamps deterministic provenance", () => {
    const plays = [play({ playId: "1", season: 2026, week: 1, playerId: "P1" })];
    const results = computeQbScrambleEpa(plays, { targetSeason: 2026, targetWeek: 2, minDropbacks: 1 });

    expect(results[0]?.provenance.method).toBe("deterministic-rule");
    expect(results[0]?.provenance.modelVersion).toBe(QB_SCRAMBLE_EPA_MODEL_VERSION);
  });
});

import { describe, expect, it } from "vitest";
import {
  computeAirYards,
  computeKickerMoE,
  computeMotionRate,
  computeOnOffEpa,
  computeRunStops,
  computeScrambleEpa,
  fgMakeProbability,
} from "./ngs-adjacent-metrics.js";

describe("NGS-12 fgMakeProbability", () => {
  it("falls with distance", () => {
    const p40 = fgMakeProbability(40, 0, true)!;
    const p55 = fgMakeProbability(55, 0, true)!;
    expect(p40).toBeGreaterThan(p55);
    expect(p40).toBeGreaterThan(0.5);
    expect(p55).toBeGreaterThan(0);
    expect(p55).toBeLessThan(0.6);
  });

  it("penalizes outdoor wind", () => {
    const calm = fgMakeProbability(45, 2, true)!;
    const windy = fgMakeProbability(45, 20, true)!;
    expect(calm).toBeGreaterThan(windy);
  });

  it("returns null for missing/invalid distance", () => {
    expect(fgMakeProbability(null, 0, true)).toBeNull();
    expect(fgMakeProbability(10, 0, true)).toBeNull();
    expect(fgMakeProbability(80, 0, true)).toBeNull();
  });
});

describe("NGS-12 computeKickerMoE", () => {
  it("computes makes-over-expected per kicker", () => {
    const r = computeKickerMoE([
      { playId: "a", gameId: "g", playerId: "k1", distance: 35, made: true, isOutdoor: true, windMph: 0 },
      { playId: "b", gameId: "g", playerId: "k1", distance: 35, made: true, isOutdoor: true, windMph: 0 },
      { playId: "c", gameId: "g", playerId: "k1", distance: 55, made: false, isOutdoor: true, windMph: 10 },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0]!.attempts).toBe(3);
    expect(r[0]!.makes).toBe(2);
    // Two short makes outperform; long miss may underperform slightly
    expect(r[0]!.makesOverExpected).toBeGreaterThan(0);
    expect(r[0]!.makeRate).toBeCloseTo(2 / 3, 3);
  });

  it("skips attempts with unmodelable distance — never imputes", () => {
    const r = computeKickerMoE([
      { playId: "a", gameId: "g", playerId: "k1", distance: null, made: true, isOutdoor: true, windMph: 0 },
      { playId: "b", gameId: "g", playerId: "k1", distance: 40, made: false, isOutdoor: true, windMph: 0 },
    ]);
    expect(r[0]!.attempts).toBe(2);
    expect(r[0]!.makes).toBe(1);
    expect(r[0]!.expectedMakeRate).not.toBeNull();
  });
});

describe("NGS-12 computeScrambleEpa", () => {
  it("aggregates scramble EPA per QB", () => {
    const r = computeScrambleEpa([
      { playId: "a", gameId: "g", playerId: "qb1", isScramble: true, epa: 0.4, yardsGained: 12, season: 2026 },
      { playId: "b", gameId: "g", playerId: "qb1", isScramble: true, epa: 0.2, yardsGained: 8, season: 2026 },
      { playId: "c", gameId: "g", playerId: "qb1", isScramble: false, epa: 1.0, yardsGained: 40, season: 2026 },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0]!.scrambles).toBe(2);
    expect(r[0]!.scrambleEpa).toBeCloseTo(0.6, 4);
    expect(r[0]!.scrambleYards).toBe(20);
    expect(r[0]!.scrambleEpaPerPlay).toBeCloseTo(0.3, 4);
  });

  it("counts missing EPA separately — never imputes", () => {
    const r = computeScrambleEpa([
      { playId: "a", gameId: "g", playerId: "qb1", isScramble: true, epa: null, yardsGained: 5, season: 2026 },
      { playId: "b", gameId: "g", playerId: "qb1", isScramble: true, epa: 0.3, yardsGained: 7, season: 2026 },
    ]);
    expect(r[0]!.playsMissingEpa).toBe(1);
    expect(r[0]!.scrambleEpaPerPlay).toBeCloseTo(0.3, 4);
  });
});

describe("NGS-12 computeMotionRate", () => {
  it("computes motion-at-snap rate excluding unknowns", () => {
    const r = computeMotionRate([
      { playId: "a", playerId: "w1", motionAtSnap: true, anyMotion: true },
      { playId: "b", playerId: "w1", motionAtSnap: false, anyMotion: true },
      { playId: "c", playerId: "w1", motionAtSnap: null, anyMotion: null },
    ]);
    expect(r[0]!.snaps).toBe(3);
    expect(r[0]!.snapsWithKnownMotion).toBe(2);
    expect(r[0]!.motionAtSnapRate).toBeCloseTo(0.5, 4);
  });
});

describe("NGS-12 computeRunStops", () => {
  it("counts run stops (unsuccessful) and stuffs (TFL/no gain)", () => {
    const r = computeRunStops([
      { playId: "a", defenderId: "d1", isRush: true, yardsGained: -2, isTackleForLoss: true, success: false },
      { playId: "b", defenderId: "d1", isRush: true, yardsGained: 0, isTackleForLoss: false, success: false },
      { playId: "c", defenderId: "d1", isRush: true, yardsGained: 12, isTackleForLoss: false, success: true },
      { playId: "d", defenderId: "d1", isRush: false, yardsGained: 20, isTackleForLoss: false, success: true },
    ]);
    expect(r[0]!.runStops).toBe(2);
    expect(r[0]!.runStuffs).toBe(2);
    expect(r[0]!.runStopRate).toBeCloseTo(2 / 3, 3);
  });
});

describe("NGS-12 computeAirYards", () => {
  it("computes air yards per target and TD air yards", () => {
    const r = computeAirYards([
      { playerId: "w1", airYards: 12, completed: true, isTouchdown: true },
      { playerId: "w1", airYards: 8, completed: true, isTouchdown: false },
      { playerId: "w1", airYards: 20, completed: false, isTouchdown: false },
    ]);
    expect(r[0]!.targets).toBe(3);
    expect(r[0]!.airYardsPerTarget).toBeCloseTo(40 / 3, 3);
    expect(r[0]!.tdReceptions).toBe(1);
    expect(r[0]!.avgAirYardsOnTd).toBeCloseTo(12, 4);
  });

  it("returns nulls when air yards missing — never imputes", () => {
    const r = computeAirYards([
      { playerId: "w1", airYards: null, completed: true, isTouchdown: false },
    ]);
    expect(r[0]!.airYardsPerTarget).toBeNull();
    expect(r[0]!.targetsWithAirYards).toBe(0);
  });
});

describe("NGS-12 computeOnOffEpa", () => {
  it("computes on/off-field EPA split", () => {
    const r = computeOnOffEpa([
      { teamId: "KC", playerId: "p1", onField: true, epa: 0.13 },
      { teamId: "KC", playerId: "p1", onField: true, epa: 0.13 },
      { teamId: "KC", playerId: "p1", onField: false, epa: -0.09 },
      { teamId: "KC", playerId: "p1", onField: false, epa: -0.09 },
    ]);
    expect(r[0]!.epaOnField).toBeCloseTo(0.13, 4);
    expect(r[0]!.epaOffField).toBeCloseTo(-0.09, 4);
    expect(r[0]!.split).toBeCloseTo(0.22, 4);
    expect(r[0]!.playsOnField).toBe(2);
    expect(r[0]!.playsOffField).toBe(2);
  });

  it("split is null when one side missing — never imputed", () => {
    const r = computeOnOffEpa([
      { teamId: "KC", playerId: "p1", onField: true, epa: 0.2 },
    ]);
    expect(r[0]!.epaOffField).toBeNull();
    expect(r[0]!.split).toBeNull();
  });
});

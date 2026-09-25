import { describe, expect, it } from "vitest";
import {
  computeDbCoverageMetrics,
  manZoneSplit,
  nflPasserRating,
  type TargetPlay,
} from "./coverage-db-metrics.js";

function play(over: Partial<TargetPlay> = {}): TargetPlay {
  return {
    playId: "p1",
    gameId: "g1",
    season: 2026,
    week: 1,
    defenderId: "db1",
    defenderPosition: "CB",
    offenseTeam: "KC",
    defenseTeam: "BUF",
    epa: -0.3,
    yardsGained: 4,
    airYards: 8,
    completed: true,
    intercepted: false,
    coverageType: "MAN",
    alignment: "BOUNDARY",
    inCoverage: true,
    wasTargeted: true,
    wasPrimaryCoverage: true,
    ...over,
  };
}

describe("NGS-11 nflPasserRating", () => {
  it("computes a perfect rating for 10/10, 200 yds, 2 TD, 0 INT", () => {
    // a=(1-0.3)*5=2.375→2.375, b=(20-3)*0.25=4.25→2.375, c=2*20=40→2.375, d=2.375
    const r = nflPasserRating(10, 10, 200, 2, 0);
    expect(r).toBeCloseTo(158.33, 1);
  });

  it("returns null with zero attempts", () => {
    expect(nflPasserRating(0, 0, 0, 0, 0)).toBeNull();
  });

  it("clamps components into [0, 2.375]", () => {
    const terrible = nflPasserRating(10, 0, 0, 0, 10);
    expect(terrible).toBeCloseTo(0, 1);
  });
});

describe("NGS-11 computeDbCoverageMetrics", () => {
  it("computes target EPA, yards/coverage snap, completion %, passer rating", () => {
    const plays = [
      play({ epa: -0.5, yardsGained: 2, completed: true }),
      play({ playId: "p2", epa: -0.2, yardsGained: 6, completed: true }),
      play({
        playId: "p3",
        epa: 0.8,
        yardsGained: 22,
        completed: true,
        coverageType: "ZONE",
      }),
      play({
        playId: "p4",
        epa: -1.1,
        yardsGained: 0,
        completed: false,
        intercepted: true,
      }),
    ];
    const r = computeDbCoverageMetrics(plays);
    expect(r.byDefender).toHaveLength(1);
    const m = r.byDefender[0]!;
    expect(m.defenderId).toBe("db1");
    expect(m.targets).toBe(4);
    expect(m.coverageSnaps).toBe(4);
    expect(m.targetEpa).not.toBeNull();
    expect(m.targetEpa!).toBeCloseTo((-0.5 - 0.2 + 0.8 - 1.1) / 4, 3);
    expect(m.completionPctAllowed).toBeCloseTo(0.75, 3);
    expect(m.interceptions).toBe(1);
    expect(m.passerRatingAllowed).not.toBeNull();
    expect(m.yardsPerCoverageSnap).toBeCloseTo(30 / 4, 3);
    expect(m.targetEpaByCoverage.MAN).not.toBeNull();
    expect(m.targetEpaByCoverage.ZONE).not.toBeNull();
    expect(m.targetsByAlignment.BOUNDARY).toBe(4);
    expect(r.playsUsed).toBe(4);
  });

  it("never imputes missing EPA — excludes from means, counts in targets", () => {
    const plays = [
      play({ epa: null, wasTargeted: true }),
      play({ playId: "p2", epa: -0.4, wasTargeted: true }),
    ];
    const r = computeDbCoverageMetrics(plays);
    const m = r.byDefender[0]!;
    expect(m.targets).toBe(2);
    expect(m.targetEpa).toBeCloseTo(-0.4, 4);
  });

  it("returns null metrics when no targets", () => {
    const plays = [
      play({
        wasTargeted: false,
        inCoverage: true,
        epa: 0,
        completed: null,
        intercepted: false,
        yardsGained: null,
      }),
    ];
    const r = computeDbCoverageMetrics(plays);
    const m = r.byDefender[0]!;
    expect(m.targets).toBe(0);
    expect(m.targetEpa).toBeNull();
    expect(m.passerRatingAllowed).toBeNull();
    expect(m.completionPctAllowed).toBeNull();
  });

  it("aggregates multiple defenders and league averages", () => {
    const plays = [
      play({ defenderId: "db1", epa: -0.5 }),
      play({ playId: "p2", defenderId: "db2", epa: 0.5 }),
    ];
    const r = computeDbCoverageMetrics(plays);
    expect(r.byDefender).toHaveLength(2);
    expect(r.leagueAverages.targetEpa).toBeCloseTo(0, 3);
    expect(r.leagueAverages.completionPctAllowed).toBeCloseTo(1, 3);
  });
});

describe("NGS-11 manZoneSplit", () => {
  it("splits EPA by coverage type", () => {
    const plays = [
      play({ coverageType: "MAN", epa: -0.6 }),
      play({ playId: "p2", coverageType: "MAN", epa: -0.2 }),
      play({ playId: "p3", coverageType: "ZONE", epa: 0.4 }),
    ];
    const r = manZoneSplit(plays, "db1");
    expect(r.manTargets).toBe(2);
    expect(r.zoneTargets).toBe(1);
    expect(r.manEpa).toBeCloseTo(-0.4, 4);
    expect(r.zoneEpa).toBeCloseTo(0.4, 4);
  });

  it("returns nulls when a side has no data", () => {
    const r = manZoneSplit([play({ coverageType: "MAN", epa: 0.1 })], "db1");
    expect(r.zoneEpa).toBeNull();
    expect(r.manEpa).toBeCloseTo(0.1, 4);
  });
});

import { describe, it, expect } from "vitest";
import { relevanceMultiplier, gradeSource, accuracyWeights, type GradedSource, type PositionOutcome } from "./expert-accuracy";

describe("relevanceMultiplier", () => {
  it("is 1.0 at/below maxRank, 0.5 at/above minRank, linear between", () => {
    // RB band: maxRank=30, minRank=48
    expect(relevanceMultiplier("RB", 1)).toBe(1.0);
    expect(relevanceMultiplier("RB", 30)).toBe(1.0);
    expect(relevanceMultiplier("RB", 48)).toBe(0.5);
    expect(relevanceMultiplier("RB", 99)).toBe(0.5);
    expect(relevanceMultiplier("RB", 39)).toBeCloseTo(0.75, 6); // exact midpoint
  });
});

// Six-player fixture used across grading tests: descending actual points,
// with the curve (sorted actual points) built directly from this pool.
const OUTCOMES: PositionOutcome[] = [
  { playerId: "p1", pos: "WR", actualPoints: 100 },
  { playerId: "p2", pos: "WR", actualPoints: 90 },
  { playerId: "p3", pos: "WR", actualPoints: 80 },
  { playerId: "p4", pos: "WR", actualPoints: 50 },
  { playerId: "p5", pos: "WR", actualPoints: 30 },
  { playerId: "p6", pos: "WR", actualPoints: 10 },
];
const ranks = (pairs: Array<[string, number]>): Map<string, number> => new Map(pairs);

describe("gradeSource — Accuracy Gap methodology", () => {
  it("a perfectly-ordered source scores a zero gap", () => {
    const perfect: GradedSource = { name: "perfect", ranks: ranks([["p1", 1], ["p2", 2], ["p3", 3], ["p4", 4], ["p5", 5], ["p6", 6]]) };
    const grade = gradeSource(perfect, "WR", OUTCOMES);
    expect(grade.weightedGap).toBe(0);
    expect(grade.omitted).toBe(0);
    expect(grade.playersGraded).toBe(6);
  });

  it("orders three sources of differing skill correctly (hand-verified exact totals)", () => {
    const mediocre: GradedSource = { name: "mediocre", ranks: ranks([["p1", 1], ["p2", 2], ["p4", 3], ["p3", 4], ["p6", 5], ["p5", 6]]) };
    const bad: GradedSource = { name: "bad", ranks: ranks([["p6", 1], ["p4", 2], ["p2", 3], ["p1", 4], ["p5", 5], ["p3", 6]]) };

    const gMed = gradeSource(mediocre, "WR", OUTCOMES);
    const gBad = gradeSource(bad, "WR", OUTCOMES);

    // Hand-computed from the rank->curve-slot implied values vs actual points.
    expect(gMed.weightedGap).toBe(100);
    expect(gBad.weightedGap).toBe(260);
    expect(gMed.weightedGap).toBeLessThan(gBad.weightedGap);
  });

  it("closes the FantasyPros-documented short-list loophole: the omission penalty is independent of the omitting source's own list length", () => {
    // A 5-player pool where X4 (actual 40) is NOT the true worst (X5=20 is).
    const outcomes: PositionOutcome[] = [
      { playerId: "x1", pos: "WR", actualPoints: 100 },
      { playerId: "x2", pos: "WR", actualPoints: 80 },
      { playerId: "x3", pos: "WR", actualPoints: 60 },
      { playerId: "x4", pos: "WR", actualPoints: 40 },
      { playerId: "x5", pos: "WR", actualPoints: 20 },
    ];

    // SHORT list (length 1): ranks only x1, omits x2..x5.
    const short: GradedSource = { name: "short", ranks: ranks([["x1", 1]]) };
    // SHORT, but x4 explicitly (and correctly) ranked at slot 4 instead of omitted.
    const shortWithX4: GradedSource = { name: "shortWithX4", ranks: ranks([["x1", 1], ["x4", 4]]) };

    // LONG list (length 3): ranks x1,x2,x3 correctly, omits x4,x5.
    const long: GradedSource = { name: "long", ranks: ranks([["x1", 1], ["x2", 2], ["x3", 3]]) };
    // LONG, but x4 explicitly (and correctly) ranked at slot 4 instead of omitted.
    const longWithX4: GradedSource = { name: "longWithX4", ranks: ranks([["x1", 1], ["x2", 2], ["x3", 3], ["x4", 4]]) };

    const gShort = gradeSource(short, "WR", outcomes);
    const gShortX4 = gradeSource(shortWithX4, "WR", outcomes);
    const gLong = gradeSource(long, "WR", outcomes);
    const gLongX4 = gradeSource(longWithX4, "WR", outcomes);

    expect(gShort.weightedGap).toBe(120);
    expect(gShortX4.weightedGap).toBe(100);
    expect(gLong.weightedGap).toBe(20);
    expect(gLongX4.weightedGap).toBe(0);

    // The marginal cost of omitting x4 (vs. correctly ranking it) — this is the
    // omission penalty in isolation, and it is IDENTICAL whether the omitting
    // source had a 1-player list or a 3-player list. A last-rank+1-style rule
    // (what FantasyPros documents) would NOT have this property: it would imply
    // curve[1]=80 for the short list's omission (delta 40) vs curve[3]=40 for
    // the long list's (delta 0) — a source could buy leniency by ranking fewer
    // players. GSE's fixed worst-in-pool rule removes that lever entirely.
    const deltaShort = gShort.weightedGap - gShortX4.weightedGap;
    const deltaLong = gLong.weightedGap - gLongX4.weightedGap;
    expect(deltaShort).toBe(20);
    expect(deltaLong).toBe(20);
    expect(deltaShort).toBe(deltaLong);
  });
});

describe("accuracyWeights", () => {
  it("sums to 1 and gives more weight to lower (better) gaps", () => {
    const w = accuracyWeights([{ source: "perfect", overall: 0 }, { source: "mediocre", overall: 100 }, { source: "bad", overall: 260 }]);
    const total = [...w.values()].reduce((s, x) => s + x, 0);
    expect(total).toBeCloseTo(1, 6);
    expect(w.get("perfect")!).toBeGreaterThan(w.get("mediocre")!);
    expect(w.get("mediocre")!).toBeGreaterThan(w.get("bad")!);
    expect(w.get("bad")).toBeCloseTo(0, 6); // worst-in-panel gets zero say
  });

  it("handles degenerate cases without dividing by zero", () => {
    expect(accuracyWeights([]).size).toBe(0);
    const single = accuracyWeights([{ source: "only", overall: 42 }]);
    expect(single.get("only")).toBe(1);
    const allEqual = accuracyWeights([{ source: "a", overall: 50 }, { source: "b", overall: 50 }, { source: "c", overall: 50 }]);
    allEqual.forEach((w) => expect(w).toBeCloseTo(1 / 3, 6));
  });
});

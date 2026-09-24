import { describe, it, expect } from "vitest";
import {
  mulberry32,
  poissonSample,
  simulateFixture,
  tableFromResults,
  stakelessProbabilities,
  incentiveGradient,
} from "@/lib/calibration/stakeless-probability";

// ============================================================
// arXiv 2204.08276v8 — stakeless probabilities. Additive only.
// ============================================================

const strengths = {
  A: { attack: 0.4, defense: -0.2 },
  B: { attack: 0.1, defense: 0.0 },
  C: { attack: -0.1, defense: 0.1 },
  D: { attack: -0.4, defense: 0.3 },
};

describe("stakeless probability — 2204.08276v8", () => {
  it("poissonSample has the right mean", () => {
    const rand = mulberry32(9);
    let sum = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) sum += poissonSample(1.5, rand);
    expect(sum / n).toBeCloseTo(1.5, 1);
  });

  it("simulateFixture favors the stronger home side", () => {
    const rand = mulberry32(4);
    let homeWins = 0;
    for (let i = 0; i < 2000; i++) {
      const r = simulateFixture(strengths["A"]!, strengths["D"]!, 0.25, rand);
      if (r.homeGoals > r.awayGoals) homeWins++;
    }
    expect(homeWins / 2000).toBeGreaterThan(0.5);
  });

  it("tableFromResults ranks by points", () => {
    const fixtures = [
      { home: "A", away: "B" },
      { home: "C", away: "D" },
    ];
    const t = tableFromResults(fixtures, [
      { homeGoals: 2, awayGoals: 0 },
      { homeGoals: 1, awayGoals: 1 },
    ]);
    expect(t.rank["A"]).toBe(1);
    expect(t.points["A"]).toBe(3);
    expect(t.points["C"]).toBe(1);
  });

  it("a locked champion is strongly stakeless", () => {
    const fixtures = [{ home: "A", away: "D" }];
    const startingPoints = { A: 9, B: 3, C: 3, D: 0 };
    const { pStakelessStrong, pStakelessWeak } = stakelessProbabilities(
      0,
      fixtures,
      strengths,
      startingPoints,
      1,
      300,
      42,
    );
    expect(pStakelessStrong).toBeCloseTo(1, 6);
    expect(pStakelessWeak).toBeCloseTo(1, 6);
  });

  it("a live game is not stakeless", () => {
    const fixtures = [
      { home: "A", away: "B" },
      { home: "C", away: "D" },
    ];
    const { pStakelessStrong } = stakelessProbabilities(
      0,
      fixtures,
      strengths,
      {},
      2,
      300,
      42,
    );
    expect(pStakelessStrong).toBeLessThan(1);
  });

  it("handles degenerate input", () => {
    expect(stakelessProbabilities(0, [], strengths, {}, 1, 100)).toEqual({
      pStakelessStrong: 0,
      pStakelessWeak: 0,
    });
    expect(stakelessProbabilities(5, [{ home: "A", away: "B" }], strengths, {}, 1, 100)).toEqual({
      pStakelessStrong: 0,
      pStakelessWeak: 0,
    });
    expect(incentiveGradient(0, [], strengths, {}, 100)).toBe(0);
  });

  it("incentiveGradient is larger for tighter races", () => {
    const fixtures = [{ home: "A", away: "B" }];
    const tight = incentiveGradient(0, fixtures, strengths, { A: 3, B: 3 }, 400, 7);
    const runaway = incentiveGradient(0, fixtures, strengths, { A: 12, B: 0 }, 400, 7);
    expect(tight).toBeGreaterThanOrEqual(runaway);
  });
});

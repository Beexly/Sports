/**
 * Vitest suite for arXiv:2411.09085v1 (Predictive Modeling of Lower-Level English Club Soccer Using Crowd-Sourced Player Valuations).
 * Gate: ADAPT if Test 1 or Test 2 passes — the salary-prior mechanism earns a role as an early-season/roster-turnover overlay. If λ optimizes to ~1 (prior adds nothing), REJECT the mechanism but keep the disparity-audit practice as a free calibration win.
 */
import { describe, it, expect } from "vitest";
import { priorWeight, blendedRating } from "./2411-09085v1-predictive-modeling-of-lowerlevel-english";

describe("2411-09085v1 salary-prior overlay", () => {
  const p = { a: 1.5, b: -0.25, c: 1.0 };
  it("prior dominates with few games and high turnover", () => {
    const early = priorWeight(p, { team: "X", gamesPlayed: 1, rosterTurnover: 0.8 });
    const late = priorWeight(p, { team: "X", gamesPlayed: 12, rosterTurnover: 0.1 });
    expect(early).toBeGreaterThan(0.7);
    expect(late).toBeLessThan(0.3);
  });
  it("blends toward the salary rating when lambda is high", () => {
    const ctx = { team: "X", gamesPlayed: 0, rosterTurnover: 1 };
    const r = blendedRating(p, ctx, 0, 10);
    expect(r).toBeCloseTo(10 * priorWeight(p, ctx), 10);
    expect(() => priorWeight(p, { team: "X", gamesPlayed: 1, rosterTurnover: 2 })).toThrow();
  });
});

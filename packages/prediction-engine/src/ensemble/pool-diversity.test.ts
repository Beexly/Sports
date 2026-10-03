import { describe, expect, it } from "vitest";
import { disagreement, energyScore, poolDiversity, prop51Violation } from "./pool-diversity";

describe("pool-diversity", () => {
  it("energyScore is zero for a perfect point forecast", () => {
    expect(energyScore([3, 3, 3, 3], 3)).toBeCloseTo(0, 12);
    expect(energyScore([0, 0, 10, 10], 5)).toBeGreaterThan(0);
  });
  it("poolDiversity rewards disagreement at fixed skill", () => {
    // Two components with the same mean skill but different locations.
    const agree: number[][] = [[4.9, 5.0, 5.1], [4.9, 5.0, 5.1]];
    const disagree: number[][] = [[2.9, 3.0, 3.1], [6.9, 7.0, 7.1]];
    const dAgree = poolDiversity(agree, 5);
    const dDis = poolDiversity(disagree, 5);
    expect(dDis).toBeGreaterThan(dAgree);
    expect(dDis).toBeGreaterThan(0);
  });
  it("Prop 5.1 identity holds within tolerance", () => {
    const comps: number[][] = [
      [1, 2, 3, 4], [2, 3, 4, 5], [0, 1, 5, 6],
    ];
    expect(prop51Violation(comps, 3)).toBeLessThan(1e-9);
    expect(prop51Violation(comps, 10)).toBeLessThan(1e-9);
  });
  it("disagreement is zero for identical components", () => {
    expect(disagreement([[], []], 0)).toBe(0);
    expect(disagreement([[1, 2], [1, 2]], 0)).toBe(0);
    expect(disagreement([[0, 0], [10, 10]], 0)).toBeCloseTo(10, 12);
  });
  it("throws on empty inputs", () => {
    expect(() => energyScore([], 1)).toThrow();
    expect(() => poolDiversity([], 1)).toThrow();
  });
});

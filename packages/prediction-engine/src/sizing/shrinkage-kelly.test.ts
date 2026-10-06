
import { describe, expect, it } from "vitest";
import { edgeToProb, shrinkEdges, shrinkageKellyStake, shrinkageKellyStakes } from "./shrinkage-kelly";

describe("shrinkage-kelly", () => {
  it("shrinkEdges pulls noisy estimates toward the mean", () => {
    const shrunk = shrinkEdges([0.1, 0.02, 0.03, 0.01, 0.5], [0.05, 0.05, 0.05, 0.05, 0.05]);
    expect(Math.abs(shrunk[4] ?? 1)).toBeLessThan(0.5); // outlier pulled in
    expect(shrunk[0] ?? 0).toBeGreaterThan(0); // mean is positive
  });
  it("identical edges are unchanged by shrinkage", () => {
    expect(shrinkEdges([0.05, 0.05, 0.05, 0.05], [0.01, 0.01, 0.01, 0.01])).toEqual([0.05, 0.05, 0.05, 0.05]);
  });
  it("stake is 0 for non-positive shrunk edge", () => {
    expect(shrinkageKellyStake(-0.05, 2.0)).toBe(0);
  });
  it("pipeline stakes more on higher shrunk edges", () => {
    const stakes = shrinkageKellyStakes([0.08, 0.02, 0.03, 0.04, 0.05], [0.02, 0.02, 0.02, 0.02, 0.02], [2, 2, 2, 2, 2]);
    expect(stakes[0]).toBeGreaterThan(stakes[1] ?? 0);
    expect(Math.max(...stakes)).toBeLessThanOrEqual(0.05);
  });
  it("edge cases throw", () => {
    expect(() => shrinkEdges([0.1, 0.2], [0.1, 0.2])).toThrow();
    expect(() => edgeToProb(1.0, 0.1)).toThrow();
  });
});

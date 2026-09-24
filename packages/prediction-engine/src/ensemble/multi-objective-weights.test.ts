
import { describe, expect, it } from "vitest";
import { dominates, kneeIndex, paretoFrontier } from "./multi-objective-weights";

describe("multi-objective-weights", () => {
  it("dominates implements Pareto dominance", () => {
    expect(dominates([1, 1], [2, 2])).toBe(true);
    expect(dominates([1, 2], [2, 1])).toBe(false);
    expect(dominates([1, 1], [1, 1])).toBe(false);
  });
  it("paretoFrontier keeps only nondominated points", () => {
    // Minimization: [1,1] dominates everything -> [0]; [2,3] is dominated by [1,3].
    expect(paretoFrontier([[1, 1], [2, 2], [1, 3], [3, 1]])).toEqual([0]);
    expect(paretoFrontier([[1, 3], [2, 2], [3, 1], [2, 3]])).toEqual([0, 1, 2]);
  });
  it("kneeIndex picks the interior knee of a convex frontier", () => {
    const pts: [number, number][] = [[0, 10], [2, 4], [4, 2], [10, 0]];
    expect(kneeIndex(pts)).toBe(1);
  });
  it("edge cases throw", () => {
    expect(() => dominates([1], [1, 2])).toThrow();
    expect(() => kneeIndex([])).toThrow();
    expect(paretoFrontier([])).toEqual([]);
  });
});


import { describe, expect, it } from "vitest";
import { dominates, nondominatedSort, paretoKnee } from "./pareto-nas";

describe("pareto-nas", () => {
  it("dominates implements minimization dominance", () => {
    expect(dominates([0.5, 0.1], [0.6, 0.2])).toBe(true);
    expect(dominates([0.6, 0.2], [0.5, 0.1])).toBe(false);
    expect(dominates([0.5, 0.1], [0.5, 0.1])).toBe(false);
  });
  it("nondominatedSort recovers the Pareto front", () => {
    const pts = [[0.5, 0.5], [0.4, 0.6], [0.6, 0.4], [0.7, 0.7]];
    const fronts = nondominatedSort(pts);
    expect(new Set(fronts[0])).toEqual(new Set([0, 1, 2]));
    expect(fronts[1]).toEqual([3]);
  });
  it("paretoKnee picks the max-curvature point", () => {
    const front = [[0, 1], [0.1, 0.5], [0.5, 0.1], [1, 0]];
    expect(paretoKnee(front)).toBe(1);
  });
  it("edge cases: empty front throws; tiny front returns 0", () => {
    expect(() => paretoKnee([])).toThrow();
    expect(paretoKnee([[0.5, 0.5]])).toBe(0);
    expect(nondominatedSort([])).toEqual([]);
  });
});

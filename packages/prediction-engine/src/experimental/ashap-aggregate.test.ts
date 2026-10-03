
import { describe, expect, it } from "vitest";
import { aggregateShap, ashapStability, topKFeatures } from "./ashap-aggregate";

describe("ashap-aggregate", () => {
  it("aggregates mean |SHAP| per group, sorted desc", () => {
    const out = aggregateShap([[1, -2], [0.5, 0.5], [10, 10]], [0, 0, 1]);
    expect(out[0]?.group).toBe(1);
    expect(out[0]?.meanAbs).toBeCloseTo(20, 10);
    expect(out[1]?.meanAbs).toBeCloseTo(2, 10);
    expect(out[1]?.meanSigned).toBeCloseTo(0, 10);
  });
  it("topKFeatures ranks by mean |SHAP|", () => {
    expect(topKFeatures([[5, 1], [4, 2]], 1)).toEqual([0]);
    expect(topKFeatures([], 3)).toEqual([]);
  });
  it("stability gate: stable teams count", () => {
    const boots = [
      [[0, 1, 2], [0, 1, 2], [0, 1, 2], [0, 1, 2], [0, 1, 2]], // stable
      [[0, 1, 2], [3, 4, 5], [0, 1, 2], [3, 4, 5], [6, 7, 8]], // unstable
    ];
    expect(ashapStability(boots)).toBeCloseTo(0.5, 10);
    expect(ashapStability([])).toBe(1);
  });
  it("edge cases: misaligned inputs throw; empty shap", () => {
    expect(() => aggregateShap([[1]], [0, 1])).toThrow();
    expect(aggregateShap([], [])).toEqual([]);
  });
});

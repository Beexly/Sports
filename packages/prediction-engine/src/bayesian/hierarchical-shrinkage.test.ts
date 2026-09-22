
import { describe, expect, it } from "vitest";
import { ebTau2, partialPool, poolAll } from "./hierarchical-shrinkage";

describe("hierarchical-shrinkage", () => {
  it("shrinks small samples more than large ones", () => {
    const small = partialPool(0.8, 10, 0.5, 0.01, 0.04);
    const large = partialPool(0.8, 1000, 0.5, 0.01, 0.04);
    expect(small.shrinkage).toBeLessThan(large.shrinkage);
    expect(small.posteriorMean).toBeLessThan(large.posteriorMean);
  });
  it("posterior is a convex combination of group and prior means", () => {
    const p = partialPool(0.9, 50, 0.5, 0.02, 0.05);
    expect(p.posteriorMean).toBeGreaterThan(0.5);
    expect(p.posteriorMean).toBeLessThan(0.9);
  });
  it("poolAll pulls an outlier rookie toward the grand mean", () => {
    const pooled = poolAll([0.95, 0.5, 0.48], [5, 500, 500], 0.05);
    expect(pooled[0]?.posteriorMean ?? 1).toBeLessThan(0.95);
    expect(pooled[1]?.posteriorMean ?? 0).toBeCloseTo(0.5, 1);
  });
  it("edge cases throw on bad inputs", () => {
    expect(() => partialPool(0.5, 0, 0.5, 1, 1)).toThrow();
    expect(() => partialPool(0.5, 5, 0.5, -1, 1)).toThrow();
    expect(() => ebTau2([], [], 1)).toThrow();
  });
});

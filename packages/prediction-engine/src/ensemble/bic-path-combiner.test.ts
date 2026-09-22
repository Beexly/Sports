import { describe, expect, it } from "vitest";
import { bic, bicWeights, combineLassoPath, horizonForecast } from "./bic-path-combiner";

describe("bic-path-combiner", () => {
  it("bicWeights concentrate on the lowest BIC", () => {
    const w = bicWeights([100, 104, 120]);
    expect(w[0]).toBeGreaterThan(w[1]!);
    expect(w[1]).toBeGreaterThan(w[2]!);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(bicWeights([])).toEqual([]);
  });

  it("combineLassoPath is a convex combination", () => {
    const out = combineLassoPath([0.3, 0.5, 0.7], [100, 102, 110]);
    expect(out).toBeGreaterThanOrEqual(0.3);
    expect(out).toBeLessThanOrEqual(0.7);
    // dominated by the best-BIC forecast
    expect(out).toBeLessThan(0.5);
    expect(() => combineLassoPath([], [])).toThrow("empty");
    expect(() => combineLassoPath([0.5], [1, 2])).toThrow("mismatch");
  });

  it("bic penalizes complexity", () => {
    expect(bic(10, 100, 5)).toBeGreaterThan(bic(10, 100, 2));
    expect(bic(10, 100, 2)).toBeGreaterThan(bic(5, 100, 2)); // fit matters more
    expect(() => bic(0, 100, 2)).toThrow();
  });

  it("horizon rule: short -> leanest, long -> combined", () => {
    const f = [0.4, 0.45, 0.5];
    const b = [100, 101, 103];
    expect(horizonForecast(f, b, "short")).toBe(0.5);
    const long = horizonForecast(f, b, "long");
    expect(long).toBeGreaterThanOrEqual(0.4);
    expect(long).toBeLessThanOrEqual(0.5);
  });
});


import { describe, expect, it } from "vitest";
import { blendForecasts, falseAlarmRatio, inverseFarWeights } from "./inverse-far-blending";

describe("inverse-far-blending", () => {
  it("falseAlarmRatio counts false alarms over alarm events", () => {
    // forecasts cross 3/4 times, actual crosses 2/4; FA=1, hits=2
    expect(falseAlarmRatio([25, 5, 30, 22], [10, 5, 30, 22], 20)).toBeCloseTo(1 / 3, 10);
  });
  it("no alarm events -> neutral 0.5", () => {
    expect(falseAlarmRatio([1, 2], [1, 2], 20)).toBe(0.5);
  });
  it("inverseFarWeights down-weight high-FAR models", () => {
    const w = inverseFarWeights([0.1, 0.5]);
    expect(w[0]).toBeGreaterThan(w[1] ?? 0);
    expect(w.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 10);
  });
  it("blendForecasts is a convex combination", () => {
    expect(blendForecasts([[10, 20], [20, 40]], [0.25, 0.75])).toEqual([17.5, 35]);
  });
  it("edge cases throw", () => {
    expect(() => falseAlarmRatio([], [], 1)).toThrow();
    expect(() => inverseFarWeights([])).toThrow();
    expect(() => blendForecasts([[1]], [])).toThrow();
  });
});

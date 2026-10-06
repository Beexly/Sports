import { describe, expect, it } from "vitest";
import { isTailRegime, balancingWeights, toSamplingDistribution, tailShare, GSE_REGIME_BALANCING_ENABLED } from "./regime-balancing-2404.js";

const rows = [
  { weatherSeverity: 0.9, restDaysBin: 1, primetime: false, divisional: true },
  { weatherSeverity: 0.1, restDaysBin: 1, primetime: false, divisional: false },
  { weatherSeverity: 0.2, restDaysBin: 0, primetime: true, divisional: false },
];

describe("regime balancing", () => {
  it("flags severe-weather and extreme-rest rows as tail", () => {
    expect(rows.map(isTailRegime)).toEqual([true, false, true]);
  });
  it("i=0 keeps unit weights", () => {
    expect(balancingWeights(rows, 0)).toEqual([1, 1, 1]);
  });
  it("tail share grows monotonically with intensity", () => {
    expect(tailShare(rows, 10)).toBeGreaterThan(tailShare(rows, 0));
    expect(tailShare(rows, 0)).toBeCloseTo(2 / 3, 10);
  });
  it("sampling distribution sums to 1", () => {
    const d = toSamplingDistribution(balancingWeights(rows, 10));
    expect(d.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });
  it("handles empty input", () => {
    expect(balancingWeights([], 10)).toEqual([]);
    expect(tailShare([], 10)).toBe(0);
  });
  it("stays off until the tail-slice gate clears", () => {
    expect(GSE_REGIME_BALANCING_ENABLED).toBe(false);
  });
});


import { describe, expect, it } from "vitest";
import {
  simpleAverage,
  sourceReliabilityDashboard,
  varianceEM,
} from "./variance-em-aggregator";

describe("variance-em-aggregator", () => {
  it("converges to a consensus inside the source range", () => {
    const r = varianceEM([0.6, 0.65, 0.7]);
    expect(r.converged).toBe(true);
    expect(r.mu).toBeGreaterThanOrEqual(0.6);
    expect(r.mu).toBeLessThanOrEqual(0.7);
    expect(r.sourceVariances).toHaveLength(3);
    expect(r.sourceVariances.every((v) => v > 0)).toBe(true);
  });

  it("downweights the outlying source", () => {
    // sources: 0.6, 0.61 (agree), 0.95 (outlier) -> mu closer to the pair
    const r = varianceEM([0.6, 0.61, 0.95]);
    expect(r.mu).toBeLessThan(0.75);
    expect(r.mu).toBeGreaterThan(0.55);
    // outlier gets the largest variance
    expect(r.sourceVariances[2]).toBeGreaterThan(r.sourceVariances[0]!);
  });

  it("single source returns that source", () => {
    const r = varianceEM([0.42]);
    expect(r.mu).toBeCloseTo(0.42, 10);
  });

  it("rejects empty panels and out-of-range probabilities", () => {
    expect(() => varianceEM([])).toThrow("empty");
    expect(() => varianceEM([0.5, 1.2])).toThrow("out of range");
  });

  it("reliability dashboard averages per-source variances", () => {
    const d = sourceReliabilityDashboard([
      [0.01, 0.04],
      [0.03, 0.02],
    ]);
    expect(d[0]).toBeCloseTo(0.02, 12);
    expect(d[1]).toBeCloseTo(0.03, 12);
    expect(sourceReliabilityDashboard([])).toEqual([]);
  });

  it("simpleAverage is the plain mean", () => {
    expect(simpleAverage([0.2, 0.8])).toBeCloseTo(0.5, 12);
    expect(() => simpleAverage([])).toThrow("empty");
  });
});

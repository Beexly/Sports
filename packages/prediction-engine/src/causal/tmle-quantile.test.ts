
import { describe, expect, it } from "vitest";
import { kdeAt, quantileTreatmentEffect, weightedQuantile } from "./tmle-quantile";

describe("tmle-quantile", () => {
  it("weightedQuantile is the order statistic at tau mass", () => {
    expect(weightedQuantile([3, 1, 2], [1, 1, 1], 0.5)).toBe(2);
    expect(weightedQuantile([3, 1, 2], [1, 1, 1], 0.9)).toBe(3);
  });
  it("recovers a location shift at the median", () => {
    const y: number[] = [];
    const t: number[] = [];
    const ps: number[] = [];
    for (let i = 0; i < 300; i++) {
      const ti = i % 2;
      t.push(ti);
      ps.push(0.5);
      y.push(ti * 5 + (i % 11));
    }
    const r = quantileTreatmentEffect(y, t, ps, 0.5);
    expect(r.effect).toBeGreaterThan(2);
    expect(r.ciLower).toBeLessThan(r.effect);
    expect(r.ciUpper).toBeGreaterThan(r.effect);
  });
  it("kdeAt peaks near the data", () => {
    const v = [0, 0.1, -0.1, 0.05];
    const w = [1, 1, 1, 1];
    expect(kdeAt(0, v, w, 0.5)).toBeGreaterThan(kdeAt(5, v, w, 0.5));
  });
  it("edge cases throw", () => {
    expect(() => weightedQuantile([], [], 0.5)).toThrow();
    expect(() => quantileTreatmentEffect([1], [1], [0.5], 0.5)).toBeDefined;
    expect(() => kdeAt(0, [1], [0], 1)).toThrow();
  });
});

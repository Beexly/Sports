
import { describe, expect, it } from "vitest";
import { doublyRobustAtt, ipwAtt, smd, trimPs } from "./ipw-template";

describe("ipw-template", () => {
  it("smd is ~0 for balanced covariates, large for imbalanced", () => {
    const t = [1, 1, 1, 1, 0, 0, 0, 0];
    expect(Math.abs(smd([1, 2, 3, 4, 1, 2, 3, 4], t))).toBeLessThan(0.01);
    expect(Math.abs(smd([5, 6, 7, 8, 1, 2, 3, 4], t))).toBeGreaterThan(1);
  });
  it("ipwAtt recovers a known effect under ignorability", () => {
    const y: number[] = [];
    const t: number[] = [];
    const ps: number[] = [];
    for (let i = 0; i < 200; i++) {
      const ti = i % 2;
      t.push(ti);
      ps.push(0.5);
      y.push(ti * 2 + (i % 7) * 0.01);
    }
    const r = ipwAtt({ y, t, ps });
    expect(r.att).toBeCloseTo(2, 0);
    expect(r.ciLower).toBeLessThan(r.att);
    expect(r.ciUpper).toBeGreaterThan(r.att);
  });
  it("doublyRobustAtt matches the raw diff under correct outcome models", () => {
    const y = [3, 1, 4, 2];
    const t = [1, 0, 1, 0];
    const dr = doublyRobustAtt(y, t, [0.5, 0.5, 0.5, 0.5], [3.5, 3.5, 3.5, 3.5], [1.5, 1.5, 1.5, 1.5]);
    expect(dr).toBeCloseTo(2, 8);
  });
  it("trimPs clamps extremes", () => {
    expect(trimPs([0, 1, 0.5])).toEqual([0.025, 0.975, 0.5]);
  });
  it("edge cases throw", () => {
    expect(() => ipwAtt({ y: [], t: [], ps: [] })).toThrow();
    expect(() => smd([1], [1])).toThrow();
  });
});

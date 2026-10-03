
import { describe, expect, it } from "vitest";
import { actOnEpv, bootstrapSe, errorScaledThreshold } from "./bootstrap-epv-scaling";

describe("bootstrap-epv-scaling", () => {
  it("bootstrapSe is ~0 for constant values", () => {
    const v = new Array(40).fill(1.5);
    const c = v.map((_, i) => Math.floor(i / 4));
    expect(bootstrapSe(v, c, 200, 7)).toBeLessThan(1e-9);
  });
  it("bootstrapSe grows with noisier data", () => {
    // Between-cluster heterogeneity drives the cluster-bootstrap SE: calm
    // clusters alternate means 1 / 1.01, noisy clusters alternate 1 / 3.
    const c = Array.from({ length: 40 }, (_, i) => Math.floor(i / 4));
    const calm = c.map((cid) => 1 + (cid % 2) * 0.01);
    const noisy = c.map((cid) => 1 + (cid % 2) * 2);
    expect(bootstrapSe(noisy, c, 300, 7)).toBeGreaterThan(bootstrapSe(calm, c, 300, 7));
  });
  it("errorScaledThreshold adds z*se to the base edge", () => {
    expect(errorScaledThreshold(0.1, 0.05, 2)).toBeCloseTo(0.2, 10);
  });
  it("actOnEpv requires the edge to clear the bar", () => {
    expect(actOnEpv(0.2, 0.05, 1.64)).toBe(true);
    expect(actOnEpv(0.05, 0.05, 1.64)).toBe(false);
  });
  it("edge cases throw", () => {
    expect(() => bootstrapSe([], [], 10)).toThrow();
    expect(() => errorScaledThreshold(0, -1)).toThrow();
  });
});

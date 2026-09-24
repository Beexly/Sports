import { describe, expect, it } from "vitest";
import { dtwDistance, relativeImprovement, latentcfGatePasses, DEFAULT_LATENTCF, GSE_LATENTCF_ENABLED } from "./latentcf-config-2405.js";

describe("latentcf config", () => {
  it("dtw distance is 0 on identical sequences", () => {
    expect(dtwDistance([1, 2, 3], [1, 2, 3])).toBe(0);
  });
  it("dtw aligns stretched sequences cheaply", () => {
    expect(dtwDistance([1, 1, 2, 2], [1, 2])).toBe(0);
  });
  it("dtw is Infinity on empty input", () => {
    expect(dtwDistance([], [1])).toBe(Infinity);
  });
  it("relative improvement is positive when candidate is better", () => {
    expect(relativeImprovement(100, 70)).toBeCloseTo(0.3, 10);
  });
  it("gate needs >=25% on both metrics", () => {
    expect(latentcfGatePasses(100, 70, 100, 70)).toBe(true);
    expect(latentcfGatePasses(100, 80, 100, 70)).toBe(false);
    expect(DEFAULT_LATENTCF.latentDim).toBe(32);
  });
  it("stays off until Table II reproduces", () => {
    expect(GSE_LATENTCF_ENABLED).toBe(false);
  });
});


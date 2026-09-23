// Tests for 2605.02611 Lipschitz forcing (additive; not wired into any publish path).
import { describe, it, expect } from "vitest";
import {
  euclid,
  lipschitzEnvelope,
  forcedLabel,
  localLipschitz,
  forcingGatePasses,
} from "./2605-02611-lipschitz-forcing.js";

describe("lipschitzEnvelope", () => {
  it("interpolates labeled scores with Lipschitz slack", () => {
    // Labels [2, -1] at distance sqrt(2) need L >= 3/sqrt(2); use L = 3.
    // At a labeled point the envelope collapses to the label.
    const [lo, hi] = lipschitzEnvelope([1, 0], [[1, 0], [0, 1]], [2, -1], 3);
    expect(lo).toBeCloseTo(2, 10);
    expect(hi).toBeCloseTo(2, 10);
    // Midway, the envelope widens but stays valid.
    const [lo2, hi2] = lipschitzEnvelope([0.5, 0.5], [[1, 0], [0, 1]], [2, -1], 3);
    expect(lo2).toBeLessThan(hi2);
    expect(lo2).toBeLessThanOrEqual(2);
    expect(hi2).toBeGreaterThanOrEqual(-1);
  });
});

describe("forcedLabel", () => {
  it("classifies envelope positions", () => {
    expect(forcedLabel([0.5, 2])).toBe("post");
    expect(forcedLabel([-2, -0.5])).toBe("dont-post");
    expect(forcedLabel([-1, 1])).toBe("unforced");
  });
});

describe("localLipschitz", () => {
  it("tightens below the global constant in smooth regions", () => {
    const emb = [
      [0, 0],
      [1, 0],
      [10, 0],
    ];
    const scores = [0, 0.1, 5];
    // Near [0,0], the local slope is 0.1 < global 10.
    expect(localLipschitz([0, 0], emb, scores, 2, 10)).toBeCloseTo(0.1, 10);
    // Never exceeds the global constant.
    expect(localLipschitz([5, 0], emb, scores, 20, 10)).toBeLessThanOrEqual(10);
  });
});

describe("forcingGatePasses", () => {
  it("requires +1 ROI point at matched coverage", () => {
    const ok = forcingGatePasses(0.06, 0.045, 0.7, 0.71);
    expect(ok.liftPoints).toBeCloseTo(1.5, 8);
    expect(ok.coverageMatched).toBe(true);
    expect(ok.passes).toBe(true);
    expect(forcingGatePasses(0.05, 0.045, 0.7, 0.71).passes).toBe(false);
    expect(forcingGatePasses(0.06, 0.045, 0.7, 0.8).passes).toBe(false);
  });
});

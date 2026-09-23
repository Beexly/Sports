import { describe, it, expect } from "vitest";
import {
  ewcPenalty,
  ewcGradient,
  anchoredStep,
  importanceOverlap,
  overlapRegime,
} from "./1612-00796v2-ewc-feature-anchoring.js";

describe("ewcPenalty", () => {
  it("is zero at the reference and grows quadratically with distance", () => {
    const ref = [0.5, 0.3, 0.2];
    const imp = [0.5, 0.3, 0.2];
    expect(ewcPenalty(ref, ref, imp, 10)).toBe(0);
    const d1 = ewcPenalty([0.6, 0.3, 0.2], ref, imp, 10);
    const d2 = ewcPenalty([0.7, 0.3, 0.2], ref, imp, 10);
    expect(d2).toBeCloseTo(4 * d1, 10);
  });
  it("penalizes important features more than unimportant ones", () => {
    const ref = [0.5, 0.5];
    const pHigh = ewcPenalty([0.6, 0.5], ref, [0.9, 0.1], 2);
    const pLow = ewcPenalty([0.5, 0.6], ref, [0.9, 0.1], 2);
    expect(pHigh).toBeGreaterThan(pLow);
  });
});

describe("anchoredStep", () => {
  it("restrains high-importance features more than plain SGD", () => {
    const current = [0.5, 0.5];
    const grad = [1, 1];
    const ref = [0.5, 0.5];
    const imp = [0.95, 0.05];
    const anchored = anchoredStep(current, grad, ref, imp, 20, 0.1);
    const plain = current.map((s, i) => s - 0.1 * grad[i]!);
    // both move, but the important feature is pulled back toward reference harder
    // once displaced: displace first, then compare the anchor pull.
    // (small lr so the penalty does not overshoot the reference)
    const displaced = [0.8, 0.8];
    const re = anchoredStep(displaced, [0, 0], ref, imp, 20, 0.02);
    expect(Math.abs(re[0]! - ref[0]!)).toBeLessThan(Math.abs(re[1]! - ref[1]!));
    expect(anchored[0]!).toBeLessThan(plain[0]! + 1e-12);
  });
  it("gradient matches finite differences", () => {
    const cur = [0.4, 0.7, 0.2];
    const ref = [0.5, 0.5, 0.5];
    const imp = [0.6, 0.3, 0.1];
    const g = ewcGradient(cur, ref, imp, 4);
    const eps = 1e-6;
    for (let i = 0; i < 3; i++) {
      const up = [...cur];
      up[i]! += eps;
      const num = (ewcPenalty(up, ref, imp, 4) - ewcPenalty(cur, ref, imp, 4)) / eps;
      expect(g[i]!).toBeCloseTo(num, 4);
    }
  });
});

describe("importanceOverlap", () => {
  it("is 1 for identical vectors and classifies regimes", () => {
    expect(importanceOverlap([0.5, 0.3, 0.2], [0.5, 0.3, 0.2])).toBeCloseTo(1, 10);
    expect(importanceOverlap([1, 0, 0], [0, 0, 1])).toBeCloseTo(0, 10);
    expect(overlapRegime(0.9)).toBe("shared-representation");
    expect(overlapRegime(0.2)).toBe("regime-specific");
  });
});

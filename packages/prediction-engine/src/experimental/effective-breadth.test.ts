
import { describe, expect, it } from "vitest";
import { effectiveBreadth, entropyBreadth, isTopHeavy, normalize } from "./effective-breadth";

describe("effective-breadth", () => {
  it("uniform field has breadth n", () => {
    expect(effectiveBreadth([1, 1, 1, 1])).toBeCloseTo(4, 10);
    expect(entropyBreadth([1, 1, 1, 1])).toBeCloseTo(4, 10);
  });
  it("degenerate field has breadth 1", () => {
    expect(effectiveBreadth([1, 0, 0, 0])).toBeCloseTo(1, 10);
  });
  it("breadth shrinks as the field gets top-heavy", () => {
    expect(effectiveBreadth([10, 1, 1, 1])).toBeLessThan(effectiveBreadth([3, 3, 3, 3]));
  });
  it("isTopHeavy flags concentrated slates", () => {
    expect(isTopHeavy([20, 1, 1, 1])).toBe(true);
    expect(isTopHeavy([3, 3, 3, 3])).toBe(false);
    // Boundary: [10,1,1,1] has breadth ~1.64 vs threshold 1.6 -> not flagged.
    expect(isTopHeavy([10, 1, 1, 1])).toBe(false);
  });
  it("edge cases throw", () => {
    expect(() => normalize([])).toThrow();
    expect(() => normalize([0, 0])).toThrow();
  });
});

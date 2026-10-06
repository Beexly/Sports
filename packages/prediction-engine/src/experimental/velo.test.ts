
import { describe, expect, it } from "vitest";
import { eloExpected, veloEloUpdate, veloVarianceUpdate } from "./velo";

describe("velo", () => {
  it("variance update follows Eq. 25 with the B floor", () => {
    expect(veloVarianceUpdate(100, 0.1, 2, 1)).toBeCloseTo(80, 10);
    expect(veloVarianceUpdate(1, 0.9, 5, 2)).toBe(4); // floored at B^2
  });
  it("variance never increases through the update", () => {
    expect(veloVarianceUpdate(100, 0.1, 2, 0)).toBeLessThanOrEqual(100);
  });
  it("Elo mean update moves toward the result", () => {
    const out = veloEloUpdate(1500, 100, 1500, 1, 1, { A: 0.05, B: 1, K: 20 });
    expect(out.rating).toBeGreaterThan(1500);
    expect(eloExpected(1500, 1500)).toBeCloseTo(0.5, 10);
  });
  it("rejects negative variance", () => {
    expect(() => veloVarianceUpdate(-1, 0.1, 1, 1)).toThrow();
  });
});

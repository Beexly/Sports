
import { describe, expect, it } from "vitest";
import { flGlm, multiplicativeNormalize, ooEpc } from "./oo-epc";

describe("oo-epc", () => {
  it("ooEpc outputs sum to the target and stay nonnegative", () => {
    const out = ooEpc([2.0, 3.0, 4.0]);
    expect(out.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 8);
    expect(Math.min(...out)).toBeGreaterThanOrEqual(0);
  });
  it("ooEpc favors the favorite less naively than raw implied", () => {
    // Overround present: 1/1.5 + 1/2.8 = 1.024 > 1, so z > 0 and the
    // favorite's probability is shaved below raw implied.
    const out = ooEpc([1.5, 2.8]);
    expect(out[0] ?? 0).toBeGreaterThan(out[1] ?? 0);
    expect(out[0] ?? 0).toBeLessThan(1 / 1.5); // overround removed
  });
  it("multiplicativeNormalize is the overround-proportional baseline", () => {
    const out = multiplicativeNormalize([2, 2]);
    expect(out).toEqual([0.5, 0.5]);
  });
  it("flGlm concentrates mass as beta grows", () => {
    const low = flGlm([1.5, 4.0], 0.5);
    const high = flGlm([1.5, 4.0], 3);
    expect(high[0] ?? 0).toBeGreaterThan(low[0] ?? 0);
    expect(high.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 10);
  });
  it("edge cases throw on bad odds", () => {
    expect(() => ooEpc([])).toThrow();
    expect(() => ooEpc([1.0])).toThrow();
    expect(() => flGlm([2], 0)).toThrow();
  });
  // Regression: ooEpc used to renormalize its output to sum 1, which silently
  // discarded a non-unit target. These fail against the old implementation.
  it("honours a non-unit target instead of renormalizing to 1", () => {
    const out = ooEpc([2.0, 3.0, 4.0], 0.9);
    expect(out.reduce((s, v) => s + v, 0)).toBeCloseTo(0.9, 10);
    expect(out.reduce((s, v) => s + v, 0)).not.toBeCloseTo(1, 6);
  });
  it("rejects a non-positive target", () => {
    expect(() => ooEpc([2.0, 3.0], 0)).toThrow(/target must be positive/);
    expect(() => ooEpc([2.0, 3.0], -1)).toThrow(/target must be positive/);
  });
  // Regression: the old implementation clamped negative shifted components to
  // zero with Math.max(v, 0), fabricating a simplex point from an infeasible
  // shift. It must throw instead.
  it("throws rather than clamping when the z-shift leaves the simplex", () => {
    // One heavy favourite plus several longshots: the longshots have a large
    // sigma, so a hard z-shift drives them negative. Uniform odds would NOT do
    // this (they are degenerate — every component lands on target/n).
    const skewed = [1.01, 10, 10, 10, 10, 10];
    expect(() => ooEpc(skewed, 0.2)).toThrow(/infeasible|negative/);
  });
});

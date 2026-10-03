
import { describe, expect, it } from "vitest";
import { aciInterval, aciUpdate, adaptiveQuantile } from "./temporal-conformal";

describe("temporal-conformal", () => {
  it("aciUpdate lowers alpha after a miss (wider), raises after coverage", () => {
    // Standard Gibbs & Candès ACI: a miss means intervals must widen, i.e. the
    // miscoverage level alpha drops; coverage lets alpha drift back up.
    const s = { alpha: 0.1 };
    expect(aciUpdate(s, false, 0.1).alpha).toBeLessThan(0.1);
    expect(aciUpdate(s, true, 0.1).alpha).toBeGreaterThan(0.1);
  });
  it("alpha stays in (0, 0.5]", () => {
    let s = { alpha: 0.1 };
    for (let i = 0; i < 100; i++) s = aciUpdate(s, false, 0.1, 0.5);
    expect(s.alpha).toBeLessThanOrEqual(0.5);
  });
  it("adaptiveQuantile is the (1-alpha) empirical quantile", () => {
    expect(adaptiveQuantile([1, 2, 3, 4], 0.25)).toBe(3);
  });
  it("aciInterval returns an interval and the updated state", () => {
    const r = aciInterval({ alpha: 0.1 }, 50, [1, 2, 3, 4], true);
    expect(r.lower).toBeLessThan(50);
    expect(r.upper).toBeGreaterThan(50);
    expect(r.state.alpha).toBeGreaterThan(0.1);
  });
  it("edge cases throw", () => {
    expect(() => adaptiveQuantile([], 0.1)).toThrow();
    expect(() => aciUpdate({ alpha: 0.1 }, true, 0.1, 0)).toThrow();
  });
});

import { describe, expect, it } from "vitest";
import { applyIsotonic, fitIsotonicPava, pava } from "@/lib/calibration/isotonic-pava";

describe("pava core", () => {
  it("returns nondecreasing block means", () => {
    const out = pava([0.9, 0.1, 0.2, 0.8], [1, 1, 1, 1]);
    for (let i = 1; i < out.length; i++) {
      expect(out[i]!).toBeGreaterThanOrEqual(out[i - 1]! - 1e-12);
    }
  });

  it("identity when already monotone", () => {
    const y = [0.1, 0.2, 0.5, 0.9];
    expect(pava(y)).toEqual(y);
  });
});

describe("fitIsotonicPava", () => {
  it("empty → flat 0.5", () => {
    const m = fitIsotonicPava([]);
    expect(m.y[0]).toBe(0.5);
  });

  it("nondecreasing map in (0,1); apply bounded", () => {
    const samples = Array.from({ length: 200 }, (_, i) => {
      const p = 0.05 + (0.9 * i) / 199;
      const y = (p > 0.55 ? 1 : 0) as 0 | 1;
      return { p, y };
    });
    const m = fitIsotonicPava(samples);
    for (let i = 1; i < m.y.length; i++) {
      expect(m.y[i]!).toBeGreaterThanOrEqual(m.y[i - 1]! - 1e-9);
    }
    for (const v of m.y) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(1);
    }
    expect(applyIsotonic(0.2, m)).toBeLessThanOrEqual(applyIsotonic(0.8, m) + 1e-9);
  });
});

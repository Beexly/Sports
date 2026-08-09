import { describe, expect, it } from "vitest";
import { applyIsotonic, fitIsotonicPava } from "@/lib/calibration/isotonic-pava";

describe("isotonic PAVA", () => {
  it("empty → flat", () => {
    const m = fitIsotonicPava([]);
    expect(m.y.every((v) => v === 0.5 || v > 0)).toBe(true);
  });

  it("fitted map is nondecreasing and in (0,1)", () => {
    const samples = Array.from({ length: 200 }, (_, i) => {
      const p = (i % 100) / 100;
      const y = (p > 0.5 ? 1 : 0) as 0 | 1;
      return { p: Math.max(0.05, Math.min(0.95, p)), y };
    });
    const m = fitIsotonicPava(samples, 10);
    for (let i = 1; i < m.y.length; i++) {
      expect(m.y[i]!).toBeGreaterThanOrEqual(m.y[i - 1]! - 1e-9);
    }
    for (const v of m.y) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(1);
    }
    const q = applyIsotonic(0.7, m);
    expect(q).toBeGreaterThan(0);
    expect(q).toBeLessThan(1);
  });
});

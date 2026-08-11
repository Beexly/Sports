import { describe, expect, it } from "vitest";
import { conformalQuantile, cqrInterval, CQR_PRODUCT_NOTES } from "@/lib/calibration/cqr";

describe("CQR", () => {
  it("conformal quantile finite-sample", () => {
    const s = [0.1, 0.2, 0.3, 0.5, 0.8];
    const q = conformalQuantile(s, 0.1);
    expect(q).toBeGreaterThan(0);
    expect(q).toBeLessThanOrEqual(0.8);
  });

  it("expands intervals by qhat", () => {
    const yCal = [2, 3, 4, 5, 6];
    const qLoCal = [0.5, 1.5, 2.5, 3.5, 4.5];
    const qHiCal = [1.5, 2.5, 3.5, 4.5, 5.5];
    const { lo, hi, qhat } = cqrInterval(
      [10, 20],
      [12, 22],
      yCal,
      qLoCal,
      qHiCal,
      0.1,
    );
    expect(qhat).toBeGreaterThanOrEqual(0);
    expect(lo[0]!).toBeLessThanOrEqual(10);
    expect(hi[0]!).toBeGreaterThanOrEqual(12);
  });

  it("does not unlock PROVEN", () => {
    expect(CQR_PRODUCT_NOTES.unlocksProven).toBe(false);
    expect(CQR_PRODUCT_NOTES.defaultOff).toBe(true);
  });
});

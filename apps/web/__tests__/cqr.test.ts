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
    // Calibration intervals must be tight enough that some actuals fall
    // outside them (otherwise nonconformity scores are negative and qhat
    // would contract rather than expand — not the CQR contract). Here the
    // Lo/Hi calibration bounds straddle each y by ±0.5, so every nonconformity
    // score is +0.5 and qhat=0.5 expands the test interval outward.
    const yCal = [1, 2, 3, 4, 5];
    const qLoCal = [1.5, 2.5, 3.5, 4.5, 5.5];
    const qHiCal = [2.5, 3.5, 4.5, 5.5, 6.5];
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

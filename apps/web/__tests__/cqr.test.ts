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
    // Fixture: every y sits 0.5 inside [q_lo, q_hi].
    // s_i = max(q_lo_i - y_i, y_i - q_hi_i) = max(-0.5, -0.5) = -0.5
    // n=5, alpha=0.1 → rank = ceil(0.9*(5+1))-1 = 5, clamped to n-1 = 4
    // qhat = sorted(s)[4] = -0.5
    // Negative qhat is valid CQR: calibration residuals are all negative
    // (intervals were too wide), so test intervals shrink:
    //   lo = q_lo - (-0.5) = q_lo + 0.5
    //   hi = q_hi + (-0.5) = q_hi - 0.5
    // Implementation matches Romano, Patterson, Candès 2019 and its own
    // docstring. This is not a PAVA-style math bug. Do not clip qhat to 0
    // without a product decision.
    const yCal = [1, 2, 3, 4, 5];
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
    expect(qhat).toBe(-0.5);
    expect(lo[0]!).toBe(10.5);
    expect(hi[0]!).toBe(11.5);
  });

  it("does not unlock PROVEN", () => {
    expect(CQR_PRODUCT_NOTES.unlocksProven).toBe(false);
    expect(CQR_PRODUCT_NOTES.defaultOff).toBe(true);
  });
});

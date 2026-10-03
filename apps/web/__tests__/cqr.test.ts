import { describe, expect, it } from "vitest";
import { conformalQuantile, cqrInterval, CQR_PRODUCT_NOTES } from "@/lib/calibration/cqr";

describe("CQR", () => {
  it("conformal quantile finite-sample", () => {
    // Fail-closed: at α=0.1, ceil(0.9*(n+1)) > n when n < 9, so the
    // quantile is undefined — return +∞ rather than clamp the rank.
    const small = [0.1, 0.2, 0.3, 0.5, 0.8];
    expect(conformalQuantile(small, 0.1)).toBe(Number.POSITIVE_INFINITY);

    // n=9 is the smallest finite case at α=0.1:
    // rank = ceil(0.9*10)-1 = 8 < 9 → sorted[8]
    const s = [0.1, 0.2, 0.3, 0.4, 0.5, 0.55, 0.6, 0.7, 0.8];
    const q = conformalQuantile(s, 0.1);
    expect(q).toBe(0.8);
  });

  it("expands intervals by qhat", () => {
    // Fixture: every y sits 0.5 inside [q_lo, q_hi].
    // s_i = max(q_lo_i - y_i, y_i - q_hi_i) = max(-0.5, -0.5) = -0.5
    // n=9, alpha=0.1 → rank = ceil(0.9*(9+1))-1 = 8 < 9
    // qhat = sorted(s)[8] = -0.5
    // Negative qhat is valid CQR: calibration residuals are all negative
    // (intervals were too wide), so test intervals shrink:
    //   lo = q_lo - (-0.5) = q_lo + 0.5
    //   hi = q_hi + (-0.5) = q_hi - 0.5
    // Implementation matches Romano, Patterson, Candès 2019 and its own
    // docstring. This is not a PAVA-style math bug. Do not clip qhat to 0
    // without a product decision.
    const yCal = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const qLoCal = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5];
    const qHiCal = [1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5];
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

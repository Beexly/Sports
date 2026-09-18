import { describe, expect, it } from "vitest";
import { conformalQuantile, cqrInterval, CQR_PRODUCT_NOTES } from "@/lib/calibration/cqr";

describe("CQR", () => {
  it("n=5 α=0.1 cannot support the quantile — Inf, not a clamp onto 0.8", () => {
    const s = [0.1, 0.2, 0.3, 0.5, 0.8];
    expect(conformalQuantile(s, 0.1)).toBe(Number.POSITIVE_INFINITY);
  });

  it("empty calibration is unlicensed ±∞, never qhat 0", () => {
    const { lo, hi, qhat, licensed } = cqrInterval([10], [12], [], [], [], 0.1);
    expect(licensed).toBe(false);
    expect(qhat).toBe(Number.POSITIVE_INFINITY);
    expect(lo[0]).toBe(Number.NEGATIVE_INFINITY);
    expect(hi[0]).toBe(Number.POSITIVE_INFINITY);
  });

  it("expands intervals by qhat when n supports the quantile", () => {
    // Fixture: every y sits 0.5 inside [q_lo, q_hi].
    // s_i = max(q_lo_i - y_i, y_i - q_hi_i) = -0.5
    // n=20, alpha=0.1 → rank = ceil(0.9*21)-1 = 18 ≤ 19, finite
    // qhat = -0.5. Negative qhat is valid CQR (Romano, Patterson, Candès 2019).
    const yCal = Array.from({ length: 20 }, (_, i) => i + 1);
    const qLoCal = yCal.map((y) => y - 0.5);
    const qHiCal = yCal.map((y) => y + 0.5);
    const { lo, hi, qhat, licensed } = cqrInterval(
      [10, 20],
      [12, 22],
      yCal,
      qLoCal,
      qHiCal,
      0.1,
    );
    expect(licensed).toBe(true);
    expect(qhat).toBe(-0.5);
    expect(lo[0]!).toBe(10.5);
    expect(hi[0]!).toBe(11.5);
  });

  it("does not unlock PROVEN", () => {
    expect(CQR_PRODUCT_NOTES.unlocksProven).toBe(false);
    expect(CQR_PRODUCT_NOTES.defaultOff).toBe(true);
  });
});

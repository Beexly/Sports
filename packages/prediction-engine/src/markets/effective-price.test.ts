import { describe, expect, it } from "vitest";
import { bookFeeGap, effectiveEv, isSignFlip, postedEv, signFlipRate } from "./effective-price";

describe("effective-price", () => {
  it("fee shifts EV down by exactly the fee", () => {
    const pick = { p: 0.6, odds: 2.0, stake: 100, fee: 5 };
    expect(postedEv(pick)).toBeCloseTo(20, 10);
    expect(effectiveEv(pick)).toBeCloseTo(15, 10);
  });
  it("isSignFlip catches posted-+EV / effective--EV", () => {
    // Posted EV = +2, fee 5 -> effective -3.
    const flip = { p: 0.51, odds: 2.0, stake: 100, fee: 5 };
    expect(postedEv(flip)).toBeGreaterThan(0);
    expect(isSignFlip(flip)).toBe(true);
    const clean = { p: 0.6, odds: 2.0, stake: 100, fee: 5 };
    expect(isSignFlip(clean)).toBe(false);
    const neg = { p: 0.4, odds: 2.0, stake: 100, fee: 5 };
    expect(isSignFlip(neg)).toBe(false); // posted -EV: not a flip
  });
  it("signFlipRate is the adoption metric", () => {
    const picks = [
      { p: 0.51, odds: 2.0, stake: 100, fee: 5 }, // flips
      { p: 0.6, odds: 2.0, stake: 100, fee: 5 },  // stays +
      { p: 0.4, odds: 2.0, stake: 100, fee: 5 },  // posted -, excluded
    ];
    expect(signFlipRate(picks)).toBeCloseTo(0.5, 12);
    expect(signFlipRate([])).toBe(0);
  });
  it("bookFeeGap summarizes the per-book gap", () => {
    const picks = [
      { p: 0.51, odds: 2.0, stake: 100, fee: 5 },
      { p: 0.6, odds: 2.0, stake: 100, fee: 5 },
    ];
    const g = bookFeeGap(picks);
    expect(g.meanFee).toBeCloseTo(5, 12);
    expect(g.flipShare).toBeCloseTo(0.5, 12);
    expect(() => bookFeeGap([])).toThrow();
  });
  it("throws on degenerate inputs", () => {
    expect(() => postedEv({ p: 2, odds: 2, stake: 1, fee: 0 })).toThrow();
    expect(() => postedEv({ p: 0.5, odds: 1, stake: 1, fee: 0 })).toThrow();
    expect(() => effectiveEv({ p: 0.5, odds: 2, stake: 1, fee: -1 })).toThrow();
  });
});

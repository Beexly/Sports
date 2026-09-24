import { describe, expect, it } from "vitest";
import {
  bucketPayouts,
  fitPowerLawAlpha,
  niceNumber,
  powerLawShares,
} from "./payout-framework";

describe("payout-framework", () => {
  it("fitPowerLawAlpha recovers the winner share", () => {
    const alpha = fitPowerLawAlpha(100, 0.3);
    const shares = powerLawShares(100, alpha);
    expect(shares[0]).toBeCloseTo(0.3, 6);
  });

  it("shares sum to 1 and decay with rank", () => {
    const s = powerLawShares(50, 1.2);
    expect(s.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(s[0]!).toBeGreaterThan(s[1]!);
    expect(s[1]!).toBeGreaterThan(s[49]!);
  });

  it("single paid spot gets everything", () => {
    expect(powerLawShares(1, 2)).toEqual([1]);
  });

  it("bucketing covers all paid ranks with nice numbers", () => {
    const buckets = bucketPayouts(10000, 100, 1.1);
    expect(buckets[0]!.rankStart).toBe(1);
    expect(buckets[buckets.length - 1]!.rankEnd).toBe(100);
    const paid = buckets.reduce(
      (s, b) => s + (b.rankEnd - b.rankStart + 1) * b.prizePerWinner,
      0,
    );
    expect(paid).toBeLessThanOrEqual(10000 * 1.06); // within tolerance + rounding
    expect(paid).toBeGreaterThan(0);
  });

  it("niceNumber rounds down the ladder", () => {
    expect(niceNumber(37)).toBe(20);
    expect(niceNumber(96)).toBe(50);
    expect(niceNumber(5)).toBe(5);
    expect(niceNumber(0)).toBe(0);
  });

  it("rejects invalid inputs", () => {
    expect(() => fitPowerLawAlpha(0, 0.3)).toThrow();
    expect(() => fitPowerLawAlpha(10, 1.5)).toThrow();
    expect(() => powerLawShares(0, 1)).toThrow();
  });
});

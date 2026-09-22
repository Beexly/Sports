
import { describe, expect, it } from "vitest";
import { bucketRoi, flbSlope } from "./favorite-longshot-audit";

describe("favorite-longshot-audit", () => {
  it("bucketRoi computes flat-stakes ROI", () => {
    const buckets = [
      { label: "fav", minOdds: 1.1, maxOdds: 1.9, implied: [0.7, 0.7], outcomes: [1, 0] },
    ];
    const r = bucketRoi(buckets);
    // win at dec 1/0.7: +0.4286; loss: -1 -> roi = -0.2857
    expect(r[0]?.roi).toBeCloseTo(-0.2857, 3);
    expect(r[0]?.outcomeRate).toBe(0.5);
  });
  it("flbSlope is ~1 for unbiased buckets", () => {
    const mk = (imp: number, rate: number) => ({ label: "b", n: 100, roi: 0, outcomeRate: rate, meanImplied: imp });
    expect(flbSlope([mk(0.7, 0.7), mk(0.3, 0.3), mk(0.5, 0.5)])).toBeCloseTo(1, 6);
  });
  it("flbSlope > 1 under favorite-longshot bias", () => {
    const mk = (imp: number, rate: number) => ({ label: "b", n: 100, roi: 0, outcomeRate: rate, meanImplied: imp });
    // FLB: favorites win MORE than implied, longshots win LESS -> realized
    // logits are more extreme than implied logits -> OLS slope > 1.
    expect(flbSlope([mk(0.8, 0.83), mk(0.5, 0.5), mk(0.2, 0.15)])).toBeGreaterThan(1);
    // Anti-FLB (compressed reality) -> slope < 1.
    expect(flbSlope([mk(0.8, 0.77), mk(0.5, 0.5), mk(0.2, 0.25)])).toBeLessThan(1);
  });
  it("edge cases throw", () => {
    expect(() => flbSlope([])).toThrow();
  });
});

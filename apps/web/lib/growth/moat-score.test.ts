import { describe, expect, it } from "vitest";
import { moatScore, type MoatInputs } from "./moat-score";

const BASE: MoatInputs = {
  labeledShadowN: 9,
  publicPacketStreakWeeks: 4,
  sdkStars: 99,
  uniqueReceiptVerifies7d: 19,
  distinctSurfacesGoverned: 3,
  cutoffNStar: 999,
};

describe("moatScore", () => {
  it("matches a hand-computed fixture value", () => {
    // By hand:
    //   ln(1+9)   * 3 = ln(10)   * 3 = 2.302585092994046 * 3 = 6.907755278982137
    //   4         * 2 =                                        8
    //   ln(1+99)  * 2 = ln(100)  * 2 = 4.605170185988091 * 2 = 9.210340371976182
    //   ln(1+19)  * 3 = ln(20)   * 3 = 2.995732273553991 * 3 = 8.987196820661973
    //   3         * 2 =                                        6
    //   ln(1+999)     = ln(1000)     =                          6.907755278982137
    // sum = 46.01304775060243
    expect(moatScore(BASE)).toBeCloseTo(46.01304775060243, 9);
  });

  const keys = Object.keys(BASE) as (keyof MoatInputs)[];

  it.each(keys)("is monotonic non-decreasing in %s", (key) => {
    const lower = moatScore(BASE);
    const bumped: MoatInputs = { ...BASE, [key]: BASE[key] + 5 };
    const higher = moatScore(bumped);
    expect(higher).toBeGreaterThan(lower);
  });

  it("never decreases when any single input increases from zero", () => {
    const zeroed: MoatInputs = {
      labeledShadowN: 0,
      publicPacketStreakWeeks: 0,
      sdkStars: 0,
      uniqueReceiptVerifies7d: 0,
      distinctSurfacesGoverned: 0,
      cutoffNStar: 0,
    };
    const zeroScore = moatScore(zeroed);
    for (const key of keys) {
      const bumped: MoatInputs = { ...zeroed, [key]: 10 };
      expect(moatScore(bumped)).toBeGreaterThanOrEqual(zeroScore);
    }
  });
});

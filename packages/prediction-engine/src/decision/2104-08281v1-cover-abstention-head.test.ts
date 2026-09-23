// Tests for decision/2104-08281v1-cover-abstention-head.ts (vitest).
import { describe, it, expect } from "vitest";
import {
  notWrongLoss,
  coverPublishRule,
  coverPrediction,
  calibrateAbstainTau,
  coveredAccuracy,
  abstentionAttribution,
  coverAbstentionGatePasses,
} from "./2104-08281v1-cover-abstention-head.js";

describe("notWrongLoss (2104.08281v1)", () => {
  it("lets abstention absorb uncertain mass", () => {
    // Uncertain: p_correct = 0.3. Abstaining (pA=0.5) beats committing.
    expect(notWrongLoss(0.3, 0.5, 1.0)).toBeLessThan(notWrongLoss(0.3, 0.01, 1.0));
  });
  it("does not reward abstention when confident and right", () => {
    expect(notWrongLoss(0.9, 0.01, 1.0)).toBeLessThan(notWrongLoss(0.9, 0.5, 1.0));
  });
  it("alpha scales the abstention penalty", () => {
    const low = notWrongLoss(0.5, 0.4, 0.1);
    const high = notWrongLoss(0.5, 0.4, 5.0);
    expect(high).toBeGreaterThan(low);
  });
});

describe("coverPublishRule", () => {
  it("publishes iff argmax != abstain class", () => {
    expect(coverPublishRule({ pCover: 0.6, pNoCover: 0.3, pAbstain: 0.1 })).toBe(true);
    expect(coverPublishRule({ pCover: 0.3, pNoCover: 0.3, pAbstain: 0.4 })).toBe(false);
    expect(coverPublishRule({ pCover: 0.45, pNoCover: 0.45, pAbstain: 0.45 })).toBe(false); // tie -> abstain wins
  });
  it("coverPrediction picks the argmax side", () => {
    expect(coverPrediction({ pCover: 0.6, pNoCover: 0.3, pAbstain: 0.1 })).toBe("cover");
    expect(coverPrediction({ pCover: 0.2, pNoCover: 0.7, pAbstain: 0.1 })).toBe("no-cover");
  });
});

describe("calibrateAbstainTau", () => {
  it("reproduces the target publish fraction", () => {
    const val = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map((pAbstain) => ({
      pCover: 0.5,
      pNoCover: 0.4,
      pAbstain,
    }));
    const tau = calibrateAbstainTau(val, 0.7);
    const published = val.filter((o) => o.pAbstain < tau).length;
    expect(published).toBe(7);
  });
});

describe("coveredAccuracy", () => {
  it("scores only published picks", () => {
    const outputs = [
      { pCover: 0.8, pNoCover: 0.1, pAbstain: 0.1 }, // published, correct
      { pCover: 0.2, pNoCover: 0.7, pAbstain: 0.1 }, // published, wrong
      { pCover: 0.4, pNoCover: 0.4, pAbstain: 0.5 }, // abstained (0.5 > max class)
    ];
    expect(coveredAccuracy(outputs, [true, true, true])).toBeCloseTo(0.5, 10);
  });
});

describe("abstentionAttribution", () => {
  it("ranks features by |value x weight|", () => {
    const attr = abstentionAttribution([0.5, -2.0], ["edge", "steam"], [1.0, 1.0]);
    expect(attr[0]!.feature).toBe("steam");
    expect(attr).toHaveLength(2);
  });
});

describe("coverAbstentionGatePasses", () => {
  it("requires +2pp, p<0.05, and NotWrong >= DAC", () => {
    const diffs = new Array<number>(300).fill(0.03);
    expect(coverAbstentionGatePasses(0.58, 0.55, 0.56, diffs)).toBe(true);
    expect(coverAbstentionGatePasses(0.565, 0.55, 0.56, diffs)).toBe(false); // <2pp
    expect(coverAbstentionGatePasses(0.58, 0.55, 0.59, diffs)).toBe(false); // DAC wins
    const noisy = new Array<number>(300).fill(0).map((_, i) => (i % 2 === 0 ? 0.4 : -0.34));
    expect(coverAbstentionGatePasses(0.58, 0.55, 0.56, noisy)).toBe(false); // insignificant
  });
});

// Tests for decision/2205-13532-training-disagreement-gate.ts (vitest).
import { describe, it, expect } from "vitest";
import {
  lateWeightedDisagreement,
  flipLineInteraction,
  nntdAbstain,
  aurcForScores,
  topDisagreementLossRate,
  nntdGatePasses,
} from "./2205-13532-training-disagreement-gate.js";

const STEADY = {
  id: "steady",
  snapshotProbs: new Array<number>(30).fill(0.7),
  finalProb: 0.7,
  finalSide: true,
  lineMoveAgainst: 0,
  won: true,
};

const LATE_FLIPPER = {
  id: "flipper",
  // Confident early, flips in the late window: 'changed its mind late'.
  snapshotProbs: [...new Array<number>(25).fill(0.75), ...new Array<number>(5).fill(0.45)],
  finalProb: 0.45,
  finalSide: false,
  lineMoveAgainst: 2.0,
  won: false,
};

describe("lateWeightedDisagreement (2205.13532)", () => {
  it("is ~0 for a steady pick and high for a late flipper", () => {
    expect(lateWeightedDisagreement(STEADY)).toBeCloseTo(0, 10);
    expect(lateWeightedDisagreement(LATE_FLIPPER)).toBeGreaterThan(0.15);
  });
  it("weights late snapshots more than early ones", () => {
    const earlyWobble = {
      ...STEADY,
      snapshotProbs: [...new Array<number>(10).fill(0.3), ...new Array<number>(20).fill(0.7)],
    };
    const lateWobble = {
      ...STEADY,
      snapshotProbs: [...new Array<number>(20).fill(0.7), ...new Array<number>(10).fill(0.3)],
    };
    // Same total deviation, but late wobble scores higher.
    expect(lateWeightedDisagreement(lateWobble)).toBeGreaterThan(lateWeightedDisagreement(earlyWobble));
  });
  it("handles empty snapshots", () => {
    expect(lateWeightedDisagreement({ ...STEADY, snapshotProbs: [] })).toBe(0);
  });
});

describe("flipLineInteraction", () => {
  it("doubly penalizes late flips with adverse line moves", () => {
    const plain = flipLineInteraction({ ...LATE_FLIPPER, lineMoveAgainst: 0 });
    const adverse = flipLineInteraction(LATE_FLIPPER);
    expect(adverse).toBeGreaterThan(plain);
    expect(flipLineInteraction(STEADY)).toBeCloseTo(0, 10);
  });
});

describe("nntdAbstain", () => {
  it("abstains on high-suspicion picks even when the final edge looks good", () => {
    const goodLooking = { ...LATE_FLIPPER, finalProb: 0.62, finalSide: true };
    expect(nntdAbstain(goodLooking, 0.05)).toBe(true);
    expect(nntdAbstain(STEADY, 0.05)).toBe(false);
  });
});

describe("aurcForScores / topDisagreementLossRate", () => {
  const picks = [STEADY, LATE_FLIPPER,
    { ...STEADY, id: "s2", won: true },
    { ...LATE_FLIPPER, id: "f2", won: false },
    { ...STEADY, id: "s3", won: false },
  ];
  it("the suspicion score ranks losses first", () => {
    const scores = picks.map((p) => flipLineInteraction(p));
    const aurc = aurcForScores(picks, scores);
    // Perfect ranking would give minimal AuRC; check it beats the base loss rate ordering.
    expect(aurc).toBeLessThan(0.5);
    expect(topDisagreementLossRate(picks, 2)).toBe(1); // top-2 suspicion are both losses
  });
});

describe("nntdGatePasses", () => {
  it("requires +5% AuRC AND loss enrichment", () => {
    expect(nntdGatePasses(0.4, 0.45, 0.7, 0.5)).toBe(true);
    expect(nntdGatePasses(0.44, 0.45, 0.7, 0.5)).toBe(false); // <5% relative
    expect(nntdGatePasses(0.4, 0.45, 0.4, 0.5)).toBe(false); // not enriched
  });
});

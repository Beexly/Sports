// Tests for decision/1907-00208v2-gambler-reservation-filter.ts (vitest).
import { describe, it, expect } from "vitest";
import {
  gamblerLoss,
  gamblerWithhold,
  gamblerFilterSlates,
  sweepReward,
  gamblerGatePasses,
} from "./1907-00208v2-gambler-reservation-filter.js";

describe("gamblerLoss (1907.00208v2)", () => {
  it("decreases in each argument: more mass or more reward -> lower loss", () => {
    expect(gamblerLoss(0.3, 0.5, 2)).toBeLessThan(gamblerLoss(0.2, 0.5, 2)); // higher pT
    expect(gamblerLoss(0.2, 0.6, 2)).toBeLessThan(gamblerLoss(0.2, 0.5, 2)); // higher pR
    expect(gamblerLoss(0.2, 0.5, 3)).toBeLessThan(gamblerLoss(0.2, 0.5, 2)); // higher o
  });
  it("with normalized allocations, the commit-vs-reserve trade-off turns on the odds o", () => {
    // pT + pR = 1 (softmax outputs): loss = -log(1 + pT*(o-1)), so the
    // cheaper side is commitment iff o > 1, reservation iff o < 1.
    const commit = (o: number) => gamblerLoss(0.9, 0.1, o);
    const reserve = (o: number) => gamblerLoss(0.1, 0.9, o);
    expect(commit(2)).toBeLessThan(reserve(2)); // good odds -> commit
    expect(reserve(0.5)).toBeLessThan(commit(0.5)); // poor odds -> reserve
    expect(commit(1)).toBeCloseTo(reserve(1), 10); // o = 1: split is irrelevant
    // Monotone: the commit advantage widens as the odds improve.
    const gap = (o: number) => reserve(o) - commit(o);
    expect(gap(3)).toBeGreaterThan(gap(2));
    expect(gap(2)).toBeGreaterThan(gap(1));
  });
});

describe("gamblerWithhold", () => {
  it("withholds when p_reserve >= max class probability", () => {
    expect(gamblerWithhold({ classProbs: [0.6, 0.3], pReserve: 0.6 })).toBe(true);
    expect(gamblerWithhold({ classProbs: [0.6, 0.3], pReserve: 0.59 })).toBe(false);
  });
});

describe("gamblerFilterSlates", () => {
  it("splits retained/withheld and reports retention", () => {
    const { retainedIdx, withheldIdx, retention } = gamblerFilterSlates([
      { classProbs: [0.7], pReserve: 0.1 },
      { classProbs: [0.4], pReserve: 0.5 },
      { classProbs: [0.55], pReserve: 0.55 },
      { classProbs: [0.8], pReserve: 0.05 },
    ]);
    expect(retainedIdx).toEqual([0, 3]);
    expect(withheldIdx).toEqual([1, 2]);
    expect(retention).toBeCloseTo(0.5, 10);
  });
});

describe("sweepReward", () => {
  it("selects a reward meeting the retention floor with best retained ROI", () => {
    const base = [
      { classProbs: [0.8], trueClassProb: 0.8 },
      { classProbs: [0.75], trueClassProb: 0.75 },
      { classProbs: [0.4], trueClassProb: 0.4 },
      { classProbs: [0.35], trueClassProb: 0.35 },
      { classProbs: [0.7], trueClassProb: 0.7 },
    ];
    const best = sweepReward(base, [0.5, 1, 1.5, 2, 3], 0.6);
    expect(best.retention).toBeGreaterThanOrEqual(0.6);
    expect(best.retainedRoi).toBeGreaterThan(-Infinity);
  });
});

describe("gamblerGatePasses", () => {
  it("encodes the +2pp ROI / >=60% retention gate", () => {
    expect(gamblerGatePasses(0.07, 0.04, 0.65)).toBe(true);
    expect(gamblerGatePasses(0.055, 0.04, 0.65)).toBe(false);
    expect(gamblerGatePasses(0.07, 0.04, 0.59)).toBe(false); // abstains on nearly everything
  });
});

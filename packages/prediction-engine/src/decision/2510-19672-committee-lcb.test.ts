// Tests for 2510.19672 committee disagreement (additive; not wired into any publish path).
import { describe, it, expect } from "vitest";
import {
  committeePostFraction,
  committeeDisagreement,
  disagreementPostDecision,
  abstentionRate,
  selectiveRoi,
  wilsonLowerBound,
  lcbUpgradePasses,
  disagreementGatePasses,
} from "./2510-19672-committee-lcb.js";

describe("committeeDisagreement", () => {
  it("is 0 when unanimous and 1 when evenly split", () => {
    expect(committeeDisagreement(new Array(10).fill(true))).toBe(0);
    expect(committeeDisagreement(new Array(10).fill(false))).toBe(0);
    expect(committeeDisagreement([true, true, true, true, true, false, false, false, false, false])).toBe(1);
    expect(committeePostFraction([true, true, false, false])).toBe(0.5);
  });
});

describe("disagreementPostDecision", () => {
  it("abstains on disagreement above threshold", () => {
    const split = [true, true, true, true, true, false, false, false, false, false];
    expect(disagreementPostDecision(split, 0.5)).toBe(false);
    expect(disagreementPostDecision(new Array(10).fill(true), 0.5)).toBe(true);
  });
});

describe("abstentionRate / selectiveRoi", () => {
  it("measures abstention and posted-only ROI", () => {
    const votes = [new Array(10).fill(true), new Array(10).fill(false)];
    expect(abstentionRate(votes, 0.5)).toBe(0);
    expect(selectiveRoi([true, false, true], [0.1, -0.5, 0.3])).toBeCloseTo(0.2, 12);
    expect(selectiveRoi([false, false], [0.1, 0.2])).toBe(0);
  });
});

describe("wilsonLowerBound / lcbUpgradePasses", () => {
  it("bounds the hit rate from below", () => {
    const lcb = wilsonLowerBound(80, 100);
    expect(lcb).toBeLessThan(0.8);
    expect(lcb).toBeGreaterThan(0.7);
    expect(lcbUpgradePasses(80, 100, 0.7)).toBe(true);
    expect(lcbUpgradePasses(50, 100, 0.7)).toBe(false);
  });
});

describe("disagreementGatePasses", () => {
  it("requires +2 ROI points at matched abstention plus LCB behavior", () => {
    const ok = disagreementGatePasses(0.08, 0.05, 0.3, 0.31, true, true);
    expect(ok.liftPoints).toBeCloseTo(3, 8);
    expect(ok.abstentionMatched).toBe(true);
    expect(ok.passes).toBe(true);
    expect(disagreementGatePasses(0.06, 0.05, 0.3, 0.31, true, true).passes).toBe(false);
    expect(disagreementGatePasses(0.08, 0.05, 0.3, 0.4, true, true).passes).toBe(false);
    expect(disagreementGatePasses(0.08, 0.05, 0.3, 0.31, false, true).passes).toBe(false);
  });
});

// Tests for 2601.20452v1 whale distortion (additive; not wired into any publish path).
import { describe, it, expect } from "vitest";
import {
  impliedWhaleShare,
  flagWhaleMove,
  reversalLift,
  paperProfitAfterVig,
  whaleGatePasses,
} from "./2601-20452v1-whale-distortion.js";

describe("impliedWhaleShare", () => {
  it("attributes unexplained move size to the whale", () => {
    // Move of 3 points on volume implying 1 point -> 2/3 whale share.
    expect(impliedWhaleShare(3, 0.5, 2)).toBeCloseTo(2 / 3, 12);
    // Fully explained move -> 0.
    expect(impliedWhaleShare(1, 0.5, 2)).toBe(0);
    expect(flagWhaleMove(0.7, 0.5)).toBe(true);
    expect(flagWhaleMove(0.3, 0.5)).toBe(false);
  });
});

describe("reversalLift", () => {
  it("measures the flagged reversal-rate lift in points", () => {
    const s = reversalLift(60, 100, 45, 100);
    expect(s.flaggedReversalRate).toBe(0.6);
    expect(s.unflaggedReversalRate).toBe(0.45);
    expect(s.liftPoints).toBeCloseTo(15, 8);
  });
});

describe("paperProfitAfterVig", () => {
  it("nets out the vig", () => {
    // 55 wins at -110 (1.909) vs 45 losses, $0.02 vig per bet.
    const p = paperProfitAfterVig(55, 45, 1.909, 0.02);
    expect(p).toBeCloseTo(55 * 0.909 - 45 - 100 * 0.02, 8);
    expect(p).toBeGreaterThan(0);
  });
});

describe("whaleGatePasses", () => {
  it("requires +10pp reversal lift and post-vig profit", () => {
    const ok = whaleGatePasses(60, 100, 45, 100, 55, 45, 1.909, 0.02);
    expect(ok.passes).toBe(true);
    expect(whaleGatePasses(52, 100, 45, 100, 55, 45, 1.909, 0.02).passes).toBe(false);
    expect(whaleGatePasses(60, 100, 45, 100, 45, 55, 1.909, 0.02).passes).toBe(false);
  });
});

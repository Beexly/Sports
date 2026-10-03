/** Phase-4 research stubs: pure, tested, inert. */
import { describe, expect, it } from "vitest";

import {
  aciUpdate,
  channelPrecision,
  fuseSignals,
  learnThenTest,
} from "../phase4-research.js";

describe("channelPrecision — accountability as Bayesian precision", () => {
  it("coin-flip and worse channels earn exactly zero weight", () => {
    expect(channelPrecision({ channelId: "c", claims: 100, correct: 50 }).weight).toBe(0);
    expect(channelPrecision({ channelId: "c", claims: 100, correct: 30 }).weight).toBe(0);
  });
  it("weight grows with both accuracy and evidence", () => {
    const small = channelPrecision({ channelId: "a", claims: 10, correct: 8 });
    const large = channelPrecision({ channelId: "b", claims: 200, correct: 160 });
    expect(large.weight).toBeGreaterThan(small.weight);
  });
  it("fuseSignals says NOTHING when no channel has earned weight", () => {
    const flat = channelPrecision({ channelId: "c", claims: 50, correct: 25 });
    expect(fuseSignals([{ channel: flat, prob: 0.9 }])).toBeNull();
  });
  it("fusion pools toward the higher-precision channel", () => {
    const strong = channelPrecision({ channelId: "s", claims: 300, correct: 240 });
    const weak = channelPrecision({ channelId: "w", claims: 30, correct: 18 });
    const fused = fuseSignals([
      { channel: strong, prob: 0.7 },
      { channel: weak, prob: 0.4 },
    ]);
    expect(fused).not.toBeNull();
    expect(fused!).toBeGreaterThan(0.55);
  });
});

describe("aciUpdate", () => {
  it("raises alpha on covered steps toward target, drops it on misses", () => {
    const upA = aciUpdate(0.1, 0.1, true, 0.01);
    expect(upA).toBeCloseTo(0.101, 6);
    const dnA = aciUpdate(0.1, 0.1, false, 0.01);
    expect(dnA).toBeCloseTo(0.091, 6);
  });
  it("clamps to [0.001, 0.5]", () => {
    expect(aciUpdate(0.0015, 0.1, false, 0.5)).toBe(0.001);
    expect(aciUpdate(0.49, 0.9, true, 0.5)).toBe(0.5);
  });
});

describe("learnThenTest — fixed-sequence FWER control", () => {
  it("accepts the conservative prefix and stops at the first failure", () => {
    const accepted = learnThenTest(
      [
        { threshold: 0.05, pValue: 0.001 },
        { threshold: 0.04, pValue: 0.004 },
        { threshold: 0.03, pValue: 0.2 }, // fails — stop here
        { threshold: 0.02, pValue: 0.001 }, // never tested
      ],
      0.05,
    );
    expect(accepted.map((c) => c.threshold)).toEqual([0.05, 0.04]);
  });
  it("empty acceptance (fire nothing) is a first-class outcome", () => {
    expect(learnThenTest([{ threshold: 0.05, pValue: 0.9 }], 0.05)).toHaveLength(0);
  });
});

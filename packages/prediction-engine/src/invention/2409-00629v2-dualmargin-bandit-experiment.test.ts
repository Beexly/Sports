import { describe, expect, it } from "vitest";
import {
  NUM_ARMS,
  assignArm,
  cateReplicatesLive,
  computeDualMargin,
  defaultExperimentSpec,
  initialArmState,
  passesDualMarginGate,
  recordOutcome,
  BanditArmState,
} from "./2409-00629v2-dualmargin-bandit-experiment";

function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

describe("dual-margin experiment + Thompson-sampling bandit", () => {
  it("assigns arms with valid indices across segments", () => {
    const states: BanditArmState[] = Array.from(
      { length: NUM_ARMS },
      initialArmState,
    );
    states[2]!.segmentWeights = { high_intent: 3.0 };
    const rng = seededRng(11);
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 400; i++) {
      const a = assignArm(states, i % 2 === 0 ? "high_intent" : "casual", rng);
      expect(a.arm).toBeGreaterThanOrEqual(0);
      expect(a.arm).toBeLessThan(NUM_ARMS);
      expect(a.sampledConversionProb).toBeGreaterThanOrEqual(0);
      expect(a.sampledConversionProb).toBeLessThanOrEqual(1);
      counts[a.arm]!++;
    }
    // Every arm gets some pulls under a uniform prior.
    for (const c of counts) expect(c).toBeGreaterThan(0);
  });

  it("bandit concentrates pulls on the better arm over time", () => {
    const states: BanditArmState[] = Array.from(
      { length: NUM_ARMS },
      initialArmState,
    );
    const rng = seededRng(23);
    // True conversion: arm 3 much better than control.
    const trueConv = [0.1, 0.1, 0.12, 0.35];
    for (let i = 0; i < 2000; i++) {
      const a = assignArm(states, "all", rng);
      const conv = rng() < trueConv[a.arm]!;
      recordOutcome(states, a.arm, conv, conv ? 10 : 0);
    }
    const bestPulls = states[3]!.pulls;
    const controlPulls = states[0]!.pulls;
    expect(bestPulls).toBeGreaterThan(controlPulls * 2);
  });

  it("recordOutcome updates Beta posterior correctly", () => {
    const s = initialArmState();
    const states = [s];
    recordOutcome(states, 0, true, 5);
    recordOutcome(states, 0, false, 0);
    expect(s.alpha).toBe(2);
    expect(s.beta).toBe(2);
    expect(s.revenueSum).toBe(5);
    expect(s.pulls).toBe(2);
  });

  it("computeDualMargin reports lift and pp change vs control arm", () => {
    const states: BanditArmState[] = Array.from(
      { length: NUM_ARMS },
      initialArmState,
    );
    // Control: 10% conv, $1 RPV. Arm 1: 9.5% conv, $1.10 RPV.
    for (let i = 0; i < 1000; i++) {
      recordOutcome(states, 0, i < 100, i < 100 ? 10 : 0);
      recordOutcome(states, 1, i < 95, i < 95 ? 11.578 : 0);
    }
    const res = computeDualMargin(states, 1, 4);
    expect(res.revenueLift).toBeCloseTo(0.0999, 3);
    expect(res.conversionChangePp).toBeCloseTo(-0.5, 1);
    expect(res.weeks).toBe(4);
  });

  it("gate passes at >=5% lift with <1pp decline over >=4 weeks", () => {
    const spec = defaultExperimentSpec();
    expect(
      passesDualMarginGate(spec, {
        revenueLift: 0.06,
        conversionChangePp: -0.5,
        weeks: 4,
        totalPulls: 10000,
      }),
    ).toBe(true);
    // Lift too small -> fail.
    expect(
      passesDualMarginGate(spec, {
        revenueLift: 0.04,
        conversionChangePp: -0.5,
        weeks: 6,
        totalPulls: 10000,
      }),
    ).toBe(false);
    // Conversion decline >=1pp -> fail.
    expect(
      passesDualMarginGate(spec, {
        revenueLift: 0.06,
        conversionChangePp: -1.2,
        weeks: 6,
        totalPulls: 10000,
      }),
    ).toBe(false);
    // Too short -> fail.
    expect(
      passesDualMarginGate(spec, {
        revenueLift: 0.06,
        conversionChangePp: -0.5,
        weeks: 3,
        totalPulls: 10000,
      }),
    ).toBe(false);
  });

  it("cateReplicatesLive rejects sign flips and large divergences", () => {
    expect(cateReplicatesLive(0.05, 0.04)).toBe(true);
    expect(cateReplicatesLive(0.05, -0.01)).toBe(false); // sign flip
    expect(cateReplicatesLive(0.05, 0.15, 0.5)).toBe(false); // too far
    expect(cateReplicatesLive(0, 0)).toBe(true);
  });
});

// Tests for 2607.24875v1 hybrid uncertainty (additive; not wired into any publish path).
import { describe, it, expect } from "vitest";
import {
  hybridUncertainty,
  uncertaintyPostDecision,
  selectiveHitRate,
  hybridGatePasses,
  type UncertaintyComponents,
  type UncertaintyWeights,
} from "./2607-24875v1-hybrid-uncertainty.js";

const W: UncertaintyWeights = { wD: 0.3, wC: 0.25, wR: 0.15, wI: 0.1, wE: 0.1, wG: 0.1 };

describe("hybridUncertainty", () => {
  it("weights the six components", () => {
    const c: UncertaintyComponents = {
      evidenceDisagreement: 1,
      sourceContradiction: 0,
      runDisagreement: 0,
      dataIncompleteness: 0,
      entropy: 0,
      calibrationGap: 0,
    };
    expect(hybridUncertainty(c, W)).toBeCloseTo(0.3, 12);
    const full: UncertaintyComponents = {
      evidenceDisagreement: 1,
      sourceContradiction: 1,
      runDisagreement: 1,
      dataIncompleteness: 1,
      entropy: 1,
      calibrationGap: 1,
    };
    expect(hybridUncertainty(full, W)).toBeCloseTo(1, 12);
  });
});

describe("uncertaintyPostDecision", () => {
  it("posts iff U <= theta", () => {
    expect(uncertaintyPostDecision(0.2, 0.3)).toBe(true);
    expect(uncertaintyPostDecision(0.4, 0.3)).toBe(false);
  });
});

describe("selectiveHitRate", () => {
  it("scores the lowest-U subset at coverage", () => {
    const u = [0.1, 0.5, 0.2, 0.8];
    const correct = [1, 0, 1, 0] as (0 | 1)[];
    // 50% coverage -> picks 0 and 2, both correct.
    expect(selectiveHitRate(u, correct, 0.5)).toBe(1);
    // Full coverage -> 50%.
    expect(selectiveHitRate(u, correct, 1)).toBe(0.5);
  });
});

describe("hybridGatePasses", () => {
  it("requires +1pp over both baselines with positive w_D, w_C", () => {
    const ok = hybridGatePasses(0.62, 0.6, 0.59, 0.3, 0.25);
    expect(ok.liftVsBestPp).toBeCloseTo(2, 8);
    expect(ok.weightsPositive).toBe(true);
    expect(ok.passes).toBe(true);
    expect(hybridGatePasses(0.605, 0.6, 0.59, 0.3, 0.25).passes).toBe(false);
    expect(hybridGatePasses(0.62, 0.6, 0.59, 0, 0.25).passes).toBe(false);
  });
});

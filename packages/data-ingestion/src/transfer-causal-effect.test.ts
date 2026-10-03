/**
 * Tests for ./transfer-causal-effect (arXiv:2305.09126v3, lane=causal_injury).
 *
 * ACCEPTANCE GATE: ADOPT l1-TCL for a GSE causal question only if the pre-flight support-overlap diagnostic shows a
 * sparse difference AND the semi-synthetic test shows <=0.7x target-only error; otherwise REJECT
 * transfer and report target-only estimates with honest uncertainty.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./transfer-causal-effect";

describe("transfer causal effect (arXiv:2305.09126v3)", () => {
  const units = [
    { x: [1], w: 1, y: 10, source: false },
    { x: [1], w: 0, y: 6, source: false },
    { x: [2], w: 1, y: 12, source: true },
    { x: [2], w: 0, y: 7, source: true },
  ];
  it("weighted ATE on target only", () => {
    expect(mod.weightedATE(units, [1, 1, 1, 1])).toBeCloseTo(4, 10);
    expect(mod.weightedATE(units, [1, 1])).toBeNull();
    expect(mod.weightedATE([], [])).toBeNull();
  });
  it("density ratio weights", () => {
    const w = mod.densityRatioWeights(units as never, () => 0.5)!;
    expect(w[0]).toBeCloseTo(1, 10);
    expect(w[2]).toBeCloseTo(1, 10);
    expect(mod.densityRatioWeights([], () => 0.5)).toBeNull();
  });
  it("effective sample size", () => {
    expect(mod.effectiveSampleSize([1, 1, 1, 1])).toBeCloseTo(4, 10);
    expect(mod.effectiveSampleSize([1, 0, 0, 0])).toBeCloseTo(1, 10);
    expect(mod.effectiveSampleSize([])).toBeNull();
  });
  it("isTransferUnit rejects malformed", () => {
    expect(mod.isTransferUnit({ x: [1], w: 2, y: 1, source: false })).toBe(false);
  });
});

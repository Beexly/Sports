/**
 * Tests for ./2602-11668-injury-risk (arXiv:2602.11668, lane=causal_injury).
 *
 * ACCEPTANCE GATE: Accepted: the portable pipeline (hybrid temporal CNN + triple-method explainability + honest player-separated validation) maps onto GSE soft-tissue screening despite the original paper's modest accuracies.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2602-11668-injury-risk";

describe("2602-11668 Explainable Machine-Learning based Detection of Knee", () => {
  it("decay-weighted window nests rectangular windows at decay 0", () => {
    expect(mod.decayWeightedWindow([10, 10, 10], 0)).toBeCloseTo(10, 10);
    expect(mod.decayWeightedWindow([10, 0, 0], 10)).toBeCloseTo(10, 2);
    expect(mod.decayWeightedWindow([], 0)).toBeNull();
    expect(mod.decayWeightedWindow([1], -1)).toBeNull();
  });
  it("window sweep returns one row per requested window", () => {
    const r = mod.windowSweepProtocol([10, 20, 30, 40], [2, 3]);
    expect(r).not.toBeNull();
    expect(r![0]!.value).toBeCloseTo(15, 10);
    expect(r![1]!.value).toBeCloseTo(20, 10);
    expect(mod.windowSweepProtocol([1], [0])![0]!.value).toBeNull();
  });
  it("logistic risk head is 0.5 at zero logit", () => {
    expect(mod.injuryRiskScore([0, 0], [1, 1])).toBeCloseTo(0.5, 10);
    expect(mod.injuryRiskScore([10], [1])).toBeGreaterThan(0.99);
    expect(mod.injuryRiskScore([1], [1, 2])).toBeNull();
  });
  it("acute:chronic ratio flags spikes", () => {
    expect(mod.acuteChronicRatio(1.5, 1)).toBeCloseTo(1.5, 10);
    expect(mod.acuteChronicRatio(1, 0)).toBeNull();
  });
});

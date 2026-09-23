/**
 * Tests for ./2608-07513-injury-risk (arXiv:2608.07513, lane=causal_injury).
 *
 * ACCEPTANCE GATE: Accepted: genuine injury-prevention research (ACL), strictly causal real-time architecture with sub-millisecond inference, rigorous LOSO validation explicitly designed against identity bias, open data/code/weights, and two concrete GSE ports (NGS event segmentation for workload features; LOSO validation discipline for injury models).
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2608-07513-injury-risk";

describe("2608-07513 Democratizing Ski Safety: Real-Time Turn Segmentation", () => {
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

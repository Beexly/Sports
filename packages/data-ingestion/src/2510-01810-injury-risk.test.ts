/**
 * Tests for ./2510-01810-injury-risk (arXiv:2510.01810, lane=causal_injury).
 *
 * ACCEPTANCE GATE: ADOPT if on 2023-2024 holdout T_n^(2) flags precede injury absence with recall >=25% at <=10% flag rate among healthy player-weeks, opponent-adjusted flags beat raw flags by >=5pp precision, and the nominal 5% false-positive rate holds.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2510-01810-injury-risk";

describe("2510-01810 Z-scores-based methods and their application to", () => {
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

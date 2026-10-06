/**
 * Tests for ./2412-14019v4-injury-risk (arXiv:2412.14019v4, lane=causal_injury).
 *
 * ACCEPTANCE GATE: ADAPT as hypothesis-ranker if: the pipeline recovers ≥4/5 known-direction pairs from GSE data AND the enumerated order classes are stable across two different LLMs (rank correlation of pairwise scores >0.7). REJECT any direct use of LLM orders in the engine.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2412-14019v4-injury-risk";

describe("2412-14019v4 Retrieving Classes of Causal Orders with", () => {
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

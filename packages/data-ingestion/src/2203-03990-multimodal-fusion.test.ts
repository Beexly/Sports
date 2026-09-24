/**
 * Tests for ./2203-03990-multimodal-fusion (arXiv:2203.03990, lane=multimodal_fusion).
 *
 * ACCEPTANCE GATE: ACCEPT iff Game-Mixer beats the memoryless baseline by >=0.02 log-loss at halftime on 2024 games AND
 * the no-memory ablation is worse (proving the recurrence, not just features, adds value); REJECT if
 * no gain over score-diff + EPA.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./2203-03990-multimodal-fusion";

describe("multimodal fusion (arXiv:2203.03990)", () => {
  it("concatenates modalities (early fusion)", () => {
    expect(mod.earlyFusionConcat([[1, 2], [3]])).toEqual([1, 2, 3]);
    expect(mod.earlyFusionConcat([])).toBeNull();
    expect(mod.earlyFusionConcat([[]])).toBeNull();
  });

  it("averages modality predictions (late fusion)", () => {
    const avg = mod.lateFusionAverage([[0.2, 0.8], [0.4, 0.6]])!;
    expect(avg[0]).toBeCloseTo(0.3, 10);
    expect(avg[1]).toBeCloseTo(0.7, 10);
    expect(mod.lateFusionAverage([[0.2], [0.4]], [3, 1])).toEqual([0.25]);
    expect(mod.lateFusionAverage([[0.2], [0.4]], [0, 0])).toBeNull();
  });

  it("measures cross-modal agreement", () => {
    expect(mod.modalityAgreement([1, 0], [0, 1])).toBeCloseTo(0, 10);
    expect(mod.modalityAgreement([2, 2], [1, 1])).toBeCloseTo(1, 10);
    expect(mod.modalityAgreement([1, 2], [2, 1])).toBeCloseTo(0.8, 10);
    expect(mod.modalityAgreement([0, 0], [1, 1])).toBeNull();
  });
});

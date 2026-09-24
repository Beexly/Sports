/**
 * Tests for ./2503-08945-modality-fusion (arXiv:2503.08945, lane=multimodal_fusion).
 *
 * ACCEPTANCE GATE: ACCEPT: two-stream model beats the tracking-only baseline by ≥2 percentage points accuracy AND ≥0.015 AUC on the held-out 2022 test, with the stats stream contributing (mean C_S > 0.2 in stage-1 attributions).
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2503-08945-modality-fusion";

describe("2503-08945 PassAI: explainable artificial intelligence algorithm for", () => {
  it("weighted fusion averages modalities by weight", () => {
    const f1 = mod.weightedFusion([[0.2, 0.8], [0.6, 0.4]], [1, 1])!;
    expect(f1[0]).toBeCloseTo(0.4, 10);
    expect(f1[1]).toBeCloseTo(0.6, 10);
    const f2 = mod.weightedFusion([[0.2, 0.8], [0.6, 0.4]], [3, 1])!;
    expect(f2[0]).toBeCloseTo(0.3, 10);
    expect(f2[1]).toBeCloseTo(0.7, 10);
    expect(mod.weightedFusion([[0.5]], [0])).toBeNull();
  });
  it("majority vote picks the modal label", () => {
    expect(mod.majorityVote([[0, 1], [1, 1], [1, 0]])).toEqual([1, 1]);
    expect(mod.majorityVote([])).toBeNull();
  });
  it("modality gate thresholds confidences", () => {
    expect(mod.modalityGate([0.9, 0.4], 0.5)).toEqual([true, false]);
    expect(mod.modalityGate([0.9], NaN)).toBeNull();
  });
});

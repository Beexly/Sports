/**
 * Tests for ./1707-08559-multimodal-fusion (arXiv:1707.08559, lane=multimodal_fusion).
 *
 * ACCEPTANCE GATE: ACCEPT: joint model beats the best single-modality baseline by >=5 F-score points on held-out weeks
 * AND Precision@10 >= 0.5. REJECT: reaction features add nothing over video+tracking or Precision@10 <
 * 0.3.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./1707-08559-multimodal-fusion";

describe("multimodal fusion (arXiv:1707.08559)", () => {
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

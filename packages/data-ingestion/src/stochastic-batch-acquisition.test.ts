/**
 * Tests for ./stochastic-batch-acquisition (arXiv:2106.12059v3, lane=active_learning).
 *
 * ACCEPTANCE GATE: ADOPT power acquisition as the default batch rule iff it is never worse than top-K on weekly ATS
 * log-loss across the 2024 season (stochastic mean >= top-K in >= 12 of 18 weeks) AND increases
 * mean within-batch pairwise distance by >= 10%.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./stochastic-batch-acquisition";

describe("stochastic batch acquisition (arXiv:2106.12059v3)", () => {
  it("power probs normalize + favor uncertain", () => {
    const p = mod.powerSampleProbs([0.1, 0.9], 2)!;
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(p[1]).toBeGreaterThan(p[0]!);
    expect(mod.powerSampleProbs([0, 0], 2)).toEqual([0.5, 0.5]);
    expect(mod.powerSampleProbs([], 2)).toBeNull();
  });
  it("batch samples without replacement", () => {
    const b = mod.sampleBatch([0.5, 0.3, 0.2], 2, 7)!;
    expect(b).toHaveLength(2);
    expect(new Set(b).size).toBe(2);
    expect(mod.sampleBatch([0.5], 2, 7)).toBeNull();
  });
  it("uncertainty measures", () => {
    expect(mod.entropyUncertainty([0.5, 0.5])).toBeCloseTo(Math.log(2), 10);
    expect(mod.entropyUncertainty([1, 0])).toBeCloseTo(0, 10);
    expect(mod.marginUncertainty([0.5, 0.5])).toBeCloseTo(1, 10);
    expect(mod.marginUncertainty([0.9, 0.1])).toBeCloseTo(0.2, 10);
    expect(mod.marginUncertainty([0.5])).toBeNull();
  });
});

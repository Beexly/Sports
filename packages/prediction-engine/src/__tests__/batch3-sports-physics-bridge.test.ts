import { describe, it, expect } from "vitest";
import {
  computeNvidiaNim40RpmAndKumoRelationalPrior,
  computeJevEpistemicAleatoricConfidence100,
} from "../expected-metrics/batch3-sports-physics-bridge.js";

describe("Batch3 Sports Physics Bridge Operators #24 & #25", () => {
  it("Operator #24: computeNvidiaNim40RpmAndKumoRelationalPrior handles rate limiting and Kumo boosts", () => {
    // Under bucket capacity (e.g. 15 requests)
    const res1 = computeNvidiaNim40RpmAndKumoRelationalPrior({
      requestCountLastMinute: 15,
      relationalTablesJoined: 3,
      graphMessagePassingHops: 2,
    });
    expect(res1.rateLimited).toBe(false);
    expect(res1.recommendedWaitMs).toBe(0);
    expect(res1.kumoRelationalPriorConfidenceBoost).toBeCloseTo(0.06 + 0.06, 4);
    expect(res1.effectiveThroughputRpm).toBe(25);

    // Over bucket capacity (e.g. 42 requests)
    const res2 = computeNvidiaNim40RpmAndKumoRelationalPrior({
      requestCountLastMinute: 42,
      minIntervalMs: 1500,
      tokenBucketCapacity: 40,
      relationalTablesJoined: 4,
      graphMessagePassingHops: 3,
    });
    expect(res2.rateLimited).toBe(true);
    expect(res2.recommendedWaitMs).toBe(2250);
    expect(res2.kumoRelationalPriorConfidenceBoost).toBeCloseTo(0.09 + 0.08, 4);
    expect(res2.effectiveThroughputRpm).toBe(1);
  });

  it("Operator #25: computeJevEpistemicAleatoricConfidence100 computes XX/100 format and epistemic gates", () => {
    // High certainty, low epistemic uncertainty
    const res1 = computeJevEpistemicAleatoricConfidence100({
      noulEpistemicUncertainty: 0.05,
      choiceProbabilities: [0.85, 0.1, 0.05],
    });
    expect(res1.confidence100).toBeGreaterThanOrEqual(70);
    expect(res1.formattedConfidence).toMatch(/^\d+\/100$/);
    expect(res1.passesEpistemicGate).toBe(true);

    // High uncertainty, high entropy
    const res2 = computeJevEpistemicAleatoricConfidence100({
      noulEpistemicUncertainty: 0.9,
      choiceProbabilities: [0.35, 0.33, 0.32],
    });
    expect(res2.confidence100).toBeLessThan(40);
    expect(res2.formattedConfidence).toMatch(/^\d+\/100$/);
    expect(res2.normalizedEntropy).toBeGreaterThan(0.95);
  });
});

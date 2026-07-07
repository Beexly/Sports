import { describe, expect, it } from "vitest";
import { receiverDifficultyIndex, type ReceiverDifficultyInput } from "../receiving/receiver-difficulty.js";
import type { MetricSourcePolicy } from "../core/validation.js";

const sourcePolicy: MetricSourcePolicy = {
  allowedForModeling: true,
  attributionRequired: "nflverse-derived",
  sourceId: "nflverse-pbp",
  status: "approved",
};

const lowEvidenceInput: ReceiverDifficultyInput = {
  airYards: 10,
  expectedCompletionProbability: 0.6,
  sampleSize: 400,
  sourcePolicy: [sourcePolicy],
};

describe("receiverDifficultyIndex", () => {
  it("increases as completion expectation, separation, and cushion get worse", () => {
    const easy = receiverDifficultyIndex({
      airYards: 5,
      cushionYards: 7,
      expectedCompletionProbability: 0.78,
      sampleSize: 400,
      separationYards: 5.5,
      sourcePolicy: [sourcePolicy],
    });
    const hard = receiverDifficultyIndex({
      airYards: 28,
      contestedCatchProxy: 0.9,
      cushionYards: 1.5,
      expectedCompletionProbability: 0.34,
      sampleSize: 400,
      separationYards: 0.7,
      sidelineProxy: 0.85,
      sourcePolicy: [sourcePolicy],
    });

    expect(hard.difficultyIndex).toBeGreaterThan(easy.difficultyIndex);
    expect(hard.status).toBe("SHADOW");
    expect(hard.confidenceMeaning).toBe("EVIDENCE_QUALITY_NOT_PLAYER_TALENT");
    expect(Object.prototype.hasOwnProperty.call(hard.drivers[0], "weight")).toBe(false);
  });

  it("computes a deterministic difficultyIndex for a fixed input", () => {
    const result = receiverDifficultyIndex(lowEvidenceInput);

    expect(result.difficultyIndex).toBe(35.62);
  });

  it("reports LOW uncertainty / high confidence when no soft proxies and sample is large", () => {
    const result = receiverDifficultyIndex(lowEvidenceInput);

    expect(result.uncertaintyBand).toBe("LOW");
    expect(result.confidenceScore).toBe(86.44);
  });

  it("drops to MEDIUM uncertainty when a soft proxy is supplied", () => {
    const result = receiverDifficultyIndex({ ...lowEvidenceInput, contestedCatchProxy: 0.5 });

    expect(result.uncertaintyBand).toBe("MEDIUM");
    expect(result.confidenceScore).toBe(64.44);
  });

  it("reports HIGH uncertainty / low confidence when the sample is too small", () => {
    const result = receiverDifficultyIndex({ ...lowEvidenceInput, sampleSize: 10 });

    expect(result.uncertaintyBand).toBe("HIGH");
    expect(result.confidenceScore).toBe(36.11);
  });

  it("lowers confidence when genuine soft proxies are added to an otherwise-identical input", () => {
    const withoutProxies = receiverDifficultyIndex(lowEvidenceInput);
    const withProxies = receiverDifficultyIndex({
      ...lowEvidenceInput,
      contestedCatchProxy: 0.6,
      sidelineProxy: 0.6,
    });

    expect(withProxies.confidenceScore).toBeLessThan(withoutProxies.confidenceScore);
  });

  it("does not penalize confidence for supplying real tracking measurements", () => {
    const withoutMeasurements = receiverDifficultyIndex(lowEvidenceInput);
    const withMeasurements = receiverDifficultyIndex({
      ...lowEvidenceInput,
      separationYards: 3,
      cushionYards: 6,
    });

    expect(withoutMeasurements.uncertaintyBand).toBe("LOW");
    expect(withMeasurements.uncertaintyBand).toBe("LOW");
    expect(withMeasurements.confidenceScore).toBe(withoutMeasurements.confidenceScore);
  });
});

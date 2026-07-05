import { describe, expect, it } from "vitest";
import { receiverDifficultyIndex } from "../receiving/receiver-difficulty.js";
import type { MetricSourcePolicy } from "../core/validation.js";

const sourcePolicy: MetricSourcePolicy = {
  allowedForModeling: true,
  attributionRequired: "nflverse-derived",
  sourceId: "nflverse-pbp",
  status: "approved",
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
});

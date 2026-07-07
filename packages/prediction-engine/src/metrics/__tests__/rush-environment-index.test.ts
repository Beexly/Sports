import { describe, expect, it } from "vitest";
import { rushEnvironmentIndex } from "../rushing/rush-environment-index.js";
import type { MetricSourcePolicy } from "../core/validation.js";

const sourcePolicy: MetricSourcePolicy = {
  allowedForModeling: true,
  attributionRequired: "nflverse-derived",
  sourceId: "nflverse-pbp",
  status: "approved",
};

describe("rushEnvironmentIndex", () => {
  it("falls when the box, front, down-distance, and weather environment worsens", () => {
    const stressed = rushEnvironmentIndex({
      boxPressureProxy: 0.92,
      defensiveFrontPressureProxy: 0.88,
      down: 3,
      gameScriptRunFriendliness: 0.25,
      offensiveLineContinuityProxy: 0.2,
      runDirectionLeverageProxy: 0.15,
      sampleSize: 280,
      sourcePolicy: [sourcePolicy],
      weatherPenalty: 0.8,
      yardsToGo: 13,
    });
    const favorable = rushEnvironmentIndex({
      boxPressureProxy: 0.12,
      defensiveFrontPressureProxy: 0.18,
      down: 1,
      gameScriptRunFriendliness: 0.8,
      offensiveLineContinuityProxy: 0.9,
      runDirectionLeverageProxy: 0.82,
      sampleSize: 280,
      sourcePolicy: [sourcePolicy],
      weatherPenalty: 0.05,
      yardsToGo: 5,
    });

    expect(favorable.environmentIndex).toBeGreaterThan(stressed.environmentIndex);
    expect(favorable.status).toBe("SHADOW");
    expect(favorable.confidenceMeaning).toBe("EVIDENCE_QUALITY_NOT_RUSH_SUCCESS_PROBABILITY");
    expect(Object.prototype.hasOwnProperty.call(favorable.drivers[0], "weight")).toBe(false);
  });

  it("does not let confidence become a rush success probability", () => {
    const weakEvidence = rushEnvironmentIndex({
      down: 1,
      sampleSize: 12,
      sourcePolicy: [sourcePolicy],
      yardsToGo: 4,
    });
    const strongerEvidence = rushEnvironmentIndex({
      down: 1,
      sampleSize: 900,
      sourcePolicy: [sourcePolicy],
      yardsToGo: 4,
    });

    expect(weakEvidence.environmentIndex).toBe(strongerEvidence.environmentIndex);
    expect(strongerEvidence.confidenceScore).toBeGreaterThan(weakEvidence.confidenceScore);
  });
});

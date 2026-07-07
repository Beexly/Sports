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

  it("fails closed to HIGH uncertainty and low confidence when the source policy is empty", () => {
    const blocked = rushEnvironmentIndex({
      down: 1,
      sampleSize: 900,
      sourcePolicy: [],
      yardsToGo: 4,
    });
    const allowed = rushEnvironmentIndex({
      down: 1,
      sampleSize: 900,
      sourcePolicy: [sourcePolicy],
      yardsToGo: 4,
    });

    // A large sample cannot rescue confidence once the rights gate fails closed.
    expect(blocked.uncertaintyBand).toBe("HIGH");
    expect(blocked.confidenceScore).toBeLessThanOrEqual(48);
    expect(blocked.confidenceScore).toBeLessThan(allowed.confidenceScore);
  });

  it("keeps environmentIndex within [0, 100] for out-of-range inputs", () => {
    const extremeHigh = rushEnvironmentIndex({
      boxPressureProxy: -3,
      defensiveFrontPressureProxy: -3,
      down: -5,
      gameScriptRunFriendliness: 5,
      offensiveLineContinuityProxy: 5,
      runDirectionLeverageProxy: 5,
      sampleSize: 400,
      sourcePolicy: [sourcePolicy],
      weatherPenalty: -2,
      yardsToGo: -10,
    });
    const extremeLow = rushEnvironmentIndex({
      boxPressureProxy: 4,
      defensiveFrontPressureProxy: 4,
      down: 8,
      gameScriptRunFriendliness: -4,
      offensiveLineContinuityProxy: -4,
      runDirectionLeverageProxy: -4,
      sampleSize: 400,
      sourcePolicy: [sourcePolicy],
      weatherPenalty: 2,
      yardsToGo: 40,
    });

    for (const result of [extremeHigh, extremeLow]) {
      expect(result.environmentIndex).toBeGreaterThanOrEqual(0);
      expect(result.environmentIndex).toBeLessThanOrEqual(100);
    }
  });

  it("sorts drivers by descending absolute contribution", () => {
    const result = rushEnvironmentIndex({
      boxPressureProxy: 0.3,
      defensiveFrontPressureProxy: 0.4,
      down: 2,
      gameScriptRunFriendliness: 0.6,
      offensiveLineContinuityProxy: 0.7,
      runDirectionLeverageProxy: 0.55,
      sampleSize: 300,
      sourcePolicy: [sourcePolicy],
      weatherPenalty: 0.5,
      yardsToGo: 6,
    });

    const magnitudes = result.drivers.map((driver) => Math.abs(driver.contribution));
    const descending = [...magnitudes].sort((a, b) => b - a);
    expect(magnitudes).toEqual(descending);
  });
});

import { describe, expect, it } from "vitest";
import { expectedRushYardsGse } from "../rushing/expected-rush-yards.js";
import type { MetricSourcePolicy } from "../core/validation.js";

const sourcePolicy: MetricSourcePolicy = {
  allowedForModeling: true,
  attributionRequired: "nflverse-derived",
  sourceId: "nflverse-pbp",
  status: "approved",
};

describe("expectedRushYardsGse", () => {
  it("rises with rush environment, rusher prior, and weak defensive rush allowance", () => {
    const constrained = expectedRushYardsGse({
      defenseRushYardsAllowedPrior: 3.2,
      designedRush: true,
      rushEnvironmentIndex: 25,
      rusherYardsPerCarryPrior: 3.1,
      sampleSize: 420,
      sourcePolicy: [sourcePolicy],
      yardline100: 6,
      yardsToGo: 12,
    });
    const favorable = expectedRushYardsGse({
      defenseRushYardsAllowedPrior: 5.4,
      designedRush: true,
      rushEnvironmentIndex: 86,
      rusherYardsPerCarryPrior: 5.6,
      sampleSize: 420,
      sourcePolicy: [sourcePolicy],
      yardline100: 48,
      yardsToGo: 5,
    });

    expect(favorable.expectedRushYards).toBeGreaterThan(constrained.expectedRushYards);
    expect(favorable.status).toBe("SHADOW");
    expect(favorable.confidenceMeaning).toBe("EVIDENCE_QUALITY_NOT_RUSH_OUTCOME_CERTAINTY");
    expect(Object.prototype.hasOwnProperty.call(favorable.drivers[0], "weight")).toBe(false);
  });

  it("keeps confidence separate from expected yardage", () => {
    const weakEvidence = expectedRushYardsGse({
      rushEnvironmentIndex: 55,
      sampleSize: 12,
      sourcePolicy: [sourcePolicy],
      yardsToGo: 6,
    });
    const strongEvidence = expectedRushYardsGse({
      rushEnvironmentIndex: 55,
      sampleSize: 900,
      sourcePolicy: [sourcePolicy],
      yardsToGo: 6,
    });

    expect(weakEvidence.expectedRushYards).toBe(strongEvidence.expectedRushYards);
    expect(strongEvidence.confidenceScore).toBeGreaterThan(weakEvidence.confidenceScore);
  });
});

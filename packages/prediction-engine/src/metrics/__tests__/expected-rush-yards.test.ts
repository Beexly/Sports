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

  it("lowers expected yards as field position moves toward the goal line", () => {
    const nearGoal = expectedRushYardsGse({
      rushEnvironmentIndex: 55,
      sampleSize: 300,
      sourcePolicy: [sourcePolicy],
      yardline100: 3,
      yardsToGo: 6,
    });
    const midfield = expectedRushYardsGse({
      rushEnvironmentIndex: 55,
      sampleSize: 300,
      sourcePolicy: [sourcePolicy],
      yardline100: 50,
      yardsToGo: 6,
    });

    expect(nearGoal.expectedRushYards).toBeLessThan(midfield.expectedRushYards);
  });

  it("lowers expected yards as yards-to-go increases", () => {
    const shortToGo = expectedRushYardsGse({
      rushEnvironmentIndex: 55,
      sampleSize: 300,
      sourcePolicy: [sourcePolicy],
      yardsToGo: 2,
    });
    const longToGo = expectedRushYardsGse({
      rushEnvironmentIndex: 55,
      sampleSize: 300,
      sourcePolicy: [sourcePolicy],
      yardsToGo: 15,
    });

    expect(longToGo.expectedRushYards).toBeLessThan(shortToGo.expectedRushYards);
  });

  it("lowers expected yards for a non-designed rush versus a designed rush", () => {
    const scramble = expectedRushYardsGse({
      designedRush: false,
      rushEnvironmentIndex: 55,
      sampleSize: 300,
      sourcePolicy: [sourcePolicy],
      yardsToGo: 6,
    });
    const designed = expectedRushYardsGse({
      designedRush: true,
      rushEnvironmentIndex: 55,
      sampleSize: 300,
      sourcePolicy: [sourcePolicy],
      yardsToGo: 6,
    });

    expect(scramble.expectedRushYards).toBeLessThan(designed.expectedRushYards);
  });

  it("fails closed to HIGH uncertainty and floored confidence when source rights are absent", () => {
    const noPolicy = expectedRushYardsGse({
      rushEnvironmentIndex: 55,
      sampleSize: 900,
      sourcePolicy: [],
      yardsToGo: 6,
    });
    const blockedPolicy = expectedRushYardsGse({
      rushEnvironmentIndex: 55,
      sampleSize: 900,
      sourcePolicy: [{ ...sourcePolicy, allowedForModeling: false, status: "blocked" }],
      yardsToGo: 6,
    });

    expect(noPolicy.uncertaintyBand).toBe("HIGH");
    expect(noPolicy.confidenceScore).toBeLessThanOrEqual(48);
    expect(blockedPolicy.uncertaintyBand).toBe("HIGH");
    expect(blockedPolicy.confidenceScore).toBeLessThanOrEqual(48);
  });

  it("does not inflate uncertainty when exact field position is supplied", () => {
    const withoutYardline = expectedRushYardsGse({
      rushEnvironmentIndex: 60,
      sampleSize: 300,
      sourcePolicy: [sourcePolicy],
      yardsToGo: 5,
    });
    const withYardline = expectedRushYardsGse({
      rushEnvironmentIndex: 60,
      sampleSize: 300,
      sourcePolicy: [sourcePolicy],
      yardline100: 15,
      yardsToGo: 5,
    });

    expect(withYardline.uncertaintyBand).toBe(withoutYardline.uncertaintyBand);
    expect(withYardline.confidenceScore).toBe(withoutYardline.confidenceScore);
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

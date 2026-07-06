import { describe, expect, it } from "vitest";
import { qbBurdenIndex, type QbBurdenIndexInput } from "../passing/qb-burden-index.js";
import type { MetricSourcePolicy } from "../core/validation.js";

const approvedSource: MetricSourcePolicy = {
  allowedForModeling: true,
  attributionRequired: "nflverse-derived",
  sourceId: "nflverse-pbp",
  status: "approved",
};

const baseInput: QbBurdenIndexInput = {
  airYards: 6,
  down: 1,
  expectedCompletionProbability: 0.72,
  sampleSize: 500,
  sourcePolicy: [approvedSource],
  yardsToGo: 3,
};

describe("qbBurdenIndex", () => {
  it("keeps clean easy contexts low burden and shadow-only", () => {
    const result = qbBurdenIndex(baseInput);

    expect(result.metricId).toBe("qb-burden-index");
    expect(result.status).toBe("SHADOW");
    expect(result.sourcePosture).toBe("CLEAN");
    expect(result.uncertaintyBand).toBe("LOW");
    expect(result.burdenBand).toBe("LOW");
    expect(result.burdenIndex).toBeLessThan(35);
    expect(result.drivers.every((driver) => !Object.prototype.hasOwnProperty.call(driver, "weight"))).toBe(true);
  });

  it("increases with pressure, throw depth, down-distance friction, and weather", () => {
    const clean = qbBurdenIndex(baseInput);
    const pressured = qbBurdenIndex({ ...baseInput, pressureProxy: 0.9 });
    const deep = qbBurdenIndex({ ...baseInput, airYards: 35, expectedCompletionProbability: 0.35 });
    const lateAndLong = qbBurdenIndex({ ...baseInput, down: 4, yardsToGo: 17 });
    const weather = qbBurdenIndex({ ...baseInput, weatherPenalty: 0.85 });
    const hard = qbBurdenIndex({
      ...baseInput,
      airYards: 36,
      down: 4,
      expectedCompletionProbability: 0.25,
      offensiveLineDisruptionProxy: 0.9,
      pressureProxy: 0.95,
      weatherPenalty: 0.85,
      yardsToGo: 18,
    });

    expect(pressured.burdenIndex).toBeGreaterThan(clean.burdenIndex);
    expect(deep.burdenIndex).toBeGreaterThan(clean.burdenIndex);
    expect(lateAndLong.burdenIndex).toBeGreaterThan(clean.burdenIndex);
    expect(weather.burdenIndex).toBeGreaterThan(clean.burdenIndex);
    expect(hard.burdenIndex).toBeGreaterThan(70);
    expect(hard.drivers.some((driver) => driver.name === "pressure_burden" && driver.direction === "UP")).toBe(true);
  });

  it("raises review pressure and uncertainty when source posture is unclear or blocked", () => {
    const clean = qbBurdenIndex(baseInput);
    const review = qbBurdenIndex({
      ...baseInput,
      sourcePolicy: [{ ...approvedSource, status: "manual_review" }],
    });
    const blocked = qbBurdenIndex({
      ...baseInput,
      sourcePolicy: [{ ...approvedSource, allowedForModeling: false, status: "blocked" }],
    });

    expect(review.burdenIndex).toBeGreaterThan(clean.burdenIndex);
    expect(blocked.burdenIndex).toBeGreaterThan(clean.burdenIndex);
    expect(review.uncertaintyBand).toBe("MEDIUM");
    expect(blocked.uncertaintyBand).toBe("HIGH");
    expect(review.confidenceScore).toBeLessThan(clean.confidenceScore);
    expect(blocked.sourcePosture).toBe("BLOCKED");
    expect(blocked.drivers.some((driver) => driver.name === "source_posture_review_pressure")).toBe(true);
  });

  it("keeps burden separate from confidence and avoids QB-quality claims", () => {
    const result = qbBurdenIndex({
      ...baseInput,
      expectedCompletionProbability: 0.42,
      pressureProxy: 0.7,
      sampleSize: 30,
    });

    expect(result.confidenceMeaning).toBe("EVIDENCE_QUALITY_NOT_QB_QUALITY_OR_WIN_PROBABILITY");
    expect(result.confidenceScore).not.toBeCloseTo(result.burdenIndex, 2);
    expect(result.birthCertificate.metricId).toBe("qb-burden-index");
  });
});

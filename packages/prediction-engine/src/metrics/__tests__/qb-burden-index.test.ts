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
    // baseInput omits receiverSeparationDeficit and offensiveLineDisruptionProxy, so
    // the burden leans on two fabricated 0.5 priors. That reliance must surface as
    // MEDIUM uncertainty rather than a falsely confident LOW.
    expect(result.uncertaintyBand).toBe("MEDIUM");
    expect(result.burdenBand).toBe("LOW");
    expect(result.burdenIndex).toBeLessThan(35);
    expect(result.drivers.every((driver) => !Object.prototype.hasOwnProperty.call(driver, "weight"))).toBe(true);
  });

  it("does not lower uncertainty for defaulted separation/O-line inputs vs measured data", () => {
    const defaulted = qbBurdenIndex(baseInput);
    const measured = qbBurdenIndex({
      ...baseInput,
      offensiveLineDisruptionProxy: 0.3,
      receiverSeparationDeficit: 0.3,
    });

    // Supplying the real measurements removes the fabricated-prior reliance, so the
    // metric may only become MORE certain, never less.
    expect(measured.uncertaintyBand).toBe("LOW");
    expect(defaulted.uncertaintyBand).toBe("MEDIUM");
    expect(measured.confidenceScore).toBeGreaterThan(defaulted.confidenceScore);
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
    // hard supplies three proxies (pressure, weather present + separation defaulted),
    // so proxyCount > 2 must force HIGH uncertainty.
    expect(hard.uncertaintyBand).toBe("HIGH");
    expect(hard.drivers.some((driver) => driver.name === "pressure_burden" && driver.direction === "UP")).toBe(true);
  });

  it("pins the classifyBurden ELEVATED/HIGH boundary at index 60", () => {
    const boundaryBase: QbBurdenIndexInput = {
      ...baseInput,
      airYards: 35,
      down: 4,
      expectedCompletionProbability: 0.3,
      timeToThrowStressProxy: 0.5,
      weatherPenalty: 0.5,
      yardsToGo: 15,
    };
    const justUnder = qbBurdenIndex({ ...boundaryBase, pressureProxy: 0.36 });
    const justAt = qbBurdenIndex({ ...boundaryBase, pressureProxy: 0.38 });

    expect(justUnder.burdenIndex).toBeLessThan(60);
    expect(justUnder.burdenBand).toBe("ELEVATED");
    expect(justAt.burdenIndex).toBeGreaterThanOrEqual(60);
    expect(justAt.burdenBand).toBe("HIGH");
  });

  it("fails closed when the source policy list is empty", () => {
    const noPolicy = qbBurdenIndex({ ...baseInput, sourcePolicy: [] });

    expect(noPolicy.sourcePosture).toBe("BLOCKED");
    expect(noPolicy.uncertaintyBand).toBe("HIGH");
    const sourceDriver = noPolicy.drivers.find((driver) => driver.name === "source_posture_review_pressure");
    expect(sourceDriver?.direction).toBe("UP");
    expect(sourceDriver?.contribution).toBeGreaterThan(0);
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

import { describe, expect, it } from "vitest";
import { driftPressureIndex, type DriftPressureIndexInput } from "../calibration/drift-pressure-index.js";
import type { MetricSourcePolicy } from "../core/validation.js";

const approvedSource: MetricSourcePolicy = {
  allowedForModeling: true,
  attributionRequired: "fixture-drift-report",
  sourceId: "fixture-cleared-drift-report",
  status: "approved",
};

const cleanInput: DriftPressureIndexInput = {
  calibrationBrierDelta: 0.004,
  calibrationErrorDelta: 0.008,
  featurePopulationStabilityIndex: 0.03,
  minimumSampleSize: 250,
  modelDisagreement: 0.04,
  predictionVolumeShift: 0.08,
  reportAgeDays: 2,
  reportFreshnessTtlDays: 14,
  sampleSize: 900,
  schemaChangeRate: 0.01,
  sourceContradictionPressure: 4,
  sourcePolicy: [approvedSource],
};

describe("driftPressureIndex", () => {
  it("scores clean, fresh, source-reviewed drift evidence without emitting probability", () => {
    const result = driftPressureIndex(cleanInput);

    expect(result.metricId).toBe("drift-pressure-index");
    expect(result.status).toBe("SHADOW");
    expect(result.probability).toBeNull();
    expect(result.confidenceMeaning).toBe("DRIFT_EVIDENCE_QUALITY_NOT_WIN_PROBABILITY");
    expect(result.band).toBe("STABLE");
    expect(result.downstreamVetoRecommended).toBe(false);
    expect(result.sourcePosture).toBe("CLEAN");
    expect(result.score).toBeLessThan(20);
    expect(result.drivers.every((driver) => !Object.prototype.hasOwnProperty.call(driver, "weight"))).toBe(true);
  });

  it("rises when distribution, calibration, schema, staleness, or disagreement drift rises", () => {
    const clean = driftPressureIndex(cleanInput);
    const psi = driftPressureIndex({ ...cleanInput, featurePopulationStabilityIndex: 0.22 });
    const brier = driftPressureIndex({ ...cleanInput, calibrationBrierDelta: 0.052 });
    const calibrationError = driftPressureIndex({ ...cleanInput, calibrationErrorDelta: 0.11 });
    const schema = driftPressureIndex({ ...cleanInput, schemaChangeRate: 0.42 });
    const stale = driftPressureIndex({ ...cleanInput, reportAgeDays: 13 });
    const disagreement = driftPressureIndex({ ...cleanInput, modelDisagreement: 0.72 });

    expect(psi.score).toBeGreaterThan(clean.score);
    expect(brier.score).toBeGreaterThan(clean.score);
    expect(calibrationError.score).toBeGreaterThan(clean.score);
    expect(schema.score).toBeGreaterThan(clean.score);
    expect(stale.score).toBeGreaterThan(clean.score);
    expect(disagreement.score).toBeGreaterThan(clean.score);
    expect(schema.drivers.map((driver) => driver.name)).toContain("schema_change_pressure");
  });

  it("blocks source, sample, stale-report, and severe drift failures", () => {
    const blockedSource = driftPressureIndex({
      ...cleanInput,
      sourcePolicy: [{ ...approvedSource, allowedForModeling: false, status: "blocked" }],
    });
    const lowSample = driftPressureIndex({ ...cleanInput, sampleSize: 120 });
    const staleReport = driftPressureIndex({ ...cleanInput, reportAgeDays: 30 });
    const severePsi = driftPressureIndex({ ...cleanInput, featurePopulationStabilityIndex: 0.48 });

    expect(blockedSource.band).toBe("BLOCKED");
    expect(blockedSource.sourcePosture).toBe("BLOCKED");
    expect(blockedSource.downstreamVetoRecommended).toBe(true);
    expect(lowSample.band).toBe("BLOCKED");
    expect(staleReport.blockReasons.join(" ")).toContain("stale");
    expect(severePsi.band).toBe("BLOCKED");
    expect(severePsi.blockReasons.join(" ")).toContain("Feature distribution");
  });

  it("blocks and vetoes on severe Brier, calibration-error, and schema-change drift", () => {
    const brier = driftPressureIndex({ ...cleanInput, calibrationBrierDelta: 0.12 });
    const calibrationError = driftPressureIndex({ ...cleanInput, calibrationErrorDelta: 0.25 });
    const schema = driftPressureIndex({ ...cleanInput, schemaChangeRate: 0.7 });

    expect(brier.band).toBe("BLOCKED");
    expect(brier.downstreamVetoRecommended).toBe(true);
    expect(brier.blockReasons.join(" ")).toContain("Brier");

    expect(calibrationError.band).toBe("BLOCKED");
    expect(calibrationError.downstreamVetoRecommended).toBe(true);
    expect(calibrationError.blockReasons.join(" ")).toContain("error");

    expect(schema.band).toBe("BLOCKED");
    expect(schema.downstreamVetoRecommended).toBe(true);
    expect(schema.blockReasons.join(" ")).toContain("Schema");
  });

  it("fails closed when no source policy is present", () => {
    const result = driftPressureIndex({ ...cleanInput, sourcePolicy: [] });

    expect(result.band).toBe("BLOCKED");
    expect(result.sourcePosture).toBe("BLOCKED");
    expect(result.downstreamVetoRecommended).toBe(true);
    expect(result.blockReasons.join(" ")).toContain("Source policy");
  });

  it("keeps confidence separate from drift pressure score and recommends veto on severe pressure", () => {
    const result = driftPressureIndex({
      ...cleanInput,
      calibrationBrierDelta: 0.055,
      calibrationErrorDelta: 0.09,
      featurePopulationStabilityIndex: 0.28,
      modelDisagreement: 0.86,
      predictionVolumeShift: 0.4,
      schemaChangeRate: 0.32,
      sourceContradictionPressure: 72,
    });

    expect(result.band).toBe("SEVERE");
    expect(result.downstreamVetoRecommended).toBe(true);
    expect(result.confidenceScore).not.toBeCloseTo(result.score, 2);
    expect(result.birthCertificate.metricId).toBe("drift-pressure-index");
  });
});

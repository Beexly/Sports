import { describe, expect, it } from "vitest";
import { noBetPressureMetric, type NoBetPressureInput } from "../decision/no-bet-pressure.js";
import type { MetricSourcePolicy } from "../core/validation.js";

const approvedSource: MetricSourcePolicy = {
  allowedForModeling: true,
  attributionRequired: "nflverse-derived",
  sourceId: "nflverse-derived-decision-components",
  status: "approved",
};

const cleanInput: NoBetPressureInput = {
  calibrationDebt: 8,
  calibrationIntegrityGrade: 88,
  dataReliabilityIndex: 92,
  driftPressure: 6,
  lowEvidencePressure: 8,
  marketMirageScore: 10,
  marketSignalAllowed: true,
  missingRequiredDataPressure: 0,
  modelDisagreement: 0.04,
  responsibleGamingPressure: 0,
  roleVolatilityIndex: 12,
  sourceContradictionPressure: 0,
  sourcePolicy: [approvedSource],
  staleLineRiskScore: 6,
};

describe("noBetPressureMetric", () => {
  it("keeps no-bet pressure shadow-only and separate from probability", () => {
    const result = noBetPressureMetric(cleanInput);

    expect(result.metricId).toBe("no-bet-pressure");
    expect(result.status).toBe("SHADOW");
    expect(result.probability).toBeNull();
    expect(result.confidenceMeaning).toBe("REFUSAL_PRESSURE_NOT_WIN_PROBABILITY_EV_OR_BET_ADVICE");
    expect(result.band).toBe("CLEAR");
    expect(result.noBetRecommended).toBe(false);
    expect(result.blockReasons).toEqual([]);
    expect(result.uncertaintyBand).toBe("MEDIUM");
    expect(result.confidenceScore).toBe(66.37);
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(result.confidenceScore).toBeLessThanOrEqual(100);
    expect(result.drivers.every((driver) => !Object.prototype.hasOwnProperty.call(driver, "weight"))).toBe(true);
  });

  it("does not penalize uncertainty for supplying explicit zero optional pressures", () => {
    // Presence of clean, informative-but-zero optional signals must not raise
    // uncertainty vs omitting them: zeros are not proxies.
    const explicitZeros = noBetPressureMetric({
      ...cleanInput,
      marketMirageScore: 0,
      responsibleGamingPressure: 0,
      roleVolatilityIndex: 0,
    });
    const omitted = noBetPressureMetric({
      ...cleanInput,
      marketMirageScore: undefined,
      responsibleGamingPressure: undefined,
      roleVolatilityIndex: undefined,
    });

    expect(explicitZeros.uncertaintyBand).toBe("LOW");
    expect(omitted.uncertaintyBand).toBe("LOW");
    expect(explicitZeros.uncertaintyBand).toBe(omitted.uncertaintyBand);
    expect(explicitZeros.confidenceScore).toBe(omitted.confidenceScore);
  });

  it("rises when stale data, missing data, contradictions, and low evidence increase", () => {
    const clean = noBetPressureMetric(cleanInput);
    const stale = noBetPressureMetric({ ...cleanInput, staleLineRiskScore: 70 });
    const missing = noBetPressureMetric({ ...cleanInput, missingRequiredDataPressure: 70 });
    const noisy = noBetPressureMetric({
      ...cleanInput,
      lowEvidencePressure: 72,
      sourceContradictionPressure: 70,
    });
    const combined = noBetPressureMetric({
      ...cleanInput,
      lowEvidencePressure: 72,
      missingRequiredDataPressure: 70,
      sourceContradictionPressure: 70,
      staleLineRiskScore: 70,
    });

    expect(stale.score).toBeGreaterThan(clean.score);
    expect(missing.score).toBeGreaterThan(clean.score);
    expect(noisy.score).toBeGreaterThan(clean.score);
    expect(combined.score).toBeGreaterThan(stale.score);
    expect(combined.drivers.map((driver) => driver.name)).toContain("missing_required_data");
  });

  it("rises when calibration debt, drift, market mirage, or disagreement increases", () => {
    const clean = noBetPressureMetric(cleanInput);
    const calibration = noBetPressureMetric({ ...cleanInput, calibrationDebt: 72, calibrationIntegrityGrade: 40 });
    const drift = noBetPressureMetric({ ...cleanInput, driftPressure: 74 });
    const parliament = noBetPressureMetric({ ...cleanInput, modelDisagreement: 0.82 });
    const mirage = noBetPressureMetric({ ...cleanInput, marketMirageScore: 78 });

    expect(calibration.score).toBeGreaterThan(clean.score);
    expect(drift.score).toBeGreaterThan(clean.score);
    expect(parliament.score).toBeGreaterThan(clean.score);
    expect(mirage.score).toBeGreaterThan(clean.score);
    expect(calibration.drivers.map((driver) => driver.name)).toContain("calibration_pressure");
  });

  it("hard-passes source-policy blocks, stale market blocks, missing required data, and responsible-gaming pressure", () => {
    const blockedSource = noBetPressureMetric({
      ...cleanInput,
      sourcePolicy: [{ ...approvedSource, allowedForModeling: false, status: "blocked" }],
    });
    const blockedMarket = noBetPressureMetric({ ...cleanInput, marketSignalAllowed: false, staleLineRiskScore: 92 });
    const missingRequired = noBetPressureMetric({ ...cleanInput, missingRequiredDataPressure: 94 });
    const responsibleGaming = noBetPressureMetric({ ...cleanInput, responsibleGamingPressure: 70 });

    expect(blockedSource.sourcePosture).toBe("BLOCKED");
    expect(blockedSource.band).toBe("HARD_PASS");
    expect(blockedMarket.band).toBe("HARD_PASS");
    expect(missingRequired.band).toBe("HARD_PASS");
    expect(responsibleGaming.band).toBe("HARD_PASS");
    expect(blockedSource.noBetRecommended).toBe(true);
    expect(blockedSource.score).toBeGreaterThanOrEqual(85);
    expect(responsibleGaming.blockReasons.join(" ")).toContain("Responsible-gaming");
    expect(blockedSource.uncertaintyBand).toBe("HIGH");
    expect(blockedMarket.uncertaintyBand).toBe("HIGH");
    expect(missingRequired.uncertaintyBand).toBe("HIGH");
    expect(responsibleGaming.uncertaintyBand).toBe("HIGH");
  });

  it("fails closed when the source policy is missing entirely", () => {
    const emptyPolicy = noBetPressureMetric({ ...cleanInput, sourcePolicy: [] });

    expect(emptyPolicy.band).toBe("HARD_PASS");
    expect(emptyPolicy.sourcePosture).toBe("BLOCKED");
    expect(emptyPolicy.noBetRecommended).toBe(true);
    expect(emptyPolicy.uncertaintyBand).toBe("HIGH");
  });

  it("can veto attractive downstream inputs without emitting betting advice", () => {
    const apparentOpportunity = noBetPressureMetric({
      ...cleanInput,
      calibrationDebt: 84,
      dataReliabilityIndex: 18,
      driftPressure: 86,
      lowEvidencePressure: 92,
      marketMirageScore: 90,
      missingRequiredDataPressure: 92,
      modelDisagreement: 0.9,
      staleLineRiskScore: 88,
    });

    expect(apparentOpportunity.band).toBe("HARD_PASS");
    expect(apparentOpportunity.noBetRecommended).toBe(true);
    expect(apparentOpportunity.probability).toBeNull();
    expect(apparentOpportunity.birthCertificate.forbiddenInputs).toContain("expected value claim");
  });
});

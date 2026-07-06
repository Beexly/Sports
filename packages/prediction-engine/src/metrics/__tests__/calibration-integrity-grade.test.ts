import { describe, expect, it } from "vitest";
import { calibrationIntegrityGrade, type CalibrationIntegrityGradeInput } from "../calibration/calibration-integrity-grade.js";
import type { MetricSourcePolicy } from "../core/validation.js";

const approvedSource: MetricSourcePolicy = {
  allowedForModeling: true,
  attributionRequired: "settled-open-results",
  sourceId: "fixture-settled-calibration-results",
  status: "approved",
};

const cleanInput: CalibrationIntegrityGradeInput = {
  brierScore: 0.18,
  bucketCoverage: 0.92,
  calibrationDebt: 8,
  driftPressure: 10,
  expectedCalibrationError: 0.025,
  minimumSampleSize: 250,
  reliabilitySlope: 0.98,
  reportAgeDays: 2,
  reportFreshnessTtlDays: 14,
  sampleSize: 900,
  sourcePolicy: [approvedSource],
};

describe("calibrationIntegrityGrade", () => {
  it("scores clean, fresh, source-reviewed calibration evidence without emitting probability", () => {
    const result = calibrationIntegrityGrade(cleanInput);

    expect(result.metricId).toBe("calibration-integrity-grade");
    expect(result.status).toBe("SHADOW");
    expect(result.probability).toBeNull();
    expect(result.confidenceMeaning).toBe("CALIBRATION_EVIDENCE_QUALITY_NOT_WIN_PROBABILITY");
    expect(result.calibrationUsable).toBe(true);
    expect(result.sourcePosture).toBe("CLEAN");
    expect(result.letterGrade).toBe("A");
    expect(result.score).toBeGreaterThan(85);
    expect(result.drivers.every((driver) => !Object.prototype.hasOwnProperty.call(driver, "weight"))).toBe(true);
  });

  it("decreases when ECE, Brier risk, report staleness, drift, or calibration debt rises", () => {
    const clean = calibrationIntegrityGrade(cleanInput);
    const badEce = calibrationIntegrityGrade({ ...cleanInput, expectedCalibrationError: 0.14 });
    const badBrier = calibrationIntegrityGrade({ ...cleanInput, brierScore: 0.32 });
    const stale = calibrationIntegrityGrade({ ...cleanInput, reportAgeDays: 13 });
    const drift = calibrationIntegrityGrade({ ...cleanInput, driftPressure: 72 });
    const debt = calibrationIntegrityGrade({ ...cleanInput, calibrationDebt: 74 });

    expect(badEce.score).toBeLessThan(clean.score);
    expect(badBrier.score).toBeLessThan(clean.score);
    expect(stale.score).toBeLessThan(clean.score);
    expect(drift.score).toBeLessThan(clean.score);
    expect(debt.score).toBeLessThan(clean.score);
    expect(debt.drivers.map((driver) => driver.name)).toContain("calibration_pressure");
  });

  it("fails closed for blocked sources, insufficient samples, stale reports, and extreme debt", () => {
    const blockedSource = calibrationIntegrityGrade({
      ...cleanInput,
      sourcePolicy: [{ ...approvedSource, allowedForModeling: false, status: "blocked" }],
    });
    const lowSample = calibrationIntegrityGrade({ ...cleanInput, sampleSize: 120 });
    const staleReport = calibrationIntegrityGrade({ ...cleanInput, reportAgeDays: 30 });
    const debtBlock = calibrationIntegrityGrade({ ...cleanInput, calibrationDebt: 90 });

    expect(blockedSource.calibrationUsable).toBe(false);
    expect(blockedSource.sourcePosture).toBe("BLOCKED");
    expect(blockedSource.letterGrade).toBe("F");
    expect(lowSample.calibrationUsable).toBe(false);
    expect(staleReport.calibrationUsable).toBe(false);
    expect(debtBlock.calibrationUsable).toBe(false);
    expect(debtBlock.blockReasons.join(" ")).toContain("Calibration debt");
  });

  it("keeps confidence separate from calibration integrity score", () => {
    const result = calibrationIntegrityGrade({
      ...cleanInput,
      bucketCoverage: 0.56,
      expectedCalibrationError: 0.08,
      reportAgeDays: 9,
    });

    expect(result.confidenceScore).not.toBeCloseTo(result.score, 2);
    expect(result.birthCertificate.metricId).toBe("calibration-integrity-grade");
    expect(result.uncertaintyBand).not.toBe("HIGH");
  });
});

import { describe, expect, it } from "vitest";
import { CONFIDENCE_PROBABILITY_CAVEAT, computeCalibration } from "@/lib/calibration/compute";

/**
 * Defect A (2026-09-19): the calibration report must never present
 * `confidence/100` as a stated win probability. It is a raw ordinal score,
 * measured non-monotone and anti-predictive at the top. This pins the
 * disclosure that makes that structural fact explicit on the report, the same
 * way `pick-card.tsx` already renders confidence as a score, not a percent.
 */
describe("CalibrationReport.confidenceProbabilityCaveat", () => {
  it("is populated even when there is no settled sample yet", () => {
    const report = computeCalibration([]);
    expect(report.confidenceProbabilityCaveat).toBe(CONFIDENCE_PROBABILITY_CAVEAT);
    expect(report.confidenceProbabilityCaveat.length).toBeGreaterThan(0);
  });

  it("is populated on a real sample and says confidence is not a calibrated probability", () => {
    const report = computeCalibration([
      { id: "a", confidence: 82, result: "WIN" },
      { id: "b", confidence: 84, result: "LOSS" },
      { id: "c", confidence: 61, result: "WIN" },
    ]);
    expect(report.confidenceProbabilityCaveat).toBe(CONFIDENCE_PROBABILITY_CAVEAT);
    expect(report.confidenceProbabilityCaveat).toMatch(/not a calibrated win probability/i);
    expect(report.confidenceProbabilityCaveat).toMatch(/score/i);
  });

  it("does not vary with the measured discrimination trend", () => {
    // Deliberately monotone-looking sample (rising win rate with confidence),
    // and a small sample that reads "insufficient-data" on discrimination.
    // The caveat is a structural disclosure about how expectedFromConfidence
    // is built, not a conditional read of this sample's own shape, so it must
    // be identical in both cases.
    const monotoneLooking = computeCalibration([
      { id: "a", confidence: 55, result: "LOSS" },
      { id: "b", confidence: 92, result: "WIN" },
    ]);
    const tiny = computeCalibration([{ id: "c", confidence: 92, result: "WIN" }]);
    expect(monotoneLooking.confidenceProbabilityCaveat).toBe(tiny.confidenceProbabilityCaveat);
    expect(monotoneLooking.confidenceProbabilityCaveat).toBe(CONFIDENCE_PROBABILITY_CAVEAT);
  });

  it("never claims expectedWinRate or brierScore are a forecast", () => {
    const report = computeCalibration([]);
    expect(report.confidenceProbabilityCaveat).toMatch(/not a stated forecast|never a stated forecast/i);
  });
});

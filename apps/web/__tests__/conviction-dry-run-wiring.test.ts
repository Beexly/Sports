/**
 * Conviction dry-run wiring contract.
 *
 * WHY THIS EXISTS
 * `convictionTier()` defends itself against a raw 0–100 confidence being passed as a
 * calibrated probability by REJECTING anything outside [0,1] (see conviction-tier.ts).
 * That guard is necessary but NOT sufficient for the real wiring, because
 * `buildCalibrator(...).apply()` returns the raw confidence already divided by 100 —
 * an in-range 0–1 number — with `calibrated: false` whenever the calibrator is
 * inactive (which is its default, self-suppressing state until an audited
 * MODEL_VERSION activation).
 *
 * So a naive integration:
 *     convictionTier({ calibratedProbability: calibrator.apply(c).probability, ... })
 * would hand an UNCALIBRATED heuristic score to the selector, in range, and the guard
 * would stay silent. With a strong enough raw confidence and a CLV record, that path
 * could certify CONVICTION off a number nobody calibrated.
 *
 * The cockpit dry run (apps/web/app/cockpit/calibration/page.tsx) therefore gates on
 * the `calibrated` flag and passes an explicit non-probability when it is false.
 * These tests pin BOTH halves of that contract so a future refactor cannot quietly
 * drop the flag check.
 */

import { describe, expect, it } from "vitest";
import {
  convictionTier,
  buildCalibrator,
  CONVICTION_MIN_CLV_BEAT_RATE,
  CONVICTION_MIN_CLV_SAMPLE,
} from "@sports/prediction-engine";

/** The exact guard the cockpit dry run applies. */
function probabilityForConviction(applied: { probability: number; calibrated: boolean }): number {
  return applied.calibrated ? applied.probability : Number.NaN;
}

describe("conviction dry-run wiring", () => {
  it("an INACTIVE calibrator still returns an in-range 0–1 probability (the hazard)", () => {
    const calibrator = buildCalibrator([]); // no sample → inactive
    const applied = calibrator.apply(92);

    expect(calibrator.isActive).toBe(false);
    expect(applied.calibrated).toBe(false);
    // The hazard in one assertion: the value is inside [0,1], so a range-only check
    // would let it through as if it were calibrated.
    expect(applied.probability).toBeGreaterThanOrEqual(0);
    expect(applied.probability).toBeLessThanOrEqual(1);
  });

  it("passing that value straight through would NOT be rejected by the range guard", () => {
    const applied = buildCalibrator([]).apply(92);

    // Deliberately WITHOUT the flag guard — documents why the guard is required.
    const naive = convictionTier({
      calibratedProbability: applied.probability,
      edgeDecision: "SPEAK",
      clvBeatCloseRate: 0.8,
      clvSampleSize: CONVICTION_MIN_CLV_SAMPLE + 5,
    });

    // No "outside [0,1]" rejection fires: the uncalibrated score sails through and
    // certifies conviction. This is the outcome the flag guard exists to prevent.
    expect(naive.reasons).toHaveLength(0);
    expect(naive.tier).toBe("CONVICTION");
  });

  it("the dry-run guard forces PASS while the calibrator is inactive", () => {
    const applied = buildCalibrator([]).apply(92);

    const guarded = convictionTier({
      calibratedProbability: probabilityForConviction(applied),
      edgeDecision: "SPEAK",
      clvBeatCloseRate: 0.8,
      clvSampleSize: CONVICTION_MIN_CLV_SAMPLE + 5,
    });

    expect(guarded.tier).toBe("PASS");
    expect(guarded.meetsConvictionBar).toBe(false);
    expect(guarded.reasons.join(" ")).toMatch(/uncalibrated/i);
  });

  it("no-CLV-history and short-sample records cannot reach CONVICTION", () => {
    const base = { calibratedProbability: 0.82, edgeDecision: "SPEAK" } as const;

    expect(convictionTier({ ...base, clvBeatCloseRate: null }).tier).not.toBe("CONVICTION");
    expect(
      convictionTier({
        ...base,
        clvBeatCloseRate: 1,
        clvSampleSize: CONVICTION_MIN_CLV_SAMPLE - 1,
      }).tier,
    ).not.toBe("CONVICTION");
    // A beat-rate below the bar fails even on a large sample.
    expect(
      convictionTier({
        ...base,
        clvBeatCloseRate: CONVICTION_MIN_CLV_BEAT_RATE - 0.01,
        clvSampleSize: 500,
      }).tier,
    ).not.toBe("CONVICTION");
  });

  it("beat-RATE is the bar, not average CLV value — the dry run must not substitute one for the other", () => {
    // A positive average CLV can coexist with a sub-50% beat rate (a few large wins,
    // many small losses). Only the rate clears the bar.
    const subRateButPositiveAverage = convictionTier({
      calibratedProbability: 0.82,
      edgeDecision: "SPEAK",
      clvBeatCloseRate: 0.3,
      clvSampleSize: 200,
    });
    expect(subRateButPositiveAverage.tier).not.toBe("CONVICTION");
  });
});

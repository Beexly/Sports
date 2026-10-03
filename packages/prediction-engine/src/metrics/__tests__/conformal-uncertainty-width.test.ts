import { describe, expect, it } from "vitest";
import { runRollingMondrianConformal, type ConformalProjectionSample } from "../../conformal-intervals.js";
import {
  conformalUncertaintyWidth,
  conformalUncertaintyWidthFromReport,
  type ConformalUncertaintyWidthInput,
} from "../calibration/conformal-uncertainty-width.js";
import type { MetricSourcePolicy } from "../core/validation.js";

const cleanSource: MetricSourcePolicy = {
  allowedForModeling: true,
  attributionRequired: "nflverse-derived",
  sourceId: "nflverse-projections",
  status: "approved",
};

const blockedSource: MetricSourcePolicy = {
  allowedForModeling: false,
  sourceId: "restricted-projection-feed",
  status: "blocked",
};

function interval(lower: number, upper: number, covered = true) {
  return { covered, lower, upper };
}

function baseInput(overrides: Partial<ConformalUncertaintyWidthInput> = {}): ConformalUncertaintyWidthInput {
  return {
    driftPressure: 8,
    expectedWidth: 5,
    intervals: Array.from({ length: 36 }, () => interval(9, 13)),
    minimumSampleSize: 20,
    reportAgeDays: 2,
    reportFreshnessTtlDays: 14,
    severeWidth: 16,
    sourcePolicy: [cleanSource],
    targetCoverage: 0.8,
    ...overrides,
  };
}

function projectionSample(
  week: number,
  position: "RB" | "WR",
  actualFantasyPoints: number,
  predictedMean = 10,
): ConformalProjectionSample {
  return {
    actualFantasyPoints,
    predictedMean,
    position,
    sampleId: `${position}-${week}`,
    season: 2026,
    week,
  };
}

describe("Conformal Uncertainty Width", () => {
  it("wraps rolling Mondrian conformal reports without returning probability", () => {
    const samples = Array.from({ length: 10 }, (_value, index) => {
      const week = index + 1;
      return [
        projectionSample(week, "WR", week < 6 ? 15 : 14),
        projectionSample(week, "RB", week < 6 ? 11 : 11),
      ];
    }).flat();
    const report = runRollingMondrianConformal(samples, {
      calibrationWeeks: 2,
      fitWeeks: 3,
      targetCoverage: 0.8,
    });

    const result = conformalUncertaintyWidthFromReport(report, {
      driftPressure: 12,
      expectedWidth: 6,
      minimumSampleSize: 5,
      reportAgeDays: 1,
      reportFreshnessTtlDays: 14,
      severeWidth: 16,
      sourcePolicy: [cleanSource],
    });

    expect(result.metricId).toBe("conformal-uncertainty-width");
    expect(result.status).toBe("SHADOW");
    expect(result.probability).toBeNull();
    expect(result.confidenceMeaning).toBe("CONFORMAL_EVIDENCE_QUALITY_NOT_WIN_PROBABILITY");
    expect(result.birthCertificate.metricId).toBe("conformal-uncertainty-width");
    expect(result.sourcePosture).toBe("CLEAN");
    expect(result.meanWidth).toBeGreaterThan(0);
  });

  it("raises width pressure as interval width expands", () => {
    const tight = conformalUncertaintyWidth(baseInput());
    const wide = conformalUncertaintyWidth(baseInput({
      intervals: Array.from({ length: 36 }, () => interval(1, 27)),
    }));

    expect(wide.score).toBeGreaterThan(tight.score);
    expect(wide.p90Width).toBeGreaterThan(tight.p90Width);
    expect(wide.band).toBe("WATCH");
    expect(wide.downstreamVetoRecommended).toBe(false);
    expect(tight.band).toBe("TIGHT");
    expect(tight.downstreamVetoRecommended).toBe(false);
  });

  it("flags a genuinely wide, non-blocked band as a downstream veto", () => {
    const wide = conformalUncertaintyWidth(baseInput({
      driftPressure: 100,
      intervals: Array.from({ length: 20 }, (_value, index) => interval(0, 30, index < 14)),
      reportAgeDays: 14,
    }));

    expect(wide.blockReasons).toHaveLength(0);
    expect(wide.coverageGap).toBeLessThan(0.25);
    expect(wide.score).toBeGreaterThanOrEqual(70);
    expect(wide.band).toBe("WIDE");
    expect(wide.downstreamVetoRecommended).toBe(true);
  });

  it("treats under-covering narrow intervals as unsafe evidence", () => {
    const honest = conformalUncertaintyWidth(baseInput());
    const underCovered = conformalUncertaintyWidth(baseInput({
      intervals: Array.from({ length: 36 }, (_value, index) => interval(9, 13, index < 12)),
    }));

    expect(underCovered.coverage).toBeLessThan(honest.coverage);
    expect(underCovered.coverageGap).toBeGreaterThan(0.25);
    expect(underCovered.band).toBe("BLOCKED");
    expect(underCovered.downstreamVetoRecommended).toBe(true);
    expect(underCovered.blockReasons).toContain("Conformal intervals materially under-cover the target.");
  });

  it("fails closed on blocked source posture, stale reports, and thin samples", () => {
    const blocked = conformalUncertaintyWidth(baseInput({ sourcePolicy: [blockedSource] }));
    const stale = conformalUncertaintyWidth(baseInput({ reportAgeDays: 30 }));
    const thin = conformalUncertaintyWidth(baseInput({
      intervals: Array.from({ length: 4 }, () => interval(9, 13)),
    }));

    expect(blocked.band).toBe("BLOCKED");
    expect(blocked.sourcePosture).toBe("BLOCKED");
    expect(blocked.uncertaintyBand).toBe("HIGH");
    expect(stale.blockReasons).toContain("Conformal interval report is stale.");
    expect(thin.blockReasons).toContain("Conformal interval sample is below minimum.");
  });
});

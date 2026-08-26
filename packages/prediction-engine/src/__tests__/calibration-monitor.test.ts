import { describe, it, expect } from "vitest";
import {
  checkCalibrationHealth,
  checkNegativeUpdateGuard,
  phaseBucketedCalibrationAudit,
  stabilityPlasticityCheck,
  type CohortGain,
  type PhaseSample,
} from "../calibration-monitor.js";

describe("checkCalibrationHealth", () => {
  it("is healthy on an empty series", () => {
    const result = checkCalibrationHealth([]);
    expect(result.healthy).toBe(true);
    expect(result.alert).toBeNull();
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
  });

  it("is healthy when every day is at or below threshold", () => {
    const result = checkCalibrationHealth([0.2, 0.21, 0.18, 0.22], 0.22, 7);
    expect(result.healthy).toBe(true);
    expect(result.alert).toBeNull();
  });

  it("a single bad day does not trip a 7-day limit", () => {
    const result = checkCalibrationHealth([0.2, 0.25, 0.2, 0.2], 0.22, 7);
    expect(result.healthy).toBe(true);
  });

  it("flags exactly at the consecutive-day limit", () => {
    const series = Array(7).fill(0.3);
    const result = checkCalibrationHealth(series, 0.22, 7);
    expect(result.healthy).toBe(false);
    expect(result.currentStreak).toBe(7);
    expect(result.alert).toContain("7 consecutive day(s)");
  });

  it("does not flag one day short of the limit", () => {
    const series = Array(6).fill(0.3);
    const result = checkCalibrationHealth(series, 0.22, 7);
    expect(result.healthy).toBe(true);
    expect(result.currentStreak).toBe(6);
  });

  it("a single good day resets the streak", () => {
    const series = [...Array(6).fill(0.3), 0.2, ...Array(6).fill(0.3)];
    const result = checkCalibrationHealth(series, 0.22, 7);
    expect(result.healthy).toBe(true);
    expect(result.currentStreak).toBe(6);
    expect(result.longestStreak).toBe(6);
  });

  it("stays flagged once the streak is broken but was already long enough earlier", () => {
    // Regression: an early qualifying streak must still surface even if the
    // series later recovers — otherwise a real regression could self-heal out
    // of the report before anyone sees the alert.
    const series = [...Array(9).fill(0.3), 0.1, 0.1];
    const result = checkCalibrationHealth(series, 0.22, 7);
    expect(result.healthy).toBe(false);
    expect(result.longestStreak).toBe(9);
    expect(result.currentStreak).toBe(0);
  });

  it("a value exactly at the threshold does not count as a bad day", () => {
    const series = Array(10).fill(0.22);
    const result = checkCalibrationHealth(series, 0.22, 7);
    expect(result.healthy).toBe(true);
  });

  it("NaN/non-finite entries break the streak without counting as good or bad", () => {
    const series = [...Array(6).fill(0.3), NaN, ...Array(6).fill(0.3)];
    const result = checkCalibrationHealth(series, 0.22, 7);
    expect(result.healthy).toBe(true);
    expect(result.currentStreak).toBe(6);
  });

  it("falls back to defaults on invalid threshold/consecutiveDays", () => {
    const withBadThreshold = checkCalibrationHealth(Array(7).fill(0.3), Number.NaN, 7);
    expect(withBadThreshold.threshold).toBe(0.22);
    const withBadLimit = checkCalibrationHealth(Array(7).fill(0.3), 0.22, -3);
    expect(withBadLimit.consecutiveDaysLimit).toBe(7);
  });

  it("two separate qualifying streaks: longestStreak reflects the longer one", () => {
    const series = [...Array(8).fill(0.3), 0.1, ...Array(10).fill(0.3)];
    const result = checkCalibrationHealth(series, 0.22, 7);
    expect(result.healthy).toBe(false);
    expect(result.longestStreak).toBe(10);
  });
});

describe("checkNegativeUpdateGuard", () => {
  /** incumbentLoss fixed at 1 so incumbentLoss - candidateLoss === the given gain, exactly. */
  function round(gains: readonly number[]): CohortGain[] {
    return gains.map((g, i) => ({ cohort: `c${i}`, incumbentLoss: 1, candidateLoss: 1 - g }));
  }

  it("no alert and an empty smoothed series on an empty input", () => {
    const result = checkNegativeUpdateGuard([]);
    expect(result.alertActive).toBe(false);
    expect(result.alert).toBeNull();
    expect(result.smoothedSeries).toEqual([]);
  });

  it("stays clear when the candidate consistently beats the incumbent", () => {
    const windows = Array.from({ length: 5 }, () => round([0.02, 0.03, 0.01]));
    const result = checkNegativeUpdateGuard(windows);
    expect(result.alertActive).toBe(false);
    expect(result.currentPositiveStreak).toBe(5);
    expect(result.currentNegativeStreak).toBe(0);
  });

  it("exactly rollbackThreshold consecutive negative rounds does not trigger (must exceed it)", () => {
    const windows = Array.from({ length: 3 }, () => round([-0.05, -0.04, -0.06]));
    const result = checkNegativeUpdateGuard(windows, 3, 2);
    expect(result.currentNegativeStreak).toBe(3);
    expect(result.alertActive).toBe(false);
  });

  it("triggers once the negative streak exceeds rollbackThreshold", () => {
    const windows = Array.from({ length: 4 }, () => round([-0.05, -0.04, -0.06]));
    const result = checkNegativeUpdateGuard(windows, 3, 2);
    expect(result.currentNegativeStreak).toBe(4);
    expect(result.alertActive).toBe(true);
    expect(result.alert).toContain("rollback");
  });

  it("stays active with fewer than cancelWindow good rounds after triggering", () => {
    const bad = Array.from({ length: 4 }, () => round([-0.05, -0.04, -0.06]));
    const oneGood = [round([0.05, 0.04, 0.06])];
    const result = checkNegativeUpdateGuard([...bad, ...oneGood], 3, 2);
    expect(result.alertActive).toBe(true);
  });

  it("clears the alert after cancelWindow consecutive non-negative rounds", () => {
    const bad = Array.from({ length: 4 }, () => round([-0.05, -0.04, -0.06]));
    const good = Array.from({ length: 2 }, () => round([0.05, 0.04, 0.06]));
    const result = checkNegativeUpdateGuard([...bad, ...good], 3, 2);
    expect(result.alertActive).toBe(false);
  });

  it("one pathological cohort cannot flip the round's median verdict", () => {
    const r = round([0.05, 0.04, 0.06, 0.05, -0.9]);
    const result = checkNegativeUpdateGuard([r], 3, 2);
    expect(result.smoothedSeries[0]).toBeGreaterThan(0);
  });

  it("a round with no cohorts is a gap — resets both streaks and is NaN, not counted", () => {
    const windows = [round([0.05]), round([0.05]), [], round([0.05])];
    const result = checkNegativeUpdateGuard(windows, 3, 2);
    expect(result.smoothedSeries[2]).toBeNaN();
    expect(result.currentPositiveStreak).toBe(1); // only the round after the gap counts
  });

  it("falls back to defaults on invalid rollbackThreshold/cancelWindow", () => {
    const result = checkNegativeUpdateGuard([], -1, 0);
    expect(result.rollbackThreshold).toBe(3);
    expect(result.cancelWindow).toBe(2);
  });

  it("hand-computed: smoothed value is the trailing mean of per-round medians", () => {
    const windows = [round([0.1]), round([-0.2]), round([0.3])];
    const result = checkNegativeUpdateGuard(windows, 3, 2);
    expect(result.smoothedSeries[0]).toBeCloseTo(0.1, 10);
    expect(result.smoothedSeries[1]).toBeCloseTo(-0.05, 10);
    expect(result.smoothedSeries[2]).toBeCloseTo(0.05, 10);
  });
});

describe("phaseBucketedCalibrationAudit", () => {
  it("returns a zeroed, unmasked result on empty input", () => {
    const result = phaseBucketedCalibrationAudit([]);
    expect(result.overallEce).toBe(0);
    expect(result.masked).toBe(false);
    expect(result.alert).toBeNull();
    expect(result.phases).toEqual([]);
  });

  it("stays unmasked when every phase is well-calibrated", () => {
    const samples: PhaseSample[] = [
      ...Array.from({ length: 30 }, () => ({ p: 0.6, y: 1 as const, phase: "A" })),
      ...Array.from({ length: 20 }, () => ({ p: 0.6, y: 0 as const, phase: "A" })),
      ...Array.from({ length: 30 }, () => ({ p: 0.6, y: 1 as const, phase: "B" })),
      ...Array.from({ length: 20 }, () => ({ p: 0.6, y: 0 as const, phase: "B" })),
    ];
    const result = phaseBucketedCalibrationAudit(samples, 0.05);
    expect(result.masked).toBe(false);
    expect(result.phases.every((p) => !p.exceedsFloor)).toBe(true);
  });

  it("flags a phase-specific miscalibration masked by a perfectly-calibrated overall average", () => {
    // Both phases forecast the SAME p=0.55 (one forecast bin), so their
    // opposite-direction errors cancel exactly when pooled: overall observed
    // rate = (75+35)/200 = 0.55, matching the forecast, ECE ~ 0. Split by
    // phase, each is badly miscalibrated in opposite directions (|gap|=0.20).
    const phaseA: PhaseSample[] = [
      ...Array.from({ length: 75 }, () => ({ p: 0.55, y: 1 as const, phase: "A" })),
      ...Array.from({ length: 25 }, () => ({ p: 0.55, y: 0 as const, phase: "A" })),
    ];
    const phaseB: PhaseSample[] = [
      ...Array.from({ length: 35 }, () => ({ p: 0.55, y: 1 as const, phase: "B" })),
      ...Array.from({ length: 65 }, () => ({ p: 0.55, y: 0 as const, phase: "B" })),
    ];
    const result = phaseBucketedCalibrationAudit([...phaseA, ...phaseB], 0.05);
    expect(result.overallEce).toBeCloseTo(0, 4);
    expect(result.masked).toBe(true);
    expect(result.alert).toContain("masking");
    const a = result.phases.find((p) => p.phase === "A")!;
    const b = result.phases.find((p) => p.phase === "B")!;
    expect(a.ece).toBeCloseTo(0.2, 4);
    expect(b.ece).toBeCloseTo(0.2, 4);
    expect(a.exceedsFloor).toBe(true);
    expect(b.exceedsFloor).toBe(true);
    expect(a.observedRate).toBeCloseTo(0.75, 4);
    expect(b.observedRate).toBeCloseTo(0.35, 4);
  });

  it("does not flag a thin phase below minPhaseSamples, even with a real gap", () => {
    const samples: PhaseSample[] = [
      ...Array.from({ length: 3 }, () => ({ p: 0.5, y: 1 as const, phase: "rare" })),
      ...Array.from({ length: 100 }, () => ({ p: 0.5, y: 1 as const, phase: "common" })),
      ...Array.from({ length: 100 }, () => ({ p: 0.5, y: 0 as const, phase: "common" })),
    ];
    const result = phaseBucketedCalibrationAudit(samples, 0.05, 10, 20);
    const rare = result.phases.find((p) => p.phase === "rare")!;
    expect(rare.n).toBe(3);
    expect(rare.ece).toBeGreaterThan(0.05); // genuinely far off in isolation
    expect(rare.exceedsFloor).toBe(false); // but withheld — too thin to trust
  });

  it("is not 'masked' when the overall ECE is already over the floor (nothing hidden)", () => {
    const samples: PhaseSample[] = [
      ...Array.from({ length: 100 }, () => ({ p: 0.5, y: 1 as const, phase: "A" })),
    ];
    const result = phaseBucketedCalibrationAudit(samples, 0.05);
    expect(result.overallEce).toBeGreaterThan(0.05);
    expect(result.masked).toBe(false); // the failure is already visible overall
    const a = result.phases[0]!;
    expect(a.exceedsFloor).toBe(true); // still correctly reported, just not "masked"
  });
});

describe("stabilityPlasticityCheck", () => {
  it("is eligible when the candidate improves the newest cohort and doesn't forget the oldest", () => {
    const result = stabilityPlasticityCheck(
      { incumbentEce: 0.08, candidateEce: 0.05 }, // newest: improved by 0.03
      { incumbentEce: 0.04, candidateEce: 0.035 }, // oldest: also improved (forgetting negative)
    );
    expect(result.plasticity).toBeCloseTo(0.03, 6);
    expect(result.forgetting).toBeCloseTo(-0.005, 6);
    expect(result.eligible).toBe(true);
    expect(result.alert).toBeNull();
  });

  it("is ineligible when forgetting exceeds the bound, even with strong newest-cohort gains", () => {
    const result = stabilityPlasticityCheck(
      { incumbentEce: 0.08, candidateEce: 0.02 }, // newest: big improvement
      { incumbentEce: 0.04, candidateEce: 0.06 }, // oldest: degraded by 0.02, bound is 0.01
      0.01,
    );
    expect(result.forgetting).toBeCloseTo(0.02, 6);
    expect(result.eligible).toBe(false);
    expect(result.alert).toContain("forgetting bound");
  });

  it("forgetting exactly at the bound is still eligible (<=, not <)", () => {
    const result = stabilityPlasticityCheck(
      { incumbentEce: 0.08, candidateEce: 0.05 },
      { incumbentEce: 0.04, candidateEce: 0.05 }, // degraded by exactly 0.01
      0.01,
    );
    expect(result.forgetting).toBeCloseTo(0.01, 6);
    expect(result.eligible).toBe(true);
  });

  it("hand-computed psRatio: plasticity / |forgetting|", () => {
    const result = stabilityPlasticityCheck(
      { incumbentEce: 0.1, candidateEce: 0.06 }, // plasticity = 0.04
      { incumbentEce: 0.04, candidateEce: 0.05 }, // forgetting = 0.01
      0.02,
    );
    expect(result.plasticity).toBeCloseTo(0.04, 6);
    expect(result.forgetting).toBeCloseTo(0.01, 6);
    expect(result.psRatio).toBeCloseTo(4, 4); // 0.04 / 0.01
  });

  it("negative forgetting (improved on the old cohort too) uses its absolute value in psRatio", () => {
    const result = stabilityPlasticityCheck(
      { incumbentEce: 0.1, candidateEce: 0.06 }, // plasticity = 0.04
      { incumbentEce: 0.04, candidateEce: 0.02 }, // forgetting = -0.02 (improved)
    );
    expect(result.psRatio).toBeCloseTo(2, 4); // 0.04 / |-0.02|
  });

  it("exactly-zero forgetting does not throw or divide by zero — uses an epsilon floor", () => {
    const result = stabilityPlasticityCheck(
      { incumbentEce: 0.1, candidateEce: 0.08 },
      { incumbentEce: 0.04, candidateEce: 0.04 }, // forgetting = 0
    );
    expect(result.forgetting).toBe(0);
    expect(Number.isFinite(result.psRatio)).toBe(true);
    expect(result.psRatio).toBeGreaterThan(1000); // large but finite
    expect(result.eligible).toBe(true);
  });

  it("falls back to the default bound on invalid input", () => {
    const result = stabilityPlasticityCheck(
      { incumbentEce: 0.1, candidateEce: 0.08 },
      { incumbentEce: 0.04, candidateEce: 0.041 },
      -5,
    );
    expect(result.forgettingBound).toBe(0.01);
  });
});

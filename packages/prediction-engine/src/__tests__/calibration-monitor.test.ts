import { describe, it, expect } from "vitest";
import { checkCalibrationHealth, checkNegativeUpdateGuard, type CohortGain } from "../calibration-monitor.js";

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

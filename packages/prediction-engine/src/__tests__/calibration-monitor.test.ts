import { describe, it, expect } from "vitest";
import { checkCalibrationHealth } from "../calibration-monitor.js";

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

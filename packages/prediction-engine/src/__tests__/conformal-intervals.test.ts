import { describe, expect, it } from "vitest";
import {
  buildRollingConformalWindows,
  runRollingMondrianConformal,
  splitConformalQuantile,
  type ConformalProjectionSample,
} from "../conformal-intervals.js";

function sample(
  week: number,
  position: "RB" | "WR",
  actualFantasyPoints: number,
  predictedMean = 10,
): ConformalProjectionSample {
  return {
    sampleId: `${position}-${week}`,
    season: 2024,
    week,
    position,
    predictedMean,
    actualFantasyPoints,
  };
}

const samples: readonly ConformalProjectionSample[] = Array.from({ length: 10 }, (_, index) => {
  const week = index + 1;
  return [
    sample(week, "WR", week < 6 ? 15 : 14),
    sample(week, "RB", week < 6 ? 11 : 11),
  ];
}).flat();

describe("splitConformalQuantile", () => {
  it("fails closed to +∞ on empty or when rank exceeds n (does not clamp)", () => {
    expect(splitConformalQuantile([], 0.8)).toBe(Number.POSITIVE_INFINITY);
    // n=2, p=0.8 → ceil(3*0.8)=3 > 2
    expect(splitConformalQuantile([1, 2], 0.8)).toBe(Number.POSITIVE_INFINITY);
    expect(splitConformalQuantile([1, 2], 0.8)).not.toBe(2);
  });

  it("returns the max residual when the quantile exists exactly at n", () => {
    // n=4, p=0.8 → ceil(5*0.8)=4
    expect(splitConformalQuantile([1, 2, 3, 4], 0.8)).toBe(4);
  });
});

describe("buildRollingConformalWindows", () => {
  it("keeps fit and calibration weeks disjoint", () => {
    const windows = buildRollingConformalWindows(samples, { fitWeeks: 3, calibrationWeeks: 2 });

    expect(windows[0]?.fitWeekKeys).toEqual(["2024-W01", "2024-W02", "2024-W03"]);
    expect(windows[0]?.calibrationWeekKeys).toEqual(["2024-W04", "2024-W05"]);
    expect(windows[0]?.testWeekKey).toBe("2024-W06");
    expect(windows.every((window) => {
      const fit = new Set(window.fitWeekKeys);
      return window.calibrationWeekKeys.every((key) => !fit.has(key));
    })).toBe(true);
  });
});

describe("runRollingMondrianConformal", () => {
  it("does not count infinite intervals as coverage on thin calibration", () => {
    const report = runRollingMondrianConformal(samples, {
      fitWeeks: 3,
      calibrationWeeks: 2,
      targetCoverage: 0.8,
      learningRate: 0.1,
    });

    expect(report.sampleSize).toBe(10);
    expect(report.fitCalibrationOverlapViolationCount).toBe(0);
    expect(report.priced).toBe(false);
    expect(report.status).toBe("shadow");
    // n=2 residuals, α≈0.2 → ceil((2+1)*0.8)=3 > 2 → unlicensed. Inf is not cover.
    expect(report.unlicensedCount).toBeGreaterThan(0);
    expect(report.intervals.every((row) => Object.prototype.hasOwnProperty.call(row, "licensed"))).toBe(
      true,
    );
    expect(report.intervals.filter((row) => !row.licensed).every((row) => row.covered === false)).toBe(
      true,
    );
  });

  it("builds licensed Mondrian intervals once calibration is large enough for the quantile", () => {
    const long: ConformalProjectionSample[] = Array.from({ length: 16 }, (_, index) => {
      const week = index + 1;
      return [
        sample(week, "WR", 12 + (week % 3), 10),
        sample(week, "RB", 9 + (week % 2), 10),
      ];
    }).flat();
    const report = runRollingMondrianConformal(long, {
      fitWeeks: 3,
      calibrationWeeks: 6,
      targetCoverage: 0.8,
      learningRate: 0.1,
    });
    expect(report.licensedCount).toBeGreaterThan(0);
    const licensed = report.intervals.filter((row) => row.licensed);
    expect(licensed.every((row) => Number.isFinite(row.lower) && Number.isFinite(row.upper))).toBe(
      true,
    );
    const wr = licensed.find((row) => row.position === "WR");
    const rb = licensed.find((row) => row.position === "RB");
    expect(wr).toBeDefined();
    expect(rb).toBeDefined();
  });

  it("reports misses when calibration weeks are too narrow for the test segment", () => {
    const shifted = samples.map((row) =>
      row.week >= 6 && row.position === "WR"
        ? { ...row, actualFantasyPoints: 21 }
        : row,
    );
    const report = runRollingMondrianConformal(shifted, {
      fitWeeks: 3,
      calibrationWeeks: 2,
      targetCoverage: 0.8,
    });

    expect(report.coverage).toBeLessThan(1);
  });
});

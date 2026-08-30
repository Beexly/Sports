import { describe, expect, it } from "vitest";
import {
  buildRollingConformalWindows,
  runRollingMondrianConformal,
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
  it("builds Mondrian position intervals with rolling recalibration", () => {
    const report = runRollingMondrianConformal(samples, {
      fitWeeks: 3,
      calibrationWeeks: 2,
      targetCoverage: 0.8,
      learningRate: 0.1,
    });

    const wr = report.intervals.find((interval) => interval.sampleId === "WR-6");
    const rb = report.intervals.find((interval) => interval.sampleId === "RB-6");

    expect(report.sampleSize).toBe(10);
    expect(report.fitCalibrationOverlapViolationCount).toBe(0);
    expect((wr?.upper ?? 0) - (wr?.lower ?? 0)).toBeGreaterThan((rb?.upper ?? 0) - (rb?.lower ?? 0));
    expect(report.coverageByPosition).toEqual([
      { position: "RB", sampleSize: 5, coverage: 1 },
      { position: "WR", sampleSize: 5, coverage: 1 },
    ]);
    expect(report.coverage).toBe(1);
    expect(report.priced).toBe(false);
    expect(report.status).toBe("shadow");
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

    const wrCoverage = report.coverageByPosition.find((row) => row.position === "WR");
    expect(wrCoverage?.coverage).toBeLessThan(1);
    expect(report.coverage).toBeLessThan(1);
  });
});

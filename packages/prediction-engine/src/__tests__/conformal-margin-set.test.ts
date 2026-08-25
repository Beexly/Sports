import { describe, expect, it } from "vitest";
import {
  conformalMarginSet,
  marginSetCovers,
  MIN_SAMPLES_MARGIN_SET,
  splitConformalQuantile,
} from "../conformal-margin-set.js";
import type { MarginCalibrationRow } from "../conformal-margin-set.js";

function rows(n: number, sportKey: string, predicted: number, actual: number): MarginCalibrationRow[] {
  return Array.from({ length: n }, () => ({
    predictedMean: predicted,
    actualMargin: actual,
    sportKey,
  }));
}

describe("splitConformalQuantile", () => {
  it("uses the ceil((n+1)p) order statistic (finite-sample correction)", () => {
    const values = [1, 2, 3, 4];
    // n=4, p=0.75 → ceil(5*0.75)=4 → 4th order statistic = 4
    expect(splitConformalQuantile(values, 0.75)).toBe(4);
    // p=0.5 → ceil(2.5)=3 → 3rd = 3
    expect(splitConformalQuantile(values, 0.5)).toBe(3);
  });

  it("returns 0 on empty input", () => {
    expect(splitConformalQuantile([], 0.9)).toBe(0);
  });
});

describe("conformalMarginSet", () => {
  it("refuses below MIN_SAMPLES_MARGIN_SET (no invented set)", () => {
    const set = conformalMarginSet({
      predictedMean: 3,
      sportKey: "icehockey_nhl",
      calibration: rows(MIN_SAMPLES_MARGIN_SET - 1, "icehockey_nhl", 3, 3),
    });
    expect(set.status).toBe("insufficient_sample");
    expect(set.integers).toEqual([]);
    expect(marginSetCovers(set, 3)).toBe(false);
  });

  it("Mondrian-by-sport: NHL rows do not calibrate an NFL query", () => {
    const nhl = rows(MIN_SAMPLES_MARGIN_SET, "icehockey_nhl", 1, 2);
    const set = conformalMarginSet({
      predictedMean: 3,
      sportKey: "americanfootball_nfl",
      calibration: nhl,
    });
    expect(set.status).toBe("insufficient_sample");
    expect(set.n).toBe(0);
  });

  it("covers the calibration residuals at the target level on a homoscedastic sample", () => {
    const calibration: MarginCalibrationRow[] = Array.from({ length: 80 }, (_, i) => ({
      predictedMean: 0,
      // residuals 0..4 cycling — max residual 4, so 90% set is wide enough
      actualMargin: i % 5,
      sportKey: "baseball_mlb",
    }));
    const set = conformalMarginSet({
      predictedMean: 0,
      sportKey: "baseball_mlb",
      calibration,
      alpha: 0.1,
    });
    expect(set.status).toBe("ok");
    expect(set.n).toBe(80);
    expect(set.halfWidth).toBeGreaterThan(0);
    expect(set.integers.length).toBeGreaterThan(0);
    expect(set.lower).toBeLessThanOrEqual(set.upper);

    const covered = calibration.filter((row) => marginSetCovers(set, row.actualMargin)).length;
    expect(covered / calibration.length).toBeGreaterThanOrEqual(0.85);
  });

  it("integer set is exactly the integers in [pred − q, pred + q]", () => {
    const calibration: MarginCalibrationRow[] = Array.from({ length: 70 }, () => ({
      predictedMean: 2,
      actualMargin: 2,
      sportKey: "soccer_epl",
    }));
    const set = conformalMarginSet({
      predictedMean: 2,
      sportKey: "soccer_epl",
      calibration,
    });
    expect(set.status).toBe("ok");
    expect(set.halfWidth).toBe(0);
    expect(set.integers).toEqual([2]);
  });
});

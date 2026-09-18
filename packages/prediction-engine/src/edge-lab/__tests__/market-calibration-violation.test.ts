import { describe, expect, it } from "vitest";
import {
  MARKET_CALIBRATION_MIN_BIN_N,
  MARKET_CALIBRATION_VIOLATION_PP,
  measureMarketCalibrationViolation,
} from "../market-calibration-violation.js";

function fillBin(sport: string, p: number, y: 0 | 1, n: number) {
  return Array.from({ length: n }, () => ({ sport, marketP: p, y }));
}

describe("measureMarketCalibrationViolation", () => {
  it("throws on empty rather than inventing a 5% number", () => {
    expect(() => measureMarketCalibrationViolation([])).toThrow(/empty sample/);
  });

  it("underpowered bins are not violations and not a pass", () => {
    const rows = fillBin("NFL", 0.6, 1, 10);
    const report = measureMarketCalibrationViolation(rows);
    expect(report.overall.verdict).toBe("underpowered");
    expect(report.overall.violationRate).toBeNull();
    expect(report.overall.binsViolating).toBe(0);
    expect(report.dbQueried).toBe(false);
    expect(report.violationPp).toBe(MARKET_CALIBRATION_VIOLATION_PP);
  });

  it("flags a 5pp miss on a licensed bin and stays quiet on a calibrated one", () => {
    const n = MARKET_CALIBRATION_MIN_BIN_N;
    const bad = fillBin("NFL", 0.7, 0, n); // meanP 0.7, meanY 0
    const good = fillBin("NBA", 0.55, 1, n).map((r, i) => ({
      ...r,
      y: (i < Math.round(0.55 * n) ? 1 : 0) as 0 | 1,
    }));
    const report = measureMarketCalibrationViolation([...bad, ...good]);
    const nfl = report.bySport.find((s) => s.sport === "NFL")!;
    const nba = report.bySport.find((s) => s.sport === "NBA")!;
    expect(nfl.verdict).toBe("measured");
    expect(nfl.binsViolating).toBeGreaterThan(0);
    expect(nba.verdict).toBe("measured");
    expect(nba.binsViolating).toBe(0);
    expect(report.priced).toBe(false);
  });
});

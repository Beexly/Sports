import { describe, it, expect } from "vitest";
import {
  isotonicCalibration,
  brierDecomposition,
  expectedCalibrationError,
  type CalibrationSample,
} from "../probability-calibration.js";

describe("brierDecomposition", () => {
  it("splits a coin-flip forecast into pure uncertainty", () => {
    const s: CalibrationSample[] = [
      { p: 0.5, y: 1 },
      { p: 0.5, y: 1 },
      { p: 0.5, y: 0 },
      { p: 0.5, y: 0 },
    ];
    const d = brierDecomposition(s);
    expect(d.brier).toBeCloseTo(0.25, 4);
    expect(d.reliability).toBeCloseTo(0, 4);
    expect(d.resolution).toBeCloseTo(0, 4);
    expect(d.uncertainty).toBeCloseTo(0.25, 4);
    expect(d.baseRate).toBeCloseTo(0.5, 4);
  });

  it("rewards perfect resolution with reliability 0 and brier 0", () => {
    const s: CalibrationSample[] = [
      { p: 0, y: 0 },
      { p: 0, y: 0 },
      { p: 1, y: 1 },
      { p: 1, y: 1 },
    ];
    const d = brierDecomposition(s);
    expect(d.brier).toBeCloseTo(0, 4);
    expect(d.reliability).toBeCloseTo(0, 4);
    expect(d.resolution).toBeCloseTo(0.25, 4);
  });

  it("flags an overconfident wrong forecast via high reliability", () => {
    const s: CalibrationSample[] = [
      { p: 0.9, y: 0 },
      { p: 0.9, y: 0 },
    ];
    const d = brierDecomposition(s);
    expect(d.brier).toBeCloseTo(0.81, 4);
    expect(d.reliability).toBeCloseTo(0.81, 4);
    expect(d.uncertainty).toBeCloseTo(0, 4);
  });
});

describe("expectedCalibrationError", () => {
  it("is 0 when forecasts match observed rates", () => {
    expect(
      expectedCalibrationError([
        { p: 0.5, y: 1 },
        { p: 0.5, y: 0 },
      ]),
    ).toBeCloseTo(0, 4);
  });

  it("equals the gap when forecasts are systematically wrong", () => {
    expect(
      expectedCalibrationError([
        { p: 0.9, y: 0 },
        { p: 0.9, y: 0 },
      ]),
    ).toBeCloseTo(0.9, 4);
  });
});

describe("isotonicCalibration (PAVA)", () => {
  it("returns an identity-ish passthrough on empty input", () => {
    const m = isotonicCalibration([]);
    expect(m.points).toHaveLength(0);
    expect(m.predict(0.42)).toBeCloseTo(0.42, 4);
  });

  it("produces a monotonic non-decreasing calibration map and pools violators", () => {
    const m = isotonicCalibration([
      { p: 0.1, y: 0 },
      { p: 0.2, y: 1 },
      { p: 0.3, y: 0 },
      { p: 0.4, y: 1 },
    ]);
    const cal = m.points.map((pt) => pt.calibrated);
    // Non-decreasing.
    for (let i = 1; i < cal.length; i++) {
      expect(cal[i]!).toBeGreaterThanOrEqual(cal[i - 1]!);
    }
    // The 0.2/0.3 violation pools to 0.5.
    expect(cal).toEqual([0, 0.5, 1]);
    expect(m.predict(0.05)).toBe(0); // below first breakpoint clamps to lowest
    expect(m.predict(0.3)).toBe(0.5);
    expect(m.predict(0.9)).toBe(1);
  });

  it("recovers a well-calibrated monotone signal unchanged", () => {
    const m = isotonicCalibration([
      { p: 0.2, y: 0 },
      { p: 0.4, y: 0 },
      { p: 0.6, y: 1 },
      { p: 0.8, y: 1 },
    ]);
    expect(m.points.map((p) => p.calibrated)).toEqual([0, 0, 1, 1]);
  });

  it("pools repeated forecasts with mixed outcomes to one observed-rate breakpoint", () => {
    // Two picks both at p=0.65, outcomes 0 then 1 → one breakpoint at 0.5,
    // not two order-dependent breakpoints (Codex P2).
    const m = isotonicCalibration([
      { p: 0.65, y: 0 },
      { p: 0.65, y: 1 },
    ]);
    expect(m.points).toHaveLength(1);
    expect(m.predict(0.65)).toBe(0.5);
  });
});

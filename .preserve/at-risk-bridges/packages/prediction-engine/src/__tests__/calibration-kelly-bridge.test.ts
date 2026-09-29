import { describe, it, expect } from "vitest";
import {
  applyCalibrator,
  sizeAfterCalibration,
  type TimedCalibrationSample,
} from "../calibration-kelly-bridge.js";
import {
  centeredIsotonicCalibration,
  type CalibrationSample,
} from "../probability-calibration.js";

function synthTrain(n = 80): CalibrationSample[] {
  const out: CalibrationSample[] = [];
  for (let i = 0; i < n; i++) {
    const p = 0.15 + (0.7 * i) / (n - 1);
    const y = (Math.sin(i * 7.1) * 0.5 + 0.5) < Math.max(0.08, p - 0.12) ? 1 : 0;
    out.push({ p, y: y as 0 | 1 });
  }
  return out;
}

describe("applyCalibrator", () => {
  it("maps through CIR predict", () => {
    const train = synthTrain(40);
    const m = centeredIsotonicCalibration(train);
    const mapped = applyCalibrator(m, [0.2, 0.5, 0.8]);
    expect(mapped).toHaveLength(3);
    expect(mapped[0]!).toBeLessThanOrEqual(mapped[2]! + 1e-9);
  });
});

describe("sizeAfterCalibration", () => {
  it("disarms stakes when CLV sample floor not met", () => {
    const train = synthTrain(60);
    const sizeRows: TimedCalibrationSample[] = [
      { p: 0.55, y: 1, decimalOdds: 2.0, edge: 0.05, se: 0.04 },
      { p: 0.6, y: 1, decimalOdds: 1.91, edge: 0.08, se: 0.05 },
      { p: 0.58, y: 0, decimalOdds: 2.1, edge: 0.06, se: 0.05 },
    ];
    const r = sizeAfterCalibration({
      train,
      sizeRows,
      rhoClv: 0.4,
      settledCount: 10, // below floor
    });
    expect(r.mode).toBe("disarmed");
    expect(r.deflator).toBe(0);
    expect(r.stakes.every((s) => s === 0)).toBe(true);
    expect(r.distinctCir).toBeGreaterThan(1);
  });

  it("sizes via portfolio path when floor met and n>=3", () => {
    // Mildly overconfident but rank-preserving train so CIR keeps mid-band +EV
    const train: CalibrationSample[] = [];
    for (let i = 0; i < 90; i++) {
      const p = 0.4 + (0.3 * i) / 89;
      // true rate ≈ p - 0.03 (mild overconfidence)
      const y = (i % 10) / 10 < Math.max(0.05, p - 0.03) ? 1 : 0;
      train.push({ p, y: y as 0 | 1 });
    }
    const sizeRows: TimedCalibrationSample[] = [
      { p: 0.62, y: 1, decimalOdds: 1.8, edge: 0.1, se: 0.03, selected: true },
      { p: 0.65, y: 1, decimalOdds: 1.75, edge: 0.12, se: 0.03, selected: true },
      { p: 0.6, y: 1, decimalOdds: 1.85, edge: 0.09, se: 0.03, selected: true },
    ];
    const r = sizeAfterCalibration({
      train,
      sizeRows,
      rhoClv: 0.35,
      settledCount: 80,
      lambda: 0.25,
    });
    expect(r.mode).toBe("portfolio");
    expect(r.deflator).toBeCloseTo(0.35, 5);
    expect(r.portfolio).not.toBeNull();
    // After CIR + James–Stein, stakes may be small but deflator is applied;
    // at least one calibrated p should remain in (0,1) and portfolio path ran.
    expect(r.calibratedProbs.every((p) => p > 0 && p < 1)).toBe(true);
    expect(r.stakes.length).toBe(3);
    for (const s of r.stakes) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(0.25 + 1e-9);
    }
    // With clear +EV after mild CIR, expect non-zero book
    expect(r.stakes.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
  });

  it("fractional path for single row with odds", () => {
    const train = synthTrain(40);
    const r = sizeAfterCalibration({
      train,
      sizeRows: [{ p: 0.58, y: 1, decimalOdds: 2.0 }],
      rhoClv: 0.5,
      settledCount: 60,
      lambda: 0.25,
    });
    expect(r.mode).toBe("fractional");
    expect(r.stakes).toHaveLength(1);
    expect(r.stakes[0]!).toBeGreaterThanOrEqual(0);
  });
});

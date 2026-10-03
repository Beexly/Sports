import { describe, expect, it } from "vitest";
import {
  fitTemperatureNewton,
  fitTemperature,
  applyTemperature,
  diagnoseLogLoss,
  meanLogLossAtTemperature,
  holdoutLogLoss,
  debugIsotonicCalibration,
  type CalibrationSample,
} from "../index.js";

function overconfident(n: number, seed = 7): CalibrationSample[] {
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
  const out: CalibrationSample[] = [];
  for (let i = 0; i < n; i++) {
    const trueP = i % 2 === 0 ? 0.65 : 0.35;
    const y = (rand() < trueP ? 1 : 0) as 0 | 1;
    const p = trueP > 0.5 ? 0.92 : 0.08;
    out.push({ p, y });
  }
  return out;
}

describe("fitTemperatureNewton", () => {
  it("softens overconfident forecasts (T>1) and cuts NLL vs raw", () => {
    const samples = overconfident(200, 3);
    const model = fitTemperatureNewton(samples);
    expect(model).not.toBeNull();
    expect(model!.T).toBeGreaterThan(1);
    const rawNll = meanLogLossAtTemperature(samples, 1);
    const fitNll = meanLogLossAtTemperature(samples, model!.T);
    expect(fitNll).toBeLessThan(rawNll);
    // Newton should not be worse than grid
    const grid = fitTemperature(samples);
    expect(grid).not.toBeNull();
    const gridNll = meanLogLossAtTemperature(samples, grid!.T);
    expect(fitNll).toBeLessThanOrEqual(gridNll + 1e-6);
  });

  it("applyTemperature at T=1 is identity", () => {
    expect(applyTemperature(0.7, 1)).toBeCloseTo(0.7, 5);
  });
});

describe("diagnoseLogLoss / holdoutLogLoss", () => {
  it("flags high |p−0.5| on overconfident set", () => {
    const samples = overconfident(100, 1);
    const d = diagnoseLogLoss(samples);
    expect(d.n).toBe(100);
    expect(d.meanAbsDevFromHalf).toBeGreaterThan(0.3);
    expect(d.meanLogLoss).toBeGreaterThan(0);
  });

  it("holdout shows temperature can improve OOS NLL", () => {
    const samples = overconfident(250, 9);
    const h = holdoutLogLoss(samples, (train) => {
      const m = fitTemperatureNewton(train);
      return m ? m.predict : null;
    });
    expect(h.nTest).toBeGreaterThan(50);
    expect(h.mappedLogLoss).not.toBeNull();
    // Soften should not explode OOS NLL
    expect(h.mappedLogLoss!).toBeLessThan(h.rawLogLoss + 0.05);
  });
});

describe("debugIsotonicCalibration", () => {
  it("reports plateaus and applyOff", () => {
    const samples = overconfident(150, 2);
    const report = debugIsotonicCalibration(samples);
    expect(report.applyOff).toBe(true);
    expect(report.n).toBe(150);
    expect(report.nPlateaus).toBeGreaterThan(0);
    expect(report.nDistinctRaw).toBeGreaterThan(0);
    expect(["identity", "isotonic_pava", "isotonic_cir", "prefer_parametric"]).toContain(
      report.recommendation,
    );
    expect(report.operatorHint.length).toBeGreaterThan(10);
  });
});

/**
 * Tests for ./2105-11982v2-calibration (arXiv:2105.11982v2, lane=calibration).
 *
 * ACCEPTANCE GATE: Adopt MIS as the standard interval score and the quantile/MIS-regression head as GSE's interval
 * engine if: on the 2025 test season, the MIS-regression (or quantile) interval beats the current
 * fixed-band practice by >=10% in MIS with coverage in [0.93, 0.97].
 */
import { describe, expect, it } from "vitest";
import * as mod from "./2105-11982v2-calibration";

describe("calibration diagnostics (arXiv:2105.11982v2)", () => {
  const pairs = [
    { p: 0.1, y: 0 },
    { p: 0.2, y: 0 },
    { p: 0.8, y: 1 },
    { p: 0.9, y: 1 },
  ];

  it("bins predictions into reliability bins", () => {
    const bins = mod.binPredictions(pairs, 2)!;
    expect(bins).toHaveLength(2);
    expect(bins[0]!.count).toBe(2);
    expect(bins[0]!.meanPred).toBeCloseTo(0.15, 10);
    expect(bins[0]!.meanObs).toBe(0);
    expect(bins[1]!.meanObs).toBe(1);
    expect(mod.binPredictions([], 2)).toBeNull();
    expect(mod.binPredictions(pairs, 0)).toBeNull();
  });

  it("computes expected calibration error", () => {
    const bins = mod.binPredictions(pairs, 2)!;
    // 0.5 * |0 - 0.15| + 0.5 * |1 - 0.85| = 0.15
    expect(mod.expectedCalibrationError(bins)).toBeCloseTo(0.15, 10);
    const perfect = mod.binPredictions(
      [
        { p: 0.2, y: 0 },
        { p: 0.2, y: 0 },
        { p: 0.8, y: 1 },
        { p: 0.8, y: 1 },
      ],
      2,
    )!;
    expect(mod.expectedCalibrationError(perfect)).toBeCloseTo(0.2, 10);
  });

  it("isotonic calibration is monotone non-decreasing", () => {
    const fitted = mod.isotonicCalibrate([
      { p: 0.1, y: 0 },
      { p: 0.2, y: 1 },
      { p: 0.3, y: 0 },
    ])!;
    expect(fitted).toEqual([0, 0.5, 0.5]);
    for (let i = 1; i < fitted.length; i++) {
      expect(fitted[i]!).toBeGreaterThanOrEqual(fitted[i - 1]!);
    }
    expect(mod.isotonicCalibrate([])).toBeNull();
  });
});

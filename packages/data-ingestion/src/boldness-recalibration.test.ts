/**
 * Tests for ./boldness-recalibration (arXiv:2305.03780v3, lane=calibration).
 *
 * ACCEPTANCE GATE: Adopt B-R as the publication-layer recalibrator iff, across the 5 walk-forward seasons,
 * 90%-threshold B-R achieves out-of-sample log loss <= MLE-LLO log loss (within 0.001) AND mean SD
 * >= 1.15x raw SD AND no season shows ECE degradation > 0.01 vs raw; reject (keep plain MLE-
 * LLO/temperature scaling) if B-R loses on log loss in >=2 of 5 seasons or optimization failures
 * exceed 2% of weekly refits.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./boldness-recalibration";

describe("boldness recalibration (arXiv:2305.03780v3)", () => {
  it("identity at a=0,b=1", () => {
    expect(mod.boldnessRecalibrate(0.7, 0, 1)).toBeCloseTo(0.7, 10);
    expect(mod.boldnessRecalibrate(0.7, 0, 0)).toBeNull();
    expect(mod.boldnessRecalibrate(0, 0, 1)).toBeNull();
  });
  it("b>1 bolds, b<1 shrinks", () => {
    expect(mod.boldnessRecalibrate(0.7, 0, 2)!).toBeGreaterThan(0.7);
    expect(mod.boldnessRecalibrate(0.7, 0, 0.5)!).toBeLessThan(0.7);
    expect(mod.boldnessRecalibrate(0.3, 0, 2)!).toBeLessThan(0.3);
  });
  it("fit recovers spread on overconfident forecasts", () => {
    const pairs: { p: number; y: 0 | 1 }[] = [
      { p: 0.9, y: 1 }, { p: 0.9, y: 0 }, { p: 0.8, y: 1 }, { p: 0.8, y: 0 },
      { p: 0.2, y: 0 }, { p: 0.2, y: 1 }, { p: 0.1, y: 0 }, { p: 0.1, y: 1 },
    ];
    const fit = mod.fitBoldness(pairs)!;
    expect(fit.b).toBeLessThanOrEqual(1);
    expect(mod.fitBoldness([])).toBeNull();
  });
  it("forecast spread", () => {
    expect(mod.forecastSpread([0.5, 0.5, 0.5])).toBeCloseTo(0, 10);
    expect(mod.forecastSpread([0.9, 0.1])!).toBeGreaterThan(0);
    expect(mod.forecastSpread([0.5])).toBeNull();
  });
});

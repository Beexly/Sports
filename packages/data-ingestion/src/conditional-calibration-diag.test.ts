/**
 * Tests for ./conditional-calibration-diag (arXiv:2108.03210v3, lane=calibration).
 *
 * ACCEPTANCE GATE: Adopt (ADAPT) if: on the 2025 out-of-sample window, CORP diagnostics detect miscalibration in
 * the current engine (M-hat-CB >= 0.15 x UNC, i.e., >=15% of score variance is recalibratable
 * bias) OR the engine's current diagnostics cannot separate calibration from discrimination.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./conditional-calibration-diag";

describe("conditional calibration diagnostics (arXiv:2108.03210v3)", () => {
  const pairs: { p: number; y: 0 | 1 }[] = [
    { p: 0.9, y: 1 }, { p: 0.8, y: 1 }, { p: 0.7, y: 0 }, { p: 0.6, y: 1 },
    { p: 0.4, y: 0 }, { p: 0.3, y: 0 }, { p: 0.2, y: 1 }, { p: 0.1, y: 0 },
  ];
  it("PAV monotone", () => {
    expect(mod.pavIsotonic([0.5, 0.3, 0.8, 0.6])).toEqual([0.4, 0.4, 0.7, 0.7]);
    expect(mod.pavIsotonic([])).toBeNull();
  });
  it("CORP curve monotone in calP", () => {
    const c = mod.corpCurve(pairs)!;
    for (let i = 1; i < c.length; i++) expect(c[i]!.calP).toBeGreaterThanOrEqual(c[i - 1]!.calP - 1e-9);
    expect(mod.corpCurve([])).toBeNull();
  });
  it("miscalibration area of perfect forecaster ~ 0", () => {
    const perfect: { p: number; y: 0 | 1 }[] = [
      { p: 1, y: 1 }, { p: 1, y: 1 }, { p: 0, y: 0 }, { p: 0, y: 0 },
    ];
    expect(mod.miscalibrationArea(perfect)!).toBeLessThan(1e-9);
    expect(mod.miscalibrationArea(pairs)!).toBeGreaterThanOrEqual(0);
  });
  it("R2 score", () => {
    expect(mod.r2Score([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 10);
    expect(mod.r2Score([1, 1, 1], [1, 1, 1])).toBeNull();
    expect(mod.r2Score([1], [1])).toBeNull();
  });
  it("discrimination component non-negative", () => {
    expect(mod.discriminationComponent(pairs)!).toBeGreaterThanOrEqual(0);
  });
});

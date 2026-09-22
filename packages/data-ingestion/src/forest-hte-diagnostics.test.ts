/**
 * Tests for ./forest-hte-diagnostics (arXiv:2206.10323v2, lane=causal_injury).
 *
 * ACCEPTANCE GATE: ADOPT the mob(W-hat) implementation iff the semi-synthetic short-rest test shows MSE(tau-hat) <=
 * 1.2x the causal-forest MSE (parity) and >=2x improvement over uncentered mob; otherwise REJECT
 * the custom implementation and use off-the-shelf grf causal forests. The ingredient ranking
 * (treatment-centering mandatory, outcome-centering optional) is adopted as recipe immediately.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./forest-hte-diagnostics";

describe("forest HTE diagnostics (arXiv:2206.10323v2)", () => {
  const units = [
    { tauHat: 0.5, y: 1, w: 1, e: 0.5 },
    { tauHat: 0.3, y: 0, w: 0, e: 0.5 },
    { tauHat: -0.1, y: 0, w: 1, e: 0.5 },
    { tauHat: 0.2, y: 1, w: 0, e: 0.5 },
  ];
  it("calibration slope", () => {
    const c = mod.hteCalibrationSlope(units)!;
    expect(Number.isFinite(c.slope)).toBe(true);
    expect(mod.hteCalibrationSlope([])).toBeNull();
    expect(mod.hteCalibrationSlope([{ tauHat: 1, y: 1, w: 2, e: 0.5 }])).toBeNull();
  });
  it("RATE curve prioritizes", () => {
    const r = mod.rateCurve(units, [0.5, 1])!;
    expect(r[0]!.gain).toBeGreaterThanOrEqual(r[1]!.gain);
    expect(mod.rateCurve([], [0.5])).toBeNull();
  });
  it("honesty correlation", () => {
    expect(mod.honestyCorrelation([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 10);
    expect(mod.honestyCorrelation([1, 1, 1], [1, 2, 3])).toBeNull();
    expect(mod.honestyCorrelation([1], [1])).toBeNull();
  });
});

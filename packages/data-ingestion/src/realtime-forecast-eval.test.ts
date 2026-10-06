/**
 * Tests for ./realtime-forecast-eval (arXiv:2010.00781v1, lane=calibration).
 *
 * ACCEPTANCE GATE: Adopt as GSE's standard in-play evaluation if: on 2024-2025 pooled games the pipeline runs end-
 * to-end and the functional test has demonstrated power -- i.e., it significantly separates GSE
 * live from the coin-flip/HomeWP baselines (p<0.01). Reject if the surfaces/CIs are uninformative
 * on NFL data (persistent degeneracy or Wilson intervals too wide to ever exclude the reference
 * plane).
 */

import { describe, expect, it } from "vitest";
import * as mod from "./realtime-forecast-eval";

describe("realtime forecast eval (arXiv:2010.00781v1)", () => {
  const pairs = [
    { p: 0.9, y: 1 }, { p: 0.8, y: 1 }, { p: 0.7, y: 0 }, { p: 0.6, y: 1 },
    { p: 0.4, y: 0 }, { p: 0.3, y: 0 }, { p: 0.2, y: 1 }, { p: 0.1, y: 0 },
  ];
  it("murphy decomposition reconciles", () => {
    const m = mod.murphyDecomposition(pairs, 4)!;
    expect(m.brier).toBeCloseTo(mod.brier(pairs)!, 2);
    expect(m.unc).toBeGreaterThan(0);
    expect(m.rel).toBeGreaterThanOrEqual(0);
    expect(m.res).toBeGreaterThanOrEqual(0);
  });
  it("perfect forecaster: zero brier", () => {
    expect(mod.brier([{ p: 1, y: 1 }, { p: 0, y: 0 }])).toBeCloseTo(0, 10);
  });
  it("reliability curve monotone-ish", () => {
    const c = mod.reliabilityCurve(pairs, 2);
    expect(c).toHaveLength(2);
    expect(c[0]!.n + c[1]!.n).toBe(pairs.length);
  });
  it("skill score", () => {
    expect(mod.brierSkillScore(0.2, 0.25)).toBeCloseTo(0.2, 10);
    expect(mod.brierSkillScore(0.2, 0)).toBeNull();
  });
  it("null on empty / malformed", () => {
    expect(mod.brier([])).toBeNull();
    expect(mod.murphyDecomposition([])).toBeNull();
    expect(mod.brier([{ p: 2, y: 1 }])).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import {
  ANCHOR_WINDOWS,
  ENABLED,
  anchorDisplacementState,
  computeAnchors,
  fixedPersistenceForecast,
  persistenceForecast,
  residualArchiveLookup,
} from "@/lib/calibration/2609-05561-rollcast-anchors";

describe("Rollcast anchors", () => {
  it("is disabled by default; windows 6/10/16", () => {
    expect(ENABLED).toBe(false);
    expect(ANCHOR_WINDOWS).toEqual([6, 10, 16]);
  });

  it("computeAnchors captures level and trend", () => {
    const series = [10, 11, 12, 13, 14, 15, 16, 17];
    const a = computeAnchors(series, 6);
    expect(a.mean).toBeCloseTo(14.5, 10);
    expect(a.median).toBeCloseTo(14.5, 10);
    expect(a.min).toBe(12);
    expect(a.max).toBe(17);
    expect(a.regressionEndpoint).toBeCloseTo(17, 6); // perfect trend -> endpoint = last
  });

  it("anchorDisplacementState has 15 standardized components", () => {
    const series = Array.from({ length: 20 }, (_, i) => 100 + i);
    const state = anchorDisplacementState(series, 10);
    expect(state.length).toBe(15);
    expect(state.every(Number.isFinite)).toBe(true);
    // trending up: current above all anchors -> positive displacements
    expect(state[0]).toBeGreaterThan(0);
  });

  it("residual archive returns the k nearest residuals", () => {
    const archive = [
      { state: [0, 0], residual: 1 },
      { state: [10, 10], residual: 99 },
      { state: [0.1, 0.1], residual: 2 },
    ];
    const res = residualArchiveLookup(archive, [0, 0], 2);
    expect(res).toEqual([1, 2]);
  });

  it("persistence rule reacts to regime shocks faster than fixed persistence", () => {
    // Anchor says 100, latest observation jumps to 130 (post-injury regime).
    const adaptive = persistenceForecast(100, 130, 3.5);
    const fixed = fixedPersistenceForecast(100, 130);
    // Adaptive drops persistence to 0.2 -> closer to the new observation.
    expect(Math.abs(adaptive - 130)).toBeLessThan(Math.abs(fixed - 130));
    // No shock -> identical to fixed.
    expect(persistenceForecast(100, 130, 0.5)).toBeCloseTo(fixed, 10);
  });
});

/**
 * Tests for ./2303-16741v1-experimental (arXiv:2303.16741v1, lane=experimental).
 *
 * ACCEPTANCE GATE: Adopt as GSE's prop-graph lane if GATv2-TCN beats the TCN-only baseline by >=5% MAE reduction on
 * 2024 WR receiving yards AND CORR improves by >=0.03 absolute on the test window, with no MAPE
 * deterioration >10%; reject the graph component if it fails to beat TCN; reject the whole approach if
 * it fails to beat GSE's existing per-player features.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./2303-16741v1-experimental";

describe("experimentation stats (arXiv:2303.16741v1)", () => {
  it("computes Welch's t", () => {
    expect(mod.welchT([1, 2, 3], [1, 2, 3])).toBeCloseTo(0, 10);
    const t = mod.welchT([10, 11, 12], [1, 2, 3])!;
    expect(t).toBeGreaterThan(5);
    expect(mod.welchT([1], [2])).toBeNull();
    expect(mod.welchT([1, 1], [1, 1])).toBeNull();
  });

  it("checks sample ratio mismatch", () => {
    expect(mod.sampleRatioMismatch([50, 50], [50, 50])).toBeCloseTo(0, 10);
    expect(mod.sampleRatioMismatch([60, 40], [50, 50])).toBeCloseTo(4, 10);
    expect(mod.sampleRatioMismatch([50], [50, 50])).toBeNull();
    expect(mod.sampleRatioMismatch([50, 50], [50, 0])).toBeNull();
  });

  it("estimates minimum detectable effect", () => {
    // 2.8 * sqrt(2 * 0.25 / 10000) ~= 0.0198
    expect(mod.minDetectableEffect(0.5, 10000)).toBeCloseTo(0.0198, 4);
    const small = mod.minDetectableEffect(0.5, 100)!;
    const large = mod.minDetectableEffect(0.5, 10000)!;
    expect(small).toBeGreaterThan(large);
    expect(mod.minDetectableEffect(0, 100)).toBeNull();
  });
});

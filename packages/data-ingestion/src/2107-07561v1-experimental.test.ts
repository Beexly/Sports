/**
 * Tests for ./2107-07561v1-experimental (arXiv:2107.07561v1, lane=experimental).
 *
 * ACCEPTANCE GATE: ADOPT the adapted estimator if, on the 2024 holdout window, MultCOMP beats independent Poisson by >=
 * 0.01 nats/observation in mean joint log-likelihood AND the derived P(home out-gains away)
 * calibration slope in decile bins is within [0.9, 1.1].
 */
import { describe, expect, it } from "vitest";
import * as mod from "./2107-07561v1-experimental";

describe("experimentation stats (arXiv:2107.07561v1)", () => {
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

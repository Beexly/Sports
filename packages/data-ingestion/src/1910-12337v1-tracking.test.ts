/**
 * Tests for ./1910-12337v1-tracking (arXiv:1910.12337v1, lane=tracking).
 *
 * ACCEPTANCE GATE: Adopt if on the 2023 weeks-13-18 holdout the LightGBM catch model beats the paper's BART benchmarks
 * (log-loss <= 0.289 AND misclassification <= 0.113) with a time-ordered split -- the stricter
 * protocol means matching the paper's random-split numbers is a genuine improvement -- AND the EHCP
 * sanity check passes (>=70% of interceptions show a higher-EHCP alternative receiver).
 */
import { describe, expect, it } from "vitest";
import * as mod from "./1910-12337v1-tracking";

describe("tracking kinematics (arXiv:1910.12337v1)", () => {
  it("measures Euclidean distance in yards", () => {
    expect(mod.distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5, 10);
    expect(mod.distance({ x: 1, y: 1 }, { x: 1, y: 1 })).toBeCloseTo(0, 10);
    expect(mod.distance({ x: NaN, y: 0 }, { x: 0, y: 0 })).toBeNull();
  });

  it("derives speeds from frames", () => {
    const frames = [
      { x: 0, y: 0 },
      { x: 3, y: 4 },
      { x: 6, y: 8 },
    ];
    expect(mod.speedsFromFrames(frames, 1)).toEqual([5, 5]);
    expect(mod.speedsFromFrames(frames, 0.5)).toEqual([10, 10]);
    expect(mod.speedsFromFrames(frames, 0)).toBeNull();
    expect(mod.speedsFromFrames([{ x: 0, y: 0 }], 1)).toBeNull();
  });

  it("derives accelerations from speeds", () => {
    expect(mod.accelerationsFromSpeeds([5, 5], 1)).toEqual([0]);
    expect(mod.accelerationsFromSpeeds([0, 10], 2)).toEqual([5]);
    expect(mod.accelerationsFromSpeeds([5], 1)).toBeNull();
  });

  it("computes catch-point separation", () => {
    expect(
      mod.separationAtCatch({ x: 0, y: 0 }, [
        { x: 3, y: 4 },
        { x: 10, y: 0 },
      ]),
    ).toBeCloseTo(5, 10);
    expect(mod.separationAtCatch({ x: 0, y: 0 }, [])).toBeNull();
  });
});

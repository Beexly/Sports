/**
 * Tests for ./1810-08032v1-tracking (arXiv:1810.08032v1, lane=tracking).
 *
 * ACCEPTANCE GATE: Adopt MPPV as a GSE player-valuation metric if on the 2023-2024 rolling holdout it beats both the
 * Madden-only and the zero-prior ridge baselines on drive-EPA MSE in both seasons (the paper's result
 * replicated, not a one-season fluke) AND the learned position-group alpha's are positive and stable
 * (prior genuinely informative, not washed out). Reject if MPPV fails to beat zero-prior ridge (the
 * prior adds nothing once on-field data accumulates) or if alpha ~ 0 (Madden ratings carry no signal
 * for drive EPA).
 */
import { describe, expect, it } from "vitest";
import * as mod from "./1810-08032v1-tracking";

describe("tracking kinematics (arXiv:1810.08032v1)", () => {
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

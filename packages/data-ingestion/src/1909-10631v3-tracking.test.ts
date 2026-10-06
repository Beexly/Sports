/**
 * Tests for ./1909-10631v3-tracking (arXiv:1909.10631v3, lane=tracking).
 *
 * ACCEPTANCE GATE: Adopt the precise-distance correction into GSE's 4th-down content and models if the reproducible
 * test shows attenuation of >=25% (integer vs. precise) on 2023-2024 data; reject (<10% on modern
 * data) as era-specific. The NGS data-handling reference is adopted unconditionally.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./1909-10631v3-tracking";

describe("tracking kinematics (arXiv:1909.10631v3)", () => {
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

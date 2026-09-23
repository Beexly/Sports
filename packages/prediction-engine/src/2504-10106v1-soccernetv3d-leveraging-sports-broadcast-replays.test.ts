/**
 * Vitest suite for arXiv:2504.10106v1 (SoccerNet-v3D: Leveraging Sports Broadcast Replays for 3D Scene Understanding).
 * Gate: Ledger states no numeric gate; the transferable asset is the annotation-mining recipe (calibration gates, triangulation, box optimizer), and the football-shape caveat is an adaptation task: the sphere prior (Eq. 7) must be re-derived for a prolate-spheroid football with unknown orientation.
 */
import { describe, it, expect } from "vitest";
import { pixelRay, calibrationGate, rayMidpoint, project, triangulateFiltered, optimizeBallSize, PinholeCam } from "./2504-10106v1-soccernetv3d-leveraging-sports-broadcast-replays";

describe("2504-10106v1 3D ball ground-truth mining", () => {
  const camA: PinholeCam = { cx: -5, cy: 0, cz: 0, fx: 1000, fy: 1000, px: 320, py: 240 };
  const camB: PinholeCam = { cx: 5, cy: 0, cz: 0, fx: 1000, fy: 1000, px: 320, py: 240 };
  it("calibration gate passes clean calibrations", () => {
    expect(calibrationGate([0.4, 0.6, 0.5], 1.0)).toBe(true);
    expect(calibrationGate([2.0, 0.5], 1.0)).toBe(false);
    expect(() => calibrationGate([], 1)).toThrow();
  });
  it("triangulation recovers a known 3D point", () => {
    const truth: [number, number, number] = [0, 2, 20];
    const pxA = project(camA, truth);
    const pxB = project(camB, truth);
    const est = triangulateFiltered([camA, camB], [pxA, pxB], 2);
    expect(Math.hypot(est[0] - truth[0], est[1] - truth[1], est[2] - truth[2])).toBeLessThan(0.5);
    expect(() => triangulateFiltered([camA], [pxA], 2)).toThrow();
  });
  it("box optimizer recovers size from widths", () => {
    // size 0.28m at depth 20m, focal 1000px -> width 14px
    expect(optimizeBallSize([14, 14], [20, 20], 1000)).toBeCloseTo(0.28, 6);
    expect(() => optimizeBallSize([14], [20, 21], 1000)).toThrow();
  });
});

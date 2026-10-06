/**
 * Tests for ./2608-15688v1-tracklet-association (arXiv:2608.15688v1, lane=tracking).
 *
 * ACCEPTANCE GATE: ADOPT for the content/analytics pipeline if McByte++ reduces ID switches vs ByteTrack by >=40% at >=8 FPS on the 50-play set; REJECT if IDF1 is within 5 points of ByteTrack (no meaningful long-term gain) or FPS < 5 on available hardware.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2608-15688v1-tracklet-association";

describe("2608-15688v1 Training-Free Long-Term Multi-Object Tracking for Sports", () => {
  it("cosine distance: identical=0, orthogonal=1, invalid=null", () => {
    expect(mod.cosineDistance([1, 0], [1, 0])).toBeCloseTo(0, 10);
    expect(mod.cosineDistance([1, 0], [0, 1])).toBeCloseTo(1, 10);
    expect(mod.cosineDistance([1, 2], [1])).toBeNull();
    expect(mod.cosineDistance([0, 0], [1, 1])).toBeNull();
  });
  it("field-coordinate gate respects max distance", () => {
    expect(mod.fieldCoordinateGate({ x: 0, y: 0 }, { x: 3, y: 4 }, 5)).toBe(true);
    expect(mod.fieldCoordinateGate({ x: 0, y: 0 }, { x: 3, y: 4 }, 4.9)).toBe(false);
    expect(mod.fieldCoordinateGate({ x: 0, y: 0 }, { x: 3, y: 4 }, -1)).toBeNull();
  });
  it("jersey-number score flips on digit disagreement", () => {
    expect(mod.jerseyNumberMatchScore(0.9, true)).toBeCloseTo(0.9, 10);
    expect(mod.jerseyNumberMatchScore(0.9, false)).toBeCloseTo(0.1, 10);
    expect(mod.jerseyNumberMatchScore(1.5, true)).toBeNull();
  });
  it("greedy assignment picks the minimum-cost pairing", () => {
    const a = mod.greedyBipartiteAssignment([[1, 5], [4, 2]]);
    expect(a).not.toBeNull();
    expect(a!.map((x) => x.col)).toEqual([0, 1]);
    expect(a!.reduce((s, x) => s + x.cost, 0)).toBe(3);
    expect(mod.greedyBipartiteAssignment([[1, 2], [3]])).toBeNull();
  });
  it("gap interpolation hits the midpoint", () => {
    const p = mod.interpolateTrackletGap({ x: 0, y: 0, t: 0 }, { x: 10, y: 20, t: 10 }, 5);
    expect(p).not.toBeNull();
    expect(p!.x).toBeCloseTo(5, 10);
    expect(p!.y).toBeCloseTo(10, 10);
    expect(mod.interpolateTrackletGap({ x: 0, y: 0, t: 0 }, { x: 10, y: 20, t: 10 }, 11)).toBeNull();
  });
});

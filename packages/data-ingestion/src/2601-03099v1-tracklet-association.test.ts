/**
 * Tests for ./2601-03099v1-tracklet-association (arXiv:2601.03099v1, lane=tracking).
 *
 * ACCEPTANCE GATE: Adopt if TASC's median placebo RMSE beats classical synthetic control by >=10% relative AND beats the flat-carry baseline by >=15% in at least 4 of 6 seasons, with the stability signature in the d-sweep.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2601-03099v1-tracklet-association";

describe("2601-03099v1 Time-Aware Synthetic Control", () => {
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

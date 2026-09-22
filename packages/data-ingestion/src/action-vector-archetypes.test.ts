/**
 * Tests for ./action-vector-archetypes (arXiv:1603.05583v1, lane=tracking).
 *
 * ACCEPTANCE GATE: ADOPT the archetype pipeline as a GSE feature source IF half-to-half profile stability reaches
 * ARI >= 0.5 AND adding archetype-cluster indicators to a target-share regression lifts out-of-
 * sample R^2 by >= 0.02 on the 2024 season.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./action-vector-archetypes";

describe("action-vector archetypes (arXiv:1603.05583v1)", () => {
  it("encodes action vectors numerically", () => {
    const v = { startZone: 25, endZone: 40, secondsBetween: 6, possession: 1 as const, playType: "pass" };
    const n = mod.actionVectorToNumbers(v);
    expect(n).toHaveLength(9);
    expect(n[0]).toBeCloseTo(0.25, 10);
    expect(n[4]).toBe(1);
  });
  it("k-means separates two blobs", () => {
    const pts = [
      [0, 0], [0.1, 0], [0, 0.1],
      [10, 10], [10.1, 10], [10, 10.1],
    ];
    const a = mod.lloydKMeans(pts, 2, 25, 7);
    expect(new Set(a).size).toBe(2);
    expect(a[0]).toBe(a[1]);
    expect(a[3]).toBe(a[4]);
    expect(a[0]).not.toBe(a[3]);
  });
  it("k-means degenerate -> []", () => {
    expect(mod.lloydKMeans([], 3)).toEqual([]);
    expect(mod.lloydKMeans([[1]], 5)).toEqual([]);
  });
  it("cluster histogram normalizes", () => {
    expect(mod.clusterHistogram([0, 0, 1, 2], 3)).toEqual([0.5, 0.25, 0.25]);
    expect(mod.clusterHistogram([], 3)).toBeNull();
    expect(mod.clusterHistogram([0, 5], 3)).toBeNull();
  });
  it("profile similarity", () => {
    expect(mod.profileSimilarity([0.5, 0.5], [0.5, 0.5])).toBeCloseTo(1, 10);
    expect(mod.profileSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 10);
  });
  it("isActionVector rejects malformed", () => {
    expect(mod.isActionVector({ startZone: 1, endZone: 2, secondsBetween: -1, possession: 1, playType: "pass" })).toBe(false);
    expect(mod.isActionVector(null)).toBe(false);
  });
});

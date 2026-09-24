// Tests for 2601.22570v1 memory abstention (additive; not wired into any publish path).
import { describe, it, expect } from "vitest";
import {
  embeddingDistance,
  nearestNeighbors,
  correctedConfidence,
  downStakeFactor,
  aurc,
  memoryGatePasses,
} from "./2601-22570v1-memory-abstention.js";

describe("embeddingDistance", () => {
  it("is squared Euclidean distance", () => {
    expect(embeddingDistance([0, 0], [3, 4])).toBe(25);
  });
});

describe("nearestNeighbors", () => {
  it("returns the k closest memory states", () => {
    const mem = [
      [0, 0],
      [10, 0],
      [1, 0],
    ];
    expect(nearestNeighbors([0, 0], mem, 2)).toEqual([0, 2]);
  });
});

describe("correctedConfidence", () => {
  it("blends base confidence with neighbor accuracy", () => {
    expect(correctedConfidence(0.8, [1, 1, 0, 0], 0.5)).toBeCloseTo(0.65, 12);
    expect(correctedConfidence(0.8, [], 0.5)).toBe(0.8);
  });
});

describe("downStakeFactor", () => {
  it("skips below threshold and scales above", () => {
    expect(downStakeFactor(0.4, 0.5)).toBe(0);
    expect(downStakeFactor(0.75, 0.5)).toBeCloseTo(0.5, 12);
    expect(downStakeFactor(1, 0.5)).toBe(1);
  });
});

describe("aurc", () => {
  it("is lower for better risk ordering", () => {
    // Perfect ordering: confident picks are correct.
    const good = aurc([0.9, 0.8, 0.3, 0.2], [1, 1, 0, 0]);
    // Bad ordering: confident picks are wrong.
    const bad = aurc([0.9, 0.8, 0.3, 0.2], [0, 0, 1, 1]);
    expect(good).toBeLessThan(bad);
    expect(good).toBeGreaterThanOrEqual(0);
  });
});

describe("memoryGatePasses", () => {
  it("requires higher ROI and >=10% AURC reduction", () => {
    const ok = memoryGatePasses(0.06, 0.04, 0.18, 0.2);
    expect(ok.aurcReduction).toBeCloseTo(0.1, 8);
    expect(ok.passes).toBe(true);
    expect(memoryGatePasses(0.03, 0.04, 0.18, 0.2).passes).toBe(false);
    expect(memoryGatePasses(0.06, 0.04, 0.19, 0.2).passes).toBe(false);
  });
});

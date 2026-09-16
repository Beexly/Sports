import { describe, expect, it } from "vitest";
import {
  EDGE_TIE_EPSILON,
  advisoryFlags,
  computeEdge,
  rankByEdge,
} from "./edge-rank";

describe("computeEdge", () => {
  it("returns model − market", () => {
    expect(computeEdge(0.58, 0.52)).toBeCloseTo(0.06);
  });
  it("null when either side missing", () => {
    expect(computeEdge(null, 0.5)).toBeNull();
    expect(computeEdge(0.5, null)).toBeNull();
  });
  it("null for non-finite", () => {
    expect(computeEdge(Number.NaN, 0.5)).toBeNull();
  });
});

describe("advisoryFlags", () => {
  it("flags CI crossing 0.5", () => {
    expect(advisoryFlags(0.52, 0.48, 0.05).crossesHalf).toBe(true);
  });
  it("flags CI crossing market", () => {
    expect(advisoryFlags(0.6, 0.55, 0.1).crossesMarket).toBe(true);
  });
  it("no flag without half-width", () => {
    expect(advisoryFlags(0.52, 0.48, null)).toEqual({
      crossesHalf: false,
      crossesMarket: false,
    });
  });
  it("no flag for zero/negative half-width", () => {
    expect(advisoryFlags(0.52, 0.48, 0).crossesHalf).toBe(false);
  });
});

describe("rankByEdge", () => {
  it("sorts by edge not confidence", () => {
    const ranked = rankByEdge([
      { id: "high-conf-low-edge", modelProb: 0.55, marketImplied: 0.54, confidenceScore: 90 },
      { id: "low-conf-high-edge", modelProb: 0.6, marketImplied: 0.5, confidenceScore: 55 },
    ]);
    expect(ranked[0]!.id).toBe("low-conf-high-edge");
    expect(ranked[0]!.edge).toBeCloseTo(0.1);
  });

  it("clusters inseparable edges", () => {
    const ranked = rankByEdge(
      [
        { id: "a", modelProb: 0.56, marketImplied: 0.5, confidenceScore: 70 },
        { id: "b", modelProb: 0.565, marketImplied: 0.5, confidenceScore: 71 },
        { id: "c", modelProb: 0.7, marketImplied: 0.5, confidenceScore: 60 },
      ],
      EDGE_TIE_EPSILON,
    );
    expect(ranked[0]!.id).toBe("c");
    expect(ranked[0]!.tieLabel).toBeNull();
    expect(ranked[1]!.rankCluster).toBe(ranked[2]!.rankCluster);
    expect(ranked[1]!.tieLabel).toBe("too close to call / tied cluster");
    expect(ranked[2]!.tieLabel).toBe("too close to call / tied cluster");
  });

  it("puts edgeless rows after edged rows", () => {
    const ranked = rankByEdge([
      { id: "no-edge", modelProb: null, marketImplied: null, confidenceScore: 99 },
      { id: "has-edge", modelProb: 0.55, marketImplied: 0.5, confidenceScore: 40 },
    ]);
    expect(ranked[0]!.id).toBe("has-edge");
    expect(ranked[1]!.id).toBe("no-edge");
  });

  it("does not label edgeless confidence peers as tied clusters", () => {
    const ranked = rankByEdge([
      { id: "x", modelProb: null, marketImplied: null, confidenceScore: 80 },
      { id: "y", modelProb: null, marketImplied: null, confidenceScore: 80 },
    ]);
    expect(ranked.every((r) => r.tieLabel === null)).toBe(true);
    expect(ranked[0]!.rankCluster).not.toBe(ranked[1]!.rankCluster);
  });

  it("does not mutate input", () => {
    const input = [{ id: "a", modelProb: 0.6, marketImplied: 0.5, confidenceScore: 50 }];
    const copy = structuredClone(input);
    rankByEdge(input);
    expect(input).toEqual(copy);
  });
});

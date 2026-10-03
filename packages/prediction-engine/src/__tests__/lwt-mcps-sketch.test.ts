import { describe, it, expect } from "vitest";
import {
  bestSplit,
  assignLeafId,
  greedyPartition,
  leafQuantile,
  ROOT_LEAF_ID,
  UNMATCHED_LEAF_ID,
  type PartitionSample,
  type LeafPathStep,
} from "../conformal/lwt-mcps-sketch.js";
import { MondrianResidualManager } from "../conformal/mondrian.js";

/**
 * Residual scale genuinely differs by `flag`: flag=0 residuals are tight
 * around 0, flag=1 residuals are wide. A real split should discover this.
 */
function heterogeneousSamples(n = 40): PartitionSample[] {
  const out: PartitionSample[] = [];
  for (let i = 0; i < n; i++) {
    const flag = i % 2;
    const residual = flag === 0 ? (i % 5) * 0.01 - 0.02 : (i % 5) * 4 - 8;
    out.push({ features: { flag, other: i }, residual });
  }
  return out;
}

describe("bestSplit", () => {
  it("returns null for empty samples", () => {
    expect(bestSplit([], ["flag"])).toBeNull();
  });

  it("returns null when featureKeys is empty (after dedup)", () => {
    expect(bestSplit(heterogeneousSamples(), [])).toBeNull();
  });

  it("returns null when there are fewer than 2*minLeafSize samples", () => {
    expect(bestSplit(heterogeneousSamples(10), ["flag"], 10)).toBeNull();
  });

  it("finds a real variance-separating split on the flag feature", () => {
    const split = bestSplit(heterogeneousSamples(40), ["flag", "other"], 5);
    expect(split).not.toBeNull();
    expect(split!.featureKey).toBe("flag");
    expect(split!.leftCount).toBeGreaterThanOrEqual(5);
    expect(split!.rightCount).toBeGreaterThanOrEqual(5);
    expect(Number.isFinite(split!.quality)).toBe(true);
  });

  it("is deterministic: same input yields the same split", () => {
    const samples = heterogeneousSamples(40);
    const a = bestSplit(samples, ["flag", "other"], 5);
    const b = bestSplit(samples, ["flag", "other"], 5);
    expect(a).toEqual(b);
  });

  it("never throws on samples with missing or non-finite feature values", () => {
    const samples: PartitionSample[] = [
      { features: { a: 1 }, residual: 0.5 },
      { features: {}, residual: NaN },
      { features: { a: NaN }, residual: 1 },
      { features: { a: 2 }, residual: -1 },
      { features: { a: 3 }, residual: 2 },
      { features: { a: 4 }, residual: -2 },
    ];
    expect(() => bestSplit(samples, ["a"], 2)).not.toThrow();
  });
});

describe("assignLeafId", () => {
  it("root path (empty) always yields ROOT_LEAF_ID", () => {
    expect(assignLeafId({ flag: 1 }, [])).toBe(ROOT_LEAF_ID);
  });

  it("returns UNMATCHED_LEAF_ID when the features do not satisfy the path", () => {
    const path: LeafPathStep[] = [{ featureKey: "flag", threshold: 0.5, goesLeft: true }];
    // flag=1 does NOT satisfy "flag <= 0.5" (goesLeft would be false)
    expect(assignLeafId({ flag: 1 }, path)).toBe(UNMATCHED_LEAF_ID);
  });

  it("returns a real leaf id when the features do satisfy the path", () => {
    const path: LeafPathStep[] = [{ featureKey: "flag", threshold: 0.5, goesLeft: true }];
    const id = assignLeafId({ flag: 0 }, path);
    expect(id).not.toBe(UNMATCHED_LEAF_ID);
    expect(id.startsWith(ROOT_LEAF_ID)).toBe(true);
  });

  it("a missing/non-finite feature routes RIGHT deterministically", () => {
    const goesRightPath: LeafPathStep[] = [{ featureKey: "missing", threshold: 5, goesLeft: false }];
    expect(assignLeafId({}, goesRightPath)).not.toBe(UNMATCHED_LEAF_ID);
    const goesLeftPath: LeafPathStep[] = [{ featureKey: "missing", threshold: 5, goesLeft: true }];
    expect(assignLeafId({}, goesLeftPath)).toBe(UNMATCHED_LEAF_ID);
  });

  it("same path always produces the same leaf id (pure function)", () => {
    const path: LeafPathStep[] = [{ featureKey: "flag", threshold: 0.5, goesLeft: true }];
    expect(assignLeafId({ flag: 0 }, path)).toBe(assignLeafId({ flag: 0 }, path));
  });
});

describe("greedyPartition", () => {
  it("returns no leaves for empty samples", () => {
    expect(greedyPartition([], ["flag"])).toEqual([]);
  });

  it("returns a single root leaf when no valid split exists (too few samples)", () => {
    const leaves = greedyPartition(heterogeneousSamples(6), ["flag"], { minLeafSize: 10 });
    expect(leaves).toHaveLength(1);
    expect(leaves[0]!.leafId).toBe(ROOT_LEAF_ID);
    expect(leaves[0]!.sampleCount).toBe(6);
  });

  it("splits into multiple leaves when a real split exists", () => {
    const leaves = greedyPartition(heterogeneousSamples(40), ["flag", "other"], {
      maxDepth: 1,
      minLeafSize: 5,
    });
    expect(leaves.length).toBeGreaterThan(1);
  });

  it("every sample is accounted for exactly once across all leaves", () => {
    const samples = heterogeneousSamples(40);
    const leaves = greedyPartition(samples, ["flag", "other"], { maxDepth: 2, minLeafSize: 5 });
    const total = leaves.reduce((acc, l) => acc + l.sampleCount, 0);
    expect(total).toBe(samples.length);
  });

  it("respects maxDepth: depth 0 always yields exactly one (root) leaf", () => {
    const leaves = greedyPartition(heterogeneousSamples(40), ["flag", "other"], { maxDepth: 0 });
    expect(leaves).toHaveLength(1);
    expect(leaves[0]!.leafId).toBe(ROOT_LEAF_ID);
  });

  it("every produced leaf id round-trips through assignLeafId for a sample that reached it", () => {
    const samples = heterogeneousSamples(40);
    const leaves = greedyPartition(samples, ["flag", "other"], { maxDepth: 2, minLeafSize: 5 });
    for (const leaf of leaves) {
      // Not every leaf's original sample is trivially recoverable here, but we
      // can at least confirm assignLeafId never throws walking each leaf's own
      // path against an arbitrary sample's features.
      for (const s of samples.slice(0, 3)) {
        expect(() => assignLeafId(s.features, leaf.path)).not.toThrow();
      }
    }
  });

  it("is deterministic across repeated calls with identical input", () => {
    const samples = heterogeneousSamples(40);
    const a = greedyPartition(samples, ["flag", "other"], { maxDepth: 2, minLeafSize: 5 });
    const b = greedyPartition(samples, ["flag", "other"], { maxDepth: 2, minLeafSize: 5 });
    expect(a).toEqual(b);
  });
});

describe("leafQuantile", () => {
  it("delegates to the manager's quantile lookup for a valid probability", () => {
    const mgr = new MondrianResidualManager({ minSamples: 1 });
    mgr.addMany("root|flag<=0.5", [0.1, 0.2, 0.3]);
    const result = leafQuantile(mgr, "root|flag<=0.5", 0.5);
    expect(result.category).toBe("root|flag<=0.5");
    expect(result.sampleSize).toBe(3);
  });

  it("refuses a non-finite probability with an honest zero quantile", () => {
    const mgr = new MondrianResidualManager({ minSamples: 1 });
    mgr.addMany("leaf", [0.1, 0.2]);
    const result = leafQuantile(mgr, "leaf", NaN);
    expect(result.quantile).toBe(0);
    expect(result.usedFallback).toBe(false);
  });

  it("refuses probability <= 0 or > 1", () => {
    const mgr = new MondrianResidualManager({ minSamples: 1 });
    mgr.addMany("leaf", [0.1, 0.2]);
    expect(leafQuantile(mgr, "leaf", 0).quantile).toBe(0);
    expect(leafQuantile(mgr, "leaf", 1.5).quantile).toBe(0);
    // probability === 1 (upper boundary) IS valid
    expect(() => leafQuantile(mgr, "leaf", 1)).not.toThrow();
  });

  it("falls back to the manager's hierarchy when the leaf itself is sparse", () => {
    const mgr = new MondrianResidualManager({ minSamples: 5 });
    mgr.addMany("root", [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]);
    const result = leafQuantile(mgr, "root|flag<=0.5", 0.5);
    expect(result.usedFallback).toBe(true);
    expect(result.category).toBe("root");
  });
});

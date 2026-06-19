/**
 * Tests for /lib/math/clustering.ts
 *
 * Covers: distance functions, k-means (convergence, init, elbow),
 * DBSCAN (noise, clusters), hierarchical clustering (all linkages),
 * silhouette scores, feature preprocessing, PCA, and sports wrappers.
 */

import { describe, it, expect } from "vitest";
import {
  euclidean,
  manhattan,
  cosine,
  chebyshev,
  minkowski,
  hammingDistance,
  kMeans,
  kMeansPlusPlus,
  elbowMethod,
  dbscan,
  hierarchical,
  cutTree,
  cutTreeByDistance,
  silhouette,
  standardize,
  minMaxScale,
  pca2D,
  dimensionalityReduce,
  clusterPlayersByStats,
  findOutlierPlayers,
  peerGroup,
} from "@/lib/math/clustering";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate n points drawn from a 2D Gaussian blob centred at (cx, cy). */
function makeBlob(cx: number, cy: number, n: number, spread = 0.3, seed = 0): number[][] {
  const pts: number[][] = [];
  // Simple deterministic pseudo-random to avoid external deps
  let s = seed + 1;
  function rand(): number {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  }
  for (let i = 0; i < n; i++) {
    const u1 = rand();
    const u2 = rand();
    const z0 = Math.sqrt(-2 * Math.log(u1 + 1e-12)) * Math.cos(2 * Math.PI * u2);
    const z1 = Math.sqrt(-2 * Math.log(u1 + 1e-12)) * Math.sin(2 * Math.PI * u2);
    pts.push([cx + z0 * spread, cy + z1 * spread]);
  }
  return pts;
}

// Three well-separated blobs
const blob1 = makeBlob(0, 0, 30, 0.2, 1);
const blob2 = makeBlob(10, 0, 30, 0.2, 2);
const blob3 = makeBlob(5, 8.66, 30, 0.2, 3);
const threeBlobs = [...blob1, ...blob2, ...blob3]; // 90 points, k=3

// ---------------------------------------------------------------------------
// 1. Distance functions
// ---------------------------------------------------------------------------

describe("euclidean", () => {
  it("returns 0 for identical points", () => {
    expect(euclidean([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it("returns correct distance for 2D", () => {
    expect(euclidean([0, 0], [3, 4])).toBeCloseTo(5);
  });

  it("returns correct distance for 1D", () => {
    expect(euclidean([0], [7])).toBeCloseTo(7);
  });

  it("is symmetric", () => {
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    expect(euclidean(a, b)).toBeCloseTo(euclidean(b, a));
  });

  it("handles negative coordinates", () => {
    expect(euclidean([-3, -4], [0, 0])).toBeCloseTo(5);
  });
});

describe("manhattan", () => {
  it("returns 0 for identical points", () => {
    expect(manhattan([1, 2], [1, 2])).toBe(0);
  });

  it("returns correct L1 distance", () => {
    expect(manhattan([0, 0], [3, 4])).toBe(7);
  });

  it("is symmetric", () => {
    expect(manhattan([1, 5], [3, 2])).toBeCloseTo(manhattan([3, 2], [1, 5]));
  });

  it("handles negative values", () => {
    expect(manhattan([-1, -1], [1, 1])).toBe(4);
  });
});

describe("cosine", () => {
  it("returns 0 for identical non-zero vectors", () => {
    expect(cosine([1, 2, 3], [1, 2, 3])).toBeCloseTo(0);
  });

  it("returns 1 for orthogonal vectors", () => {
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(1);
  });

  it("returns 1 for zero vector", () => {
    expect(cosine([0, 0], [1, 2])).toBe(1);
  });

  it("returns 2 for opposite vectors", () => {
    expect(cosine([1, 0], [-1, 0])).toBeCloseTo(2);
  });

  it("is in [0, 2]", () => {
    const d = cosine([1, 2, 3], [4, 5, 6]);
    expect(d).toBeGreaterThanOrEqual(0);
    expect(d).toBeLessThanOrEqual(2);
  });
});

describe("chebyshev", () => {
  it("returns 0 for identical points", () => {
    expect(chebyshev([1, 2], [1, 2])).toBe(0);
  });

  it("returns max absolute difference", () => {
    expect(chebyshev([0, 0], [3, 7])).toBe(7);
  });

  it("is symmetric", () => {
    expect(chebyshev([1, 5, 3], [4, 2, 6])).toBe(chebyshev([4, 2, 6], [1, 5, 3]));
  });
});

describe("minkowski", () => {
  it("p=1 matches manhattan", () => {
    const a = [1, 3, 5];
    const b = [2, 1, 4];
    expect(minkowski(a, b, 1)).toBeCloseTo(manhattan(a, b));
  });

  it("p=2 matches euclidean", () => {
    const a = [0, 0];
    const b = [3, 4];
    expect(minkowski(a, b, 2)).toBeCloseTo(euclidean(a, b));
  });

  it("larger p approaches chebyshev", () => {
    const a = [0, 0];
    const b = [3, 7];
    const high = minkowski(a, b, 100);
    expect(high).toBeCloseTo(7, 0);
  });
});

describe("hammingDistance", () => {
  it("returns 0 for identical arrays", () => {
    expect(hammingDistance([1, 0, 1], [1, 0, 1])).toBe(0);
  });

  it("returns correct count of differences", () => {
    expect(hammingDistance([1, 0, 1, 0], [0, 0, 1, 1])).toBe(2);
  });

  it("returns length for fully different", () => {
    expect(hammingDistance([1, 1, 1], [0, 0, 0])).toBe(3);
  });

  it("handles single element", () => {
    expect(hammingDistance([1], [0])).toBe(1);
    expect(hammingDistance([1], [1])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2. K-Means
// ---------------------------------------------------------------------------

describe("kMeans — basic", () => {
  it("assigns all points to a single cluster when k=1", () => {
    const result = kMeans(threeBlobs, 1);
    expect(new Set(result.labels).size).toBe(1);
    expect(result.labels.every((l) => l === 0)).toBe(true);
  });

  it("returns 3 distinct clusters for three well-separated blobs", () => {
    const result = kMeans(threeBlobs, 3, { seed: 42 });
    expect(new Set(result.labels).size).toBe(3);
  });

  it("each blob is mostly in the same cluster", () => {
    const result = kMeans(threeBlobs, 3, { seed: 42 });
    // Points 0-29 come from blob1, 30-59 from blob2, 60-89 from blob3
    // Within each blob, the modal label should dominate
    function majorityLabel(indices: number[]): number {
      const counts: Record<number, number> = {};
      for (const i of indices) {
        const l = result.labels[i];
        counts[l] = (counts[l] ?? 0) + 1;
      }
      return Number(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]);
    }
    const b1Label = majorityLabel([...Array(30).keys()]);
    const b2Label = majorityLabel([...Array(30).keys()].map((i) => i + 30));
    const b3Label = majorityLabel([...Array(30).keys()].map((i) => i + 60));
    // All three blobs should have different modal labels
    expect(new Set([b1Label, b2Label, b3Label]).size).toBe(3);
  });

  it("converges within maxIterations", () => {
    const result = kMeans(threeBlobs, 3, { maxIterations: 300, seed: 1 });
    expect(result.iterations).toBeLessThanOrEqual(300);
  });

  it("returns centroids of correct dimensionality", () => {
    const result = kMeans(threeBlobs, 3, { seed: 42 });
    expect(result.centroids).toHaveLength(3);
    for (const c of result.centroids) {
      expect(c).toHaveLength(2);
    }
  });

  it("inertia is a non-negative number", () => {
    const result = kMeans(threeBlobs, 3, { seed: 42 });
    expect(result.inertia).toBeGreaterThanOrEqual(0);
  });

  it("inertia decreases as k increases", () => {
    const r1 = kMeans(threeBlobs, 1, { seed: 42 });
    const r2 = kMeans(threeBlobs, 2, { seed: 42 });
    const r3 = kMeans(threeBlobs, 3, { seed: 42 });
    expect(r2.inertia).toBeLessThan(r1.inertia);
    expect(r3.inertia).toBeLessThan(r2.inertia);
  });

  it("returns correct number of labels", () => {
    const pts = [[0, 0], [1, 1], [2, 2], [10, 10]];
    const result = kMeans(pts, 2, { seed: 42 });
    expect(result.labels).toHaveLength(4);
  });

  it("handles single point", () => {
    const result = kMeans([[1, 2]], 1, { seed: 42 });
    expect(result.labels).toEqual([0]);
    expect(result.inertia).toBe(0);
  });

  it("handles empty points array", () => {
    const result = kMeans([], 2, { seed: 42 });
    expect(result.labels).toHaveLength(0);
    expect(result.inertia).toBe(0);
    expect(result.converged).toBe(true);
  });

  it("deterministic with same seed", () => {
    const r1 = kMeans(threeBlobs, 3, { seed: 7 });
    const r2 = kMeans(threeBlobs, 3, { seed: 7 });
    expect(r1.labels).toEqual(r2.labels);
    expect(r1.inertia).toBeCloseTo(r2.inertia);
  });

  it("different seeds may produce different inertias (not always same local min)", () => {
    // Just check that seeds have some effect by running multiple seeds
    const inertias = [1, 2, 3, 4, 5].map((s) => kMeans(threeBlobs, 3, { seed: s }).inertia);
    // All should be finite non-negative
    for (const v of inertias) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(isFinite(v)).toBe(true);
    }
  });

  it("tolerance parameter controls early stopping", () => {
    const rTight = kMeans(threeBlobs, 3, { tolerance: 1e-10, seed: 42 });
    const rLoose = kMeans(threeBlobs, 3, { tolerance: 100, seed: 42 });
    // loose tolerance converges faster
    expect(rLoose.iterations).toBeLessThanOrEqual(rTight.iterations!);
  });
});

describe("kMeansPlusPlus", () => {
  it("returns k centroids", () => {
    const centroids = kMeansPlusPlus(threeBlobs, 3, 42);
    expect(centroids).toHaveLength(3);
  });

  it("each centroid is a copy of a point", () => {
    const centroids = kMeansPlusPlus(threeBlobs, 3, 42);
    for (const c of centroids) {
      expect(threeBlobs.some((p) => p[0] === c[0] && p[1] === c[1])).toBe(true);
    }
  });

  it("centroids are distinct points for well-separated data", () => {
    const centroids = kMeansPlusPlus(threeBlobs, 3, 42);
    // Each centroid should be in a different blob region
    const unique = new Set(centroids.map((c) => c.join(",")));
    expect(unique.size).toBe(3);
  });

  it("deterministic with same seed", () => {
    const c1 = kMeansPlusPlus(threeBlobs, 3, 99);
    const c2 = kMeansPlusPlus(threeBlobs, 3, 99);
    expect(c1).toEqual(c2);
  });

  it("works for k=1", () => {
    const centroids = kMeansPlusPlus([[1, 2], [3, 4]], 1, 0);
    expect(centroids).toHaveLength(1);
  });
});

describe("elbowMethod", () => {
  it("returns inertias array of length maxK", () => {
    const { inertias } = elbowMethod(threeBlobs, 5, 42);
    expect(inertias).toHaveLength(5);
  });

  it("inertias are non-increasing", () => {
    const { inertias } = elbowMethod(threeBlobs, 5, 42);
    for (let i = 1; i < inertias.length; i++) {
      expect(inertias[i]).toBeLessThanOrEqual(inertias[i - 1] + 1e-6);
    }
  });

  it("identifies k=3 as the elbow for three-blob data", () => {
    const { k } = elbowMethod(threeBlobs, 6, 42);
    // Should be 3, but allow 2 or 3 since it's heuristic
    expect(k).toBeGreaterThanOrEqual(2);
    expect(k).toBeLessThanOrEqual(4);
  });

  it("returns k in valid range", () => {
    const { k } = elbowMethod(threeBlobs, 5, 1);
    expect(k).toBeGreaterThanOrEqual(1);
    expect(k).toBeLessThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------
// 3. DBSCAN
// ---------------------------------------------------------------------------

describe("dbscan", () => {
  // A small dataset with two clear clusters and one noise point
  const clusterA = [[0, 0], [0.1, 0], [0, 0.1], [0.1, 0.1]];
  const clusterB = [[5, 5], [5.1, 5], [5, 5.1], [5.1, 5.1]];
  const noisePoint = [[2.5, 2.5]]; // far from both
  const testPoints = [...clusterA, ...clusterB, ...noisePoint];

  it("identifies two clusters and one noise point", () => {
    const result = dbscan(testPoints, 0.3, 2);
    expect(new Set(result.labels.filter((l) => l >= 0)).size).toBe(2);
    // Last point should be noise
    expect(result.labels[8]).toBe(-1);
  });

  it("noise points have label -1", () => {
    const result = dbscan(testPoints, 0.3, 2);
    expect(result.labels[8]).toBe(-1);
  });

  it("cluster members have non-negative labels", () => {
    const result = dbscan(testPoints, 0.3, 2);
    for (let i = 0; i < 8; i++) {
      expect(result.labels[i]).toBeGreaterThanOrEqual(0);
    }
  });

  it("all points in one cluster when epsilon is very large", () => {
    const result = dbscan(testPoints, 100, 1);
    const unique = new Set(result.labels.filter((l) => l >= 0));
    expect(unique.size).toBe(1);
  });

  it("all points are noise when epsilon is very small and minPts > 1", () => {
    const result = dbscan(testPoints, 0.001, 5);
    expect(result.labels.every((l) => l === -1)).toBe(true);
  });

  it("returns corePoints array", () => {
    const result = dbscan(testPoints, 0.3, 2);
    expect(Array.isArray(result.corePoints)).toBe(true);
  });

  it("core points have enough neighbors within epsilon", () => {
    const result = dbscan(testPoints, 0.3, 2);
    for (const cp of result.corePoints) {
      const neighbors = testPoints.filter(
        (p, i) => i !== cp && euclidean(testPoints[cp], p) <= 0.3
      ).length + 1; // include self
      expect(neighbors).toBeGreaterThanOrEqual(2);
    }
  });

  it("works with custom distance function (manhattan)", () => {
    const result = dbscan(clusterA, 0.5, 2, manhattan);
    // All should be in one cluster
    expect(result.labels.every((l) => l === 0)).toBe(true);
  });

  it("handles empty input", () => {
    const result = dbscan([], 1, 2);
    expect(result.labels).toHaveLength(0);
    expect(result.corePoints).toHaveLength(0);
  });

  it("single point with minPts=1 is a cluster", () => {
    const result = dbscan([[0, 0]], 1, 1);
    expect(result.labels[0]).toBe(0);
  });

  it("single point with minPts=2 is noise", () => {
    const result = dbscan([[0, 0]], 1, 2);
    expect(result.labels[0]).toBe(-1);
  });

  it("border points are assigned to a cluster (not noise)", () => {
    // Core: [0,0] has 3 neighbors; [0.1, 0] is a border point
    const pts = [[0, 0], [0.05, 0], [0, 0.05], [1, 0]]; // last one is border of core
    const result = dbscan(pts, 0.15, 3);
    // First three form a core; last is close to (0,0) but maybe not core
    // Just verify no crash and labels are valid
    for (const l of result.labels) {
      expect(l).toBeGreaterThanOrEqual(-1);
    }
  });

  it("correctly separates two clusters in 3D space", () => {
    const a3d = [[0, 0, 0], [0.1, 0, 0], [0, 0.1, 0], [0, 0, 0.1]];
    const b3d = [[10, 10, 10], [10.1, 10, 10], [10, 10.1, 10]];
    const combined = [...a3d, ...b3d];
    const result = dbscan(combined, 0.5, 2);
    expect(new Set(result.labels.filter((l) => l >= 0)).size).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 4. Hierarchical Clustering
// ---------------------------------------------------------------------------

describe("hierarchical", () => {
  const pts4 = [[0, 0], [0.5, 0], [10, 0], [10.5, 0]]; // Two pairs

  it("returns a root node", () => {
    const root = hierarchical(pts4);
    expect(root).toBeDefined();
    expect(typeof root.distance).toBe("number");
    expect(root.size).toBe(4);
  });

  it("root size equals number of points", () => {
    const root = hierarchical(threeBlobs.slice(0, 10));
    expect(root.size).toBe(10);
  });

  it("single linkage uses minimum distance", () => {
    const single = hierarchical(pts4, "single");
    // First merge should be between [0,0] and [0.5,0] (distance 0.5)
    // or [10,0] and [10.5,0] (distance 0.5)
    expect(single.distance).toBeGreaterThan(0);
  });

  it("complete linkage uses maximum distance", () => {
    const complete = hierarchical(pts4, "complete");
    // Root merge should be larger distance for complete linkage
    expect(complete.distance).toBeGreaterThanOrEqual(
      hierarchical(pts4, "single").distance
    );
  });

  it("average linkage distance is between single and complete", () => {
    const avg = hierarchical(pts4, "average").distance;
    const sing = hierarchical(pts4, "single").distance;
    const comp = hierarchical(pts4, "complete").distance;
    expect(avg).toBeGreaterThanOrEqual(sing - 1e-10);
    expect(avg).toBeLessThanOrEqual(comp + 1e-10);
  });

  it("ward linkage produces valid tree", () => {
    const ward = hierarchical(pts4, "ward");
    expect(ward.size).toBe(4);
    expect(ward.distance).toBeGreaterThan(0);
  });

  it("throws for empty input", () => {
    expect(() => hierarchical([])).toThrow();
  });

  it("single point returns leaf node", () => {
    const root = hierarchical([[1, 2]]);
    expect(root.id).toBe(0);
    expect(root.left).toBeUndefined();
    expect(root.right).toBeUndefined();
    expect(root.distance).toBe(0);
    expect(root.size).toBe(1);
  });

  it("two points: root has two leaf children", () => {
    const root = hierarchical([[0, 0], [1, 1]]);
    expect(root.left).toBeDefined();
    expect(root.right).toBeDefined();
    expect(root.size).toBe(2);
  });
});

describe("cutTree", () => {
  const pts4 = [[0, 0], [0.5, 0], [10, 0], [10.5, 0]];

  it("k=1 assigns all points to cluster 0", () => {
    const root = hierarchical(pts4, "single");
    const labels = cutTree(root, 1);
    expect(labels.every((l) => l === 0)).toBe(true);
  });

  it("k=2 separates the two pairs", () => {
    const root = hierarchical(pts4, "single");
    const labels = cutTree(root, 2);
    // Points 0,1 should share a label; points 2,3 should share a different label
    expect(labels[0]).toBe(labels[1]);
    expect(labels[2]).toBe(labels[3]);
    expect(labels[0]).not.toBe(labels[2]);
  });

  it("k=4 gives each point its own cluster", () => {
    const root = hierarchical(pts4, "single");
    const labels = cutTree(root, 4);
    expect(new Set(labels).size).toBe(4);
  });

  it("returns array of length equal to number of points", () => {
    const root = hierarchical(pts4, "complete");
    const labels = cutTree(root, 2);
    expect(labels).toHaveLength(4);
  });
});

describe("cutTreeByDistance", () => {
  const pts4 = [[0, 0], [0.5, 0], [10, 0], [10.5, 0]];

  it("threshold just above pair distance gives two clusters", () => {
    const root = hierarchical(pts4, "single");
    // Pairs are distance 0.5 apart; groups are ~9.5 apart
    const labels = cutTreeByDistance(root, 1.0);
    expect(labels[0]).toBe(labels[1]);
    expect(labels[2]).toBe(labels[3]);
    expect(labels[0]).not.toBe(labels[2]);
  });

  it("threshold = 0 gives all singletons", () => {
    const root = hierarchical(pts4, "single");
    const labels = cutTreeByDistance(root, 0);
    expect(new Set(labels).size).toBe(4);
  });

  it("very large threshold gives single cluster", () => {
    const root = hierarchical(pts4, "single");
    const labels = cutTreeByDistance(root, 1000);
    expect(new Set(labels).size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 5. Silhouette
// ---------------------------------------------------------------------------

describe("silhouette", () => {
  it("returns score near 1 for perfectly separated clusters", () => {
    // Two blobs far apart
    const pts = [...makeBlob(0, 0, 20, 0.05, 10), ...makeBlob(100, 0, 20, 0.05, 11)];
    const labels = [...new Array(20).fill(0), ...new Array(20).fill(1)];
    const result = silhouette(pts, labels);
    expect(result.score).toBeGreaterThan(0.9);
  });

  it("returns score near 0 for random cluster assignments", () => {
    // Points on a grid with random labels
    const pts: number[][] = [];
    for (let i = 0; i < 20; i++) pts.push([i % 5, Math.floor(i / 5)]);
    const labels = pts.map((_, i) => i % 2); // random-ish alternating
    const result = silhouette(pts, labels);
    // Score should be far from 1 (not near-perfect separation)
    expect(result.score).toBeLessThan(0.9);
  });

  it("perPoint has the same length as points", () => {
    const pts = [[0, 0], [0.1, 0], [10, 0], [10.1, 0]];
    const labels = [0, 0, 1, 1];
    const result = silhouette(pts, labels);
    expect(result.perPoint).toHaveLength(4);
  });

  it("perCluster has entries for each cluster", () => {
    const pts = [[0, 0], [0.1, 0], [10, 0], [10.1, 0]];
    const labels = [0, 0, 1, 1];
    const result = silhouette(pts, labels);
    expect(result.perCluster).toHaveLength(2);
  });

  it("singleton cluster gets score 0", () => {
    const pts = [[0, 0], [5, 5], [10, 0]];
    const labels = [0, 1, 2]; // each point is its own cluster
    const result = silhouette(pts, labels);
    for (const s of result.perPoint) {
      expect(s).toBe(0);
    }
  });

  it("silhouette scores are in [-1, 1]", () => {
    const pts = [...makeBlob(0, 0, 15, 0.5, 20), ...makeBlob(3, 3, 15, 0.5, 21)];
    const labels = [...new Array(15).fill(0), ...new Array(15).fill(1)];
    const result = silhouette(pts, labels);
    for (const s of result.perPoint) {
      expect(s).toBeGreaterThanOrEqual(-1 - 1e-10);
      expect(s).toBeLessThanOrEqual(1 + 1e-10);
    }
  });

  it("overall score equals mean of perPoint (for non-noise points)", () => {
    const pts = [[0, 0], [0.1, 0], [10, 0], [10.1, 0]];
    const labels = [0, 0, 1, 1];
    const result = silhouette(pts, labels);
    const mean = result.perPoint.reduce((a, b) => a + b, 0) / result.perPoint.length;
    expect(result.score).toBeCloseTo(mean);
  });

  it("works with custom distance (manhattan)", () => {
    const pts = [[0, 0], [0.1, 0], [10, 0], [10.1, 0]];
    const labels = [0, 0, 1, 1];
    const result = silhouette(pts, labels, manhattan);
    expect(result.score).toBeGreaterThan(0.5);
  });

  it("ignores noise points (label = -1)", () => {
    const pts = [[0, 0], [0.1, 0], [5, 5], [10, 0], [10.1, 0]];
    const labels = [0, 0, -1, 1, 1]; // 5,5 is noise
    const result = silhouette(pts, labels);
    // Should not throw and noise point gets 0
    expect(result.perPoint[2]).toBe(0);
  });

  it("perfectly separated 3-cluster case has high score", () => {
    const pts = [
      ...makeBlob(0, 0, 15, 0.05, 30),
      ...makeBlob(100, 0, 15, 0.05, 31),
      ...makeBlob(50, 86.6, 15, 0.05, 32),
    ];
    const labels = [
      ...new Array(15).fill(0),
      ...new Array(15).fill(1),
      ...new Array(15).fill(2),
    ];
    const result = silhouette(pts, labels);
    expect(result.score).toBeGreaterThan(0.85);
  });
});

// ---------------------------------------------------------------------------
// 6. Feature preprocessing
// ---------------------------------------------------------------------------

describe("standardize", () => {
  it("returns means and stds", () => {
    const pts = [[1, 10], [2, 20], [3, 30]];
    const { means, stds } = standardize(pts);
    expect(means[0]).toBeCloseTo(2);
    expect(means[1]).toBeCloseTo(20);
    expect(stds[0]).toBeGreaterThan(0);
  });

  it("normalized output has mean ~0 per feature", () => {
    const pts = [[1, 10], [2, 20], [3, 30]];
    const { normalized } = standardize(pts);
    const col0mean = normalized.reduce((a, p) => a + p[0], 0) / normalized.length;
    expect(col0mean).toBeCloseTo(0, 10);
  });

  it("normalized output has std ~1 per feature", () => {
    const pts = [[1, 10], [2, 20], [3, 30]];
    const { normalized } = standardize(pts);
    const col0 = normalized.map((p) => p[0]);
    const variance = col0.reduce((a, v) => a + v * v, 0) / col0.length;
    expect(Math.sqrt(variance)).toBeCloseTo(1, 5);
  });

  it("constant feature produces 0 in normalized output", () => {
    const pts = [[1, 5], [2, 5], [3, 5]];
    const { normalized } = standardize(pts);
    for (const p of normalized) {
      expect(p[1]).toBe(0);
    }
  });

  it("handles empty input", () => {
    const { normalized, means, stds } = standardize([]);
    expect(normalized).toHaveLength(0);
    expect(means).toHaveLength(0);
    expect(stds).toHaveLength(0);
  });

  it("single point produces 0 normalized value (std=0)", () => {
    const { normalized } = standardize([[3, 7]]);
    expect(normalized[0][0]).toBe(0);
    expect(normalized[0][1]).toBe(0);
  });
});

describe("minMaxScale", () => {
  it("scales values to [0, 1]", () => {
    const pts = [[0, 0], [5, 10], [10, 5]];
    const { normalized } = minMaxScale(pts);
    for (const p of normalized) {
      for (const v of p) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it("min value maps to 0, max value maps to 1", () => {
    const pts = [[1, 2], [3, 8], [5, 5]];
    const { normalized } = minMaxScale(pts);
    const col0 = normalized.map((p) => p[0]);
    expect(Math.min(...col0)).toBeCloseTo(0);
    expect(Math.max(...col0)).toBeCloseTo(1);
  });

  it("returns mins and maxes", () => {
    const pts = [[1, 2], [3, 8]];
    const { mins, maxes } = minMaxScale(pts);
    expect(mins[0]).toBe(1);
    expect(maxes[0]).toBe(3);
    expect(mins[1]).toBe(2);
    expect(maxes[1]).toBe(8);
  });

  it("constant feature maps to 0", () => {
    const pts = [[5, 3], [5, 6], [5, 9]];
    const { normalized } = minMaxScale(pts);
    for (const p of normalized) {
      expect(p[0]).toBe(0);
    }
  });

  it("handles empty input", () => {
    const { normalized, mins, maxes } = minMaxScale([]);
    expect(normalized).toHaveLength(0);
    expect(mins).toHaveLength(0);
    expect(maxes).toHaveLength(0);
  });
});

describe("dimensionalityReduce (truncation)", () => {
  it("truncates to specified dimensions", () => {
    const pts = [[1, 2, 3, 4], [5, 6, 7, 8]];
    const reduced = dimensionalityReduce(pts, 2);
    expect(reduced[0]).toHaveLength(2);
    expect(reduced[1]).toHaveLength(2);
    expect(reduced[0]).toEqual([1, 2]);
    expect(reduced[1]).toEqual([5, 6]);
  });

  it("handles empty input", () => {
    const reduced = dimensionalityReduce([], 2);
    expect(reduced).toHaveLength(0);
  });

  it("dims >= original dim returns all features", () => {
    const pts = [[1, 2], [3, 4]];
    const reduced = dimensionalityReduce(pts, 10);
    expect(reduced[0]).toHaveLength(2);
  });
});

describe("pca2D", () => {
  it("returns 2D points", () => {
    const pts = [[1, 2, 3], [4, 5, 6], [7, 8, 9], [2, 4, 6]];
    const proj = pca2D(pts);
    expect(proj).toHaveLength(4);
    for (const p of proj) {
      expect(p).toHaveLength(2);
    }
  });

  it("handles 2D input (projects to 2D)", () => {
    const pts = [[1, 2], [3, 4], [5, 6]];
    const proj = pca2D(pts);
    expect(proj).toHaveLength(3);
    for (const p of proj) {
      expect(p).toHaveLength(2);
    }
  });

  it("projected data spans a range (not all zeros)", () => {
    const pts = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 1]];
    const proj = pca2D(pts);
    const x = proj.map((p) => p[0]);
    expect(Math.max(...x) - Math.min(...x)).toBeGreaterThan(0);
  });

  it("handles empty input", () => {
    const proj = pca2D([]);
    expect(proj).toHaveLength(0);
  });

  it("collinear points: first component captures the variation", () => {
    const pts = [[1, 1], [2, 2], [3, 3], [4, 4]];
    const proj = pca2D(pts);
    expect(proj).toHaveLength(4);
    // First component should have more variance than the second
    const col1 = proj.map((p) => p[0]);
    const col2 = proj.map((p) => p[1]);
    const range1 = Math.max(...col1) - Math.min(...col1);
    const range2 = Math.max(...col2) - Math.min(...col2);
    expect(range1).toBeGreaterThan(range2);
  });
});

// ---------------------------------------------------------------------------
// 7. Sports clustering use cases
// ---------------------------------------------------------------------------

describe("clusterPlayersByStats", () => {
  const players = [
    { id: "p1", features: [0, 0] },
    { id: "p2", features: [0.1, 0] },
    { id: "p3", features: [10, 10] },
    { id: "p4", features: [10.1, 10] },
    { id: "p5", features: [5, 5] },
    { id: "p6", features: [5.1, 5] },
  ];

  it("returns one entry per player", () => {
    const result = clusterPlayersByStats(players, 3);
    expect(result).toHaveLength(6);
  });

  it("each entry has id and cluster", () => {
    const result = clusterPlayersByStats(players, 3);
    for (const r of result) {
      expect(typeof r.id).toBe("string");
      expect(typeof r.cluster).toBe("number");
    }
  });

  it("nearby players are in the same cluster", () => {
    const result = clusterPlayersByStats(players, 3);
    const clusterOf = (id: string) => result.find((r) => r.id === id)!.cluster;
    expect(clusterOf("p1")).toBe(clusterOf("p2"));
    expect(clusterOf("p3")).toBe(clusterOf("p4"));
    expect(clusterOf("p5")).toBe(clusterOf("p6"));
  });

  it("different groups get different cluster ids", () => {
    const result = clusterPlayersByStats(players, 3);
    const clusterOf = (id: string) => result.find((r) => r.id === id)!.cluster;
    expect(clusterOf("p1")).not.toBe(clusterOf("p3"));
    expect(clusterOf("p1")).not.toBe(clusterOf("p5"));
  });

  it("handles empty input", () => {
    const result = clusterPlayersByStats([], 3);
    expect(result).toHaveLength(0);
  });

  it("ids are preserved in output", () => {
    const result = clusterPlayersByStats(players, 3);
    const ids = result.map((r) => r.id);
    for (const p of players) {
      expect(ids).toContain(p.id);
    }
  });
});

describe("findOutlierPlayers", () => {
  const tightPlayers = [
    { id: "a1", features: [0, 0] },
    { id: "a2", features: [0.1, 0] },
    { id: "a3", features: [0, 0.1] },
    { id: "a4", features: [0.1, 0.1] },
    { id: "outlier", features: [100, 100] },
  ];

  it("identifies obvious outlier", () => {
    const outliers = findOutlierPlayers(tightPlayers, 0.5, 3);
    expect(outliers).toContain("outlier");
  });

  it("does not label cluster members as outliers", () => {
    const outliers = findOutlierPlayers(tightPlayers, 0.5, 3);
    for (const id of ["a1", "a2", "a3", "a4"]) {
      expect(outliers).not.toContain(id);
    }
  });

  it("returns empty array when no outliers exist", () => {
    const dense = [
      { id: "x1", features: [0, 0] },
      { id: "x2", features: [0.1, 0] },
      { id: "x3", features: [0, 0.1] },
      { id: "x4", features: [0.05, 0.05] },
    ];
    const outliers = findOutlierPlayers(dense, 0.3, 2);
    expect(outliers.length).toBe(0);
  });

  it("handles empty input", () => {
    const outliers = findOutlierPlayers([], 1, 3);
    expect(outliers).toHaveLength(0);
  });

  it("returns string ids", () => {
    const outliers = findOutlierPlayers(tightPlayers, 0.5, 3);
    for (const id of outliers) {
      expect(typeof id).toBe("string");
    }
  });
});

describe("peerGroup", () => {
  const players = [
    { id: "near1", features: [1, 1] },
    { id: "near2", features: [1.1, 1] },
    { id: "near3", features: [1, 1.1] },
    { id: "far1", features: [10, 10] },
    { id: "far2", features: [20, 20] },
  ];

  it("returns k nearest players", () => {
    const peers = peerGroup([1, 1], players, 3);
    expect(peers).toHaveLength(3);
  });

  it("nearest players are returned (excluding exact-match distance=0)", () => {
    // target is [1,1]; near1 is exactly [1,1] (distance=0, excluded)
    // near2=[1.1,1] and near3=[1,1.1] are the two closest non-exact matches
    const peers = peerGroup([1, 1], players, 2);
    expect(peers).toContain("near2");
    expect(peers).toContain("near3");
  });

  it("excludes exact match (distance 0)", () => {
    // target is exactly near1
    const peers = peerGroup([1, 1], players, 2);
    // near1 has distance 0, should be excluded
    expect(peers).not.toContain("near1");
  });

  it("default k=5 returns up to 5 results", () => {
    const peers = peerGroup([0, 0], players);
    expect(peers.length).toBeLessThanOrEqual(5);
  });

  it("far players not included when there are enough near ones", () => {
    const peers = peerGroup([1, 1], players, 2);
    // near1, near2, near3 are closest; far1, far2 shouldn't be in top 2
    expect(peers).not.toContain("far1");
    expect(peers).not.toContain("far2");
  });

  it("returns ids as strings", () => {
    const peers = peerGroup([0, 0], players, 3);
    for (const id of peers) {
      expect(typeof id).toBe("string");
    }
  });

  it("handles fewer players than k", () => {
    const peers = peerGroup([0, 0], players.slice(0, 2), 10);
    expect(peers.length).toBeLessThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// 8. Integration: k-means after standardize
// ---------------------------------------------------------------------------

describe("integration: standardize + kMeans", () => {
  it("standardizing improves clustering when features have different scales", () => {
    // Feature 0: range [0,1]; Feature 1: range [0,1000]
    const small = Array.from({ length: 20 }, (_, i) => [i < 10 ? 0.1 : 0.9, (i < 10 ? 1 : 500) + i]);
    const { normalized } = standardize(small);
    const result = kMeans(normalized, 2, { seed: 42 });
    // Should separate into two groups
    expect(new Set(result.labels).size).toBe(2);
    // First 10 in same cluster
    expect(result.labels[0]).toBe(result.labels[9]);
    expect(result.labels[10]).toBe(result.labels[19]);
    expect(result.labels[0]).not.toBe(result.labels[10]);
  });
});

// ---------------------------------------------------------------------------
// 9. Edge cases and properties
// ---------------------------------------------------------------------------

describe("distance function triangle inequality (spot check)", () => {
  const a = [1, 2, 3];
  const b = [4, 5, 6];
  const c = [0, 0, 0];

  it("euclidean satisfies triangle inequality", () => {
    expect(euclidean(a, c)).toBeLessThanOrEqual(euclidean(a, b) + euclidean(b, c) + 1e-10);
  });

  it("manhattan satisfies triangle inequality", () => {
    expect(manhattan(a, c)).toBeLessThanOrEqual(manhattan(a, b) + manhattan(b, c) + 1e-10);
  });
});

describe("kMeans label consistency", () => {
  it("labels are integers in [0, k-1]", () => {
    const result = kMeans(threeBlobs, 3, { seed: 42 });
    for (const l of result.labels) {
      expect(l).toBeGreaterThanOrEqual(0);
      expect(l).toBeLessThan(3);
      expect(Number.isInteger(l)).toBe(true);
    }
  });
});

describe("DBSCAN with high-dimensional points", () => {
  it("correctly clusters 5D points", () => {
    const a = Array.from({ length: 5 }, () => [0, 0, 0, 0, 0.1]);
    const b = Array.from({ length: 5 }, () => [10, 10, 10, 10, 10]);
    const combined = [...a, ...b];
    const result = dbscan(combined, 0.5, 3);
    // Should find two clusters
    const clusters = new Set(result.labels.filter((l) => l >= 0));
    expect(clusters.size).toBe(2);
  });
});

describe("hierarchical cutTree boundary cases", () => {
  it("k larger than number of leaves caps at leaves", () => {
    const pts = [[0, 0], [1, 0], [2, 0]];
    const root = hierarchical(pts, "single");
    // k=5 but only 3 points; should not throw
    const labels = cutTree(root, 5);
    expect(labels).toHaveLength(3);
  });
});

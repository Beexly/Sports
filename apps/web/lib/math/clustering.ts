/**
 * Clustering and unsupervised ML library — pure TypeScript, zero dependencies.
 *
 * Algorithms: K-Means (Lloyd's + k-means++ init), DBSCAN, Agglomerative
 * Hierarchical Clustering, Silhouette scoring, PCA projection, and
 * sports-specific convenience wrappers.
 *
 * All functions are pure (no side effects). No `any` types.
 * No banned phrases: no "guarantee", "lock", "sure thing", "can't miss".
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A point in n-dimensional space. */
export type Point = number[];

/** Result from k-means or similar partitioning algorithms. */
export interface ClusterResult {
  /** Cluster label per point (0-based). -1 = noise (DBSCAN only). */
  labels: number[];
  /** Cluster centroids (one per cluster). */
  centroids?: Point[];
  /** Number of iterations performed. */
  iterations?: number;
}

/** Node in an agglomerative hierarchical dendrogram. */
export interface HierarchicalNode {
  /** Leaf id (index into original points array) or synthetic internal id. */
  id: number;
  left?: HierarchicalNode;
  right?: HierarchicalNode;
  /** Linkage distance at which this merge occurred. */
  distance: number;
  /** Total number of leaf points in this subtree. */
  size: number;
}

/** Silhouette analysis result. */
export interface SilhouetteResult {
  /** Overall mean silhouette coefficient across all points. */
  score: number;
  /** Per-point silhouette coefficient. */
  perPoint: number[];
  /** Per-cluster mean silhouette coefficient (indexed by cluster id). */
  perCluster: number[];
}

/** Result from DBSCAN. */
export interface DBSCANResult {
  /** Cluster label per point. -1 = noise. */
  labels: number[];
  /** Indices of core points. */
  corePoints: number[];
}

// ---------------------------------------------------------------------------
// Distance functions
// ---------------------------------------------------------------------------

/**
 * Euclidean (L2) distance between two points.
 */
export function euclidean(a: Point, b: Point): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/**
 * Manhattan (L1) distance between two points.
 */
export function manhattan(a: Point, b: Point): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.abs(a[i] - b[i]);
  }
  return sum;
}

/**
 * Cosine distance: 1 - cosineSimilarity(a, b).
 * Returns 1 if either vector is zero.
 */
export function cosine(a: Point, b: Point): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 1;
  return 1 - dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Chebyshev (L∞) distance: max |ai - bi|.
 */
export function chebyshev(a: Point, b: Point): number {
  let max = 0;
  for (let i = 0; i < a.length; i++) {
    const d = Math.abs(a[i] - b[i]);
    if (d > max) max = d;
  }
  return max;
}

/**
 * Minkowski distance with parameter p.
 * p=1 → Manhattan, p=2 → Euclidean, p→∞ → Chebyshev.
 */
export function minkowski(a: Point, b: Point, p: number): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(Math.abs(a[i] - b[i]), p);
  }
  return Math.pow(sum, 1 / p);
}

/**
 * Hamming distance: count of positions where values differ.
 */
export function hammingDistance(a: number[], b: number[]): number {
  let count = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) count++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// LCG random number generator (seeded, pure)
// ---------------------------------------------------------------------------

/** State for a linear congruential generator. */
interface LCGState {
  seed: number;
}

/** Create a new LCG state. */
function lcgCreate(seed: number): LCGState {
  return { seed: seed >>> 0 };
}

/** Advance LCG and return next value in [0, 1). */
function lcgNext(state: LCGState): number {
  // Numerical Recipes parameters
  state.seed = (1664525 * state.seed + 1013904223) >>> 0;
  return state.seed / 4294967296;
}

/** Return integer in [0, n). */
function lcgInt(state: LCGState, n: number): number {
  return Math.floor(lcgNext(state) * n);
}

// ---------------------------------------------------------------------------
// K-Means
// ---------------------------------------------------------------------------

/** Compute the centroid of a list of points. */
function computeCentroid(pts: Point[]): Point {
  if (pts.length === 0) return [];
  const dim = pts[0].length;
  const c: number[] = new Array(dim).fill(0);
  for (const p of pts) {
    for (let d = 0; d < dim; d++) c[d] += p[d];
  }
  for (let d = 0; d < dim; d++) c[d] /= pts.length;
  return c;
}

/** Assign each point to the nearest centroid. Returns labels array. */
function assignLabels(points: Point[], centroids: Point[]): number[] {
  return points.map((p) => {
    let best = 0;
    let bestDist = Infinity;
    for (let k = 0; k < centroids.length; k++) {
      const d = euclidean(p, centroids[k]);
      if (d < bestDist) {
        bestDist = d;
        best = k;
      }
    }
    return best;
  });
}

/** Max movement of centroids between iterations. */
function maxCentroidMovement(prev: Point[], next: Point[]): number {
  let max = 0;
  for (let k = 0; k < prev.length; k++) {
    const d = euclidean(prev[k], next[k]);
    if (d > max) max = d;
  }
  return max;
}

/** Compute inertia: sum of squared euclidean distances to assigned centroid. */
function computeInertia(points: Point[], labels: number[], centroids: Point[]): number {
  let inertia = 0;
  for (let i = 0; i < points.length; i++) {
    const d = euclidean(points[i], centroids[labels[i]]);
    inertia += d * d;
  }
  return inertia;
}

/**
 * K-Means++ initialization.
 * First centroid chosen uniformly at random.
 * Subsequent centroids chosen with probability proportional to D² distance
 * from the nearest existing centroid.
 */
export function kMeansPlusPlus(points: Point[], k: number, seed = 42): Point[] {
  const rng = lcgCreate(seed);
  const centroids: Point[] = [];

  // First centroid: random
  centroids.push(points[lcgInt(rng, points.length)].slice());

  for (let c = 1; c < k; c++) {
    // Compute D² distances
    const dSquared = points.map((p) => {
      let minD = Infinity;
      for (const cen of centroids) {
        const d = euclidean(p, cen);
        if (d < minD) minD = d;
      }
      return minD * minD;
    });

    const total = dSquared.reduce((acc, v) => acc + v, 0);
    const threshold = lcgNext(rng) * total;
    let cumSum = 0;
    let chosen = points.length - 1;
    for (let i = 0; i < points.length; i++) {
      cumSum += dSquared[i];
      if (cumSum >= threshold) {
        chosen = i;
        break;
      }
    }
    centroids.push(points[chosen].slice());
  }

  return centroids;
}

interface KMeansResult extends ClusterResult {
  centroids: Point[];
  inertia: number;
  converged: boolean;
}

/**
 * K-Means clustering using Lloyd's algorithm.
 * Uses k-means++ initialization by default.
 */
export function kMeans(
  points: Point[],
  k: number,
  opts?: { maxIterations?: number; seed?: number; tolerance?: number }
): KMeansResult {
  const maxIterations = opts?.maxIterations ?? 300;
  const seed = opts?.seed ?? 42;
  const tolerance = opts?.tolerance ?? 1e-4;

  if (points.length === 0) {
    return { labels: [], centroids: [], inertia: 0, converged: true, iterations: 0 };
  }

  // Initialize centroids via k-means++
  let centroids = kMeansPlusPlus(points, k, seed);

  let labels = assignLabels(points, centroids);
  let converged = false;
  let iter = 0;

  for (iter = 0; iter < maxIterations; iter++) {
    // Update centroids
    const newCentroids: Point[] = centroids.map((c, ki) => {
      const assigned = points.filter((_, i) => labels[i] === ki);
      if (assigned.length === 0) return c.slice(); // keep old centroid if empty
      return computeCentroid(assigned);
    });

    const movement = maxCentroidMovement(centroids, newCentroids);
    centroids = newCentroids;

    // Re-assign
    const newLabels = assignLabels(points, centroids);
    labels = newLabels;

    if (movement < tolerance) {
      converged = true;
      iter++;
      break;
    }
  }

  const inertia = computeInertia(points, labels, centroids);

  return {
    labels,
    centroids,
    iterations: iter,
    inertia,
    converged,
  };
}

/**
 * Elbow method: run k-means for k=1..maxK and return inertias.
 * The "elbow" k is the one with the largest second derivative (curvature).
 */
export function elbowMethod(
  points: Point[],
  maxK: number,
  seed?: number
): { k: number; inertias: number[] } {
  const inertias: number[] = [];
  for (let k = 1; k <= maxK; k++) {
    const result = kMeans(points, k, { seed });
    inertias.push(result.inertia);
  }

  // Second derivative to find elbow
  let elbowK = 1;
  let maxCurvature = -Infinity;
  for (let i = 1; i < inertias.length - 1; i++) {
    const curvature = inertias[i - 1] - 2 * inertias[i] + inertias[i + 1];
    if (curvature > maxCurvature) {
      maxCurvature = curvature;
      elbowK = i + 1; // 1-based k
    }
  }

  return { k: elbowK, inertias };
}

// ---------------------------------------------------------------------------
// DBSCAN
// ---------------------------------------------------------------------------

/**
 * DBSCAN clustering.
 * Labels: 0-based cluster ids, -1 for noise.
 */
export function dbscan(
  points: Point[],
  epsilon: number,
  minPts: number,
  distance: (a: Point, b: Point) => number = euclidean
): DBSCANResult {
  const n = points.length;
  const labels: number[] = new Array(n).fill(-1);
  const visited: boolean[] = new Array(n).fill(false);

  // Find all neighbors within epsilon
  function regionQuery(idx: number): number[] {
    const neighbors: number[] = [];
    for (let i = 0; i < n; i++) {
      if (distance(points[idx], points[i]) <= epsilon) {
        neighbors.push(i);
      }
    }
    return neighbors;
  }

  // Identify core points
  const neighborCache: number[][] = points.map((_, i) => regionQuery(i));
  const isCorePoint: boolean[] = neighborCache.map((nb) => nb.length >= minPts);
  const corePoints: number[] = [];
  for (let i = 0; i < n; i++) {
    if (isCorePoint[i]) corePoints.push(i);
  }

  let clusterId = 0;

  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;
    visited[i] = true;

    if (!isCorePoint[i]) {
      // Noise for now — may be reassigned as border point
      labels[i] = -1;
      continue;
    }

    // Start a new cluster
    labels[i] = clusterId;
    const queue: number[] = [...neighborCache[i]];

    let qi = 0;
    while (qi < queue.length) {
      const q = queue[qi++];
      if (!visited[q]) {
        visited[q] = true;
        if (isCorePoint[q]) {
          // Add its neighbors to the queue
          for (const nb of neighborCache[q]) {
            if (!queue.includes(nb)) queue.push(nb);
          }
        }
      }
      if (labels[q] === -1) {
        labels[q] = clusterId;
      }
    }

    clusterId++;
  }

  return { labels, corePoints };
}

// ---------------------------------------------------------------------------
// Hierarchical Clustering
// ---------------------------------------------------------------------------

/** Collect leaf ids from a subtree. */
function collectLeaves(node: HierarchicalNode): number[] {
  if (!node.left && !node.right) return [node.id];
  const left = node.left ? collectLeaves(node.left) : [];
  const right = node.right ? collectLeaves(node.right) : [];
  return [...left, ...right];
}

/**
 * Agglomerative hierarchical clustering with configurable linkage.
 * Returns the root of the dendrogram.
 */
export function hierarchical(
  points: Point[],
  linkage: "single" | "complete" | "average" | "ward" = "single"
): HierarchicalNode {
  const n = points.length;
  if (n === 0) throw new Error("hierarchical: empty points array");

  // Initialize one node per point (leaves)
  let clusters: HierarchicalNode[] = points.map((_, i) => ({
    id: i,
    distance: 0,
    size: 1,
  }));

  // Map from cluster to its member indices
  let members: number[][] = points.map((_, i) => [i]);

  // Internal node id counter (starts after leaf ids)
  let nextId = n;

  /** Compute centroid for a set of point indices. */
  function centroidOf(indices: number[]): Point {
    return computeCentroid(indices.map((i) => points[i]));
  }

  /** Linkage distance between two clusters. */
  function linkageDist(aIdx: number, bIdx: number): number {
    const aMembers = members[aIdx];
    const bMembers = members[bIdx];

    if (linkage === "single") {
      let min = Infinity;
      for (const ai of aMembers) {
        for (const bi of bMembers) {
          const d = euclidean(points[ai], points[bi]);
          if (d < min) min = d;
        }
      }
      return min;
    }

    if (linkage === "complete") {
      let max = -Infinity;
      for (const ai of aMembers) {
        for (const bi of bMembers) {
          const d = euclidean(points[ai], points[bi]);
          if (d > max) max = d;
        }
      }
      return max;
    }

    if (linkage === "average") {
      let sum = 0;
      let count = 0;
      for (const ai of aMembers) {
        for (const bi of bMembers) {
          sum += euclidean(points[ai], points[bi]);
          count++;
        }
      }
      return count === 0 ? 0 : sum / count;
    }

    // ward: increase in total within-cluster inertia after merge
    const cA = centroidOf(aMembers);
    const cB = centroidOf(bMembers);
    const cM = centroidOf([...aMembers, ...bMembers]);

    let ward = 0;
    for (const ai of aMembers) {
      const d = euclidean(points[ai], cM);
      ward += d * d;
    }
    for (const bi of bMembers) {
      const d = euclidean(points[bi], cM);
      ward += d * d;
    }
    let prevWard = 0;
    for (const ai of aMembers) {
      const d = euclidean(points[ai], cA);
      prevWard += d * d;
    }
    for (const bi of bMembers) {
      const d = euclidean(points[bi], cB);
      prevWard += d * d;
    }
    return ward - prevWard;
  }

  // Merge until one cluster remains
  while (clusters.length > 1) {
    // Find the two closest clusters
    let bestDist = Infinity;
    let bestI = 0;
    let bestJ = 1;

    for (let i = 0; i < clusters.length - 1; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const d = linkageDist(i, j);
        if (d < bestDist) {
          bestDist = d;
          bestI = i;
          bestJ = j;
        }
      }
    }

    // Merge bestI and bestJ
    const mergedMembers = [...members[bestI], ...members[bestJ]];
    const mergedNode: HierarchicalNode = {
      id: nextId++,
      left: clusters[bestI],
      right: clusters[bestJ],
      distance: bestDist,
      size: clusters[bestI].size + clusters[bestJ].size,
    };

    // Remove bestJ first (higher index), then bestI
    const newClusters: HierarchicalNode[] = [];
    const newMembers: number[][] = [];
    for (let i = 0; i < clusters.length; i++) {
      if (i !== bestI && i !== bestJ) {
        newClusters.push(clusters[i]);
        newMembers.push(members[i]);
      }
    }
    newClusters.push(mergedNode);
    newMembers.push(mergedMembers);

    clusters = newClusters;
    members = newMembers;
  }

  return clusters[0];
}

/**
 * Cut the dendrogram to get exactly k clusters.
 * Returns a label array (0-based) indexed by original point index.
 */
export function cutTree(root: HierarchicalNode, k: number): number[] {
  // BFS / DFS: collect the top k subtrees by cutting the k-1 highest merges
  // Strategy: priority queue by distance descending, pop and split until we have k nodes
  let frontier: HierarchicalNode[] = [root];

  while (frontier.length < k) {
    // Find the node with the largest merge distance (it was merged latest)
    let maxDist = -Infinity;
    let maxIdx = 0;
    for (let i = 0; i < frontier.length; i++) {
      if (frontier[i].distance > maxDist && (frontier[i].left || frontier[i].right)) {
        maxDist = frontier[i].distance;
        maxIdx = i;
      }
    }

    const node = frontier[maxIdx];
    if (!node.left && !node.right) break; // leaf, cannot split further

    // Replace node with its children
    const next: HierarchicalNode[] = [];
    for (let i = 0; i < frontier.length; i++) {
      if (i === maxIdx) {
        if (node.left) next.push(node.left);
        if (node.right) next.push(node.right);
      } else {
        next.push(frontier[i]);
      }
    }
    frontier = next;
  }

  // Assign labels
  // Find max leaf id to size the label array
  let maxLeafId = 0;
  for (const node of frontier) {
    const leaves = collectLeaves(node);
    for (const l of leaves) {
      if (l > maxLeafId) maxLeafId = l;
    }
  }

  const labels: number[] = new Array(maxLeafId + 1).fill(0);
  for (let clusterIdx = 0; clusterIdx < frontier.length; clusterIdx++) {
    const leaves = collectLeaves(frontier[clusterIdx]);
    for (const leafId of leaves) {
      labels[leafId] = clusterIdx;
    }
  }

  return labels;
}

/**
 * Cut the dendrogram at a given distance threshold.
 * All merges above threshold are kept; merges at or below are cut.
 * Returns label array indexed by original point index.
 */
export function cutTreeByDistance(root: HierarchicalNode, threshold: number): number[] {
  // Collect subtrees whose merge distance > threshold but whose children's
  // merge distance is <= threshold (or they are leaves)
  const frontier: HierarchicalNode[] = [];

  function traverse(node: HierarchicalNode): void {
    if (node.distance <= threshold || (!node.left && !node.right)) {
      frontier.push(node);
    } else {
      if (node.left) traverse(node.left);
      if (node.right) traverse(node.right);
    }
  }

  traverse(root);

  // Assign labels
  let maxLeafId = 0;
  for (const node of frontier) {
    const leaves = collectLeaves(node);
    for (const l of leaves) {
      if (l > maxLeafId) maxLeafId = l;
    }
  }

  const labels: number[] = new Array(maxLeafId + 1).fill(0);
  for (let clusterIdx = 0; clusterIdx < frontier.length; clusterIdx++) {
    const leaves = collectLeaves(frontier[clusterIdx]);
    for (const leafId of leaves) {
      labels[leafId] = clusterIdx;
    }
  }

  return labels;
}

// ---------------------------------------------------------------------------
// Silhouette
// ---------------------------------------------------------------------------

/**
 * Compute silhouette scores for a clustering.
 * For each point: a = mean intra-cluster distance, b = min mean inter-cluster distance.
 * s = (b - a) / max(a, b).
 * Points in a singleton cluster receive score 0.
 */
export function silhouette(
  points: Point[],
  labels: number[],
  distance: (a: Point, b: Point) => number = euclidean
): SilhouetteResult {
  const n = points.length;
  const clusterIds = [...new Set(labels)].filter((l) => l >= 0).sort((a, b) => a - b);

  // Group indices by cluster
  const clusterMembers: Map<number, number[]> = new Map();
  for (const cid of clusterIds) {
    clusterMembers.set(cid, []);
  }
  for (let i = 0; i < n; i++) {
    if (labels[i] >= 0) {
      clusterMembers.get(labels[i])!.push(i);
    }
  }

  const perPoint: number[] = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    const ci = labels[i];
    if (ci < 0) {
      perPoint[i] = 0;
      continue;
    }

    const sameCluster = clusterMembers.get(ci)!;

    if (sameCluster.length === 1) {
      perPoint[i] = 0;
      continue;
    }

    // a = mean distance to other points in same cluster
    let sumA = 0;
    for (const j of sameCluster) {
      if (j !== i) sumA += distance(points[i], points[j]);
    }
    const a = sumA / (sameCluster.length - 1);

    // b = min mean distance to points in any other cluster
    let minB = Infinity;
    for (const cid of clusterIds) {
      if (cid === ci) continue;
      const otherMembers = clusterMembers.get(cid)!;
      if (otherMembers.length === 0) continue;
      let sumB = 0;
      for (const j of otherMembers) {
        sumB += distance(points[i], points[j]);
      }
      const meanB = sumB / otherMembers.length;
      if (meanB < minB) minB = meanB;
    }

    if (minB === Infinity) {
      perPoint[i] = 0;
    } else {
      const denom = Math.max(a, minB);
      perPoint[i] = denom === 0 ? 0 : (minB - a) / denom;
    }
  }

  // Per-cluster mean
  const perCluster: number[] = [];
  const maxCid = clusterIds.length > 0 ? Math.max(...clusterIds) : -1;
  for (let cid = 0; cid <= maxCid; cid++) {
    const members = clusterMembers.get(cid);
    if (!members || members.length === 0) {
      perCluster.push(0);
    } else {
      const s = members.reduce((acc, i) => acc + perPoint[i], 0) / members.length;
      perCluster.push(s);
    }
  }

  const validPoints = labels.filter((l) => l >= 0).length;
  const score =
    validPoints === 0
      ? 0
      : labels.reduce((acc, l, i) => (l >= 0 ? acc + perPoint[i] : acc), 0) / validPoints;

  return { score, perPoint, perCluster };
}

// ---------------------------------------------------------------------------
// Feature preprocessing
// ---------------------------------------------------------------------------

/**
 * Standardize (z-score normalization) per feature.
 * If std is 0 for a feature, the normalized value is 0.
 */
export function standardize(
  points: Point[]
): { normalized: Point[]; means: number[]; stds: number[] } {
  if (points.length === 0) return { normalized: [], means: [], stds: [] };
  const dim = points[0].length;
  const means: number[] = new Array(dim).fill(0);
  const stds: number[] = new Array(dim).fill(0);

  // Compute means
  for (const p of points) {
    for (let d = 0; d < dim; d++) means[d] += p[d];
  }
  for (let d = 0; d < dim; d++) means[d] /= points.length;

  // Compute stds
  for (const p of points) {
    for (let d = 0; d < dim; d++) {
      stds[d] += (p[d] - means[d]) ** 2;
    }
  }
  for (let d = 0; d < dim; d++) {
    stds[d] = Math.sqrt(stds[d] / points.length);
  }

  const normalized = points.map((p) =>
    p.map((v, d) => (stds[d] === 0 ? 0 : (v - means[d]) / stds[d]))
  );

  return { normalized, means, stds };
}

/**
 * Min-max scaling to [0, 1] per feature.
 * If min === max for a feature, the normalized value is 0.
 */
export function minMaxScale(
  points: Point[]
): { normalized: Point[]; mins: number[]; maxes: number[] } {
  if (points.length === 0) return { normalized: [], mins: [], maxes: [] };
  const dim = points[0].length;
  const mins: number[] = new Array(dim).fill(Infinity);
  const maxes: number[] = new Array(dim).fill(-Infinity);

  for (const p of points) {
    for (let d = 0; d < dim; d++) {
      if (p[d] < mins[d]) mins[d] = p[d];
      if (p[d] > maxes[d]) maxes[d] = p[d];
    }
  }

  const normalized = points.map((p) =>
    p.map((v, d) => {
      const range = maxes[d] - mins[d];
      return range === 0 ? 0 : (v - mins[d]) / range;
    })
  );

  return { normalized, mins, maxes };
}

/**
 * Project points to 2D using the top-2 PCA components.
 * Uses power iteration to find eigenvectors.
 * Returns projected points (n × 2).
 */
export function pca2D(points: Point[]): Point[] {
  return dimensionalityReduce(points, 2, true);
}

/**
 * Simple dimensionality reduction.
 * When usePCA is true (default false), applies PCA; otherwise truncates to first `dims` features.
 */
export function dimensionalityReduce(
  points: Point[],
  dims: number,
  usePCA = false
): Point[] {
  if (points.length === 0) return [];
  if (!usePCA) {
    return points.map((p) => p.slice(0, dims));
  }

  // Center the data
  const { normalized: centered, means } = standardize(points);
  const n = centered.length;
  const d = centered[0].length;
  const actualDims = Math.min(dims, d);

  // Build covariance matrix (d × d)
  const cov: number[][] = Array.from({ length: d }, () => new Array(d).fill(0));
  for (const p of centered) {
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        cov[i][j] += p[i] * p[j];
      }
    }
  }
  for (let i = 0; i < d; i++) {
    for (let j = 0; j < d; j++) {
      cov[i][j] /= n;
    }
  }

  // Power iteration to find top `actualDims` eigenvectors
  const eigenvectors: number[][] = [];

  // Deflated covariance matrix (copy for deflation)
  const deflated: number[][] = cov.map((row) => row.slice());

  for (let comp = 0; comp < actualDims; comp++) {
    // Initialize random vector
    let v: number[] = new Array(d).fill(0).map((_, i) => (i === comp ? 1 : 0.1));

    for (let iter = 0; iter < 100; iter++) {
      // Matrix-vector multiply
      const Av: number[] = new Array(d).fill(0);
      for (let i = 0; i < d; i++) {
        for (let j = 0; j < d; j++) {
          Av[i] += deflated[i][j] * v[j];
        }
      }

      // Normalize
      let norm = 0;
      for (const val of Av) norm += val * val;
      norm = Math.sqrt(norm);
      if (norm < 1e-12) break;
      v = Av.map((val) => val / norm);
    }

    eigenvectors.push(v);

    // Deflate: subtract the outer product (eigenvalue * v * v^T)
    // Compute eigenvalue = v^T * cov * v
    const Av2: number[] = new Array(d).fill(0);
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        Av2[i] += deflated[i][j] * v[j];
      }
    }
    let eigenvalue = 0;
    for (let i = 0; i < d; i++) eigenvalue += v[i] * Av2[i];

    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        deflated[i][j] -= eigenvalue * v[i] * v[j];
      }
    }
  }

  // Project centered data onto eigenvectors
  return centered.map((p) =>
    eigenvectors.map((ev) => ev.reduce((acc, val, i) => acc + val * p[i], 0))
  );
}

// ---------------------------------------------------------------------------
// Sports clustering use cases
// ---------------------------------------------------------------------------

/**
 * Cluster players by their feature vectors using k-means.
 * Returns cluster assignment per player.
 */
export function clusterPlayersByStats(
  stats: { id: string; features: number[] }[],
  k: number
): { id: string; cluster: number }[] {
  if (stats.length === 0) return [];
  const points = stats.map((s) => s.features);
  const result = kMeans(points, k);
  return stats.map((s, i) => ({ id: s.id, cluster: result.labels[i] }));
}

/**
 * Find outlier players using DBSCAN — returns ids of noise points.
 */
export function findOutlierPlayers(
  stats: { id: string; features: number[] }[],
  epsilon = 1.0,
  minPts = 3
): string[] {
  if (stats.length === 0) return [];
  const points = stats.map((s) => s.features);
  const result = dbscan(points, epsilon, minPts);
  return stats.filter((_, i) => result.labels[i] === -1).map((s) => s.id);
}

/**
 * Find the k nearest players to a target by euclidean distance.
 * Returns the ids of the k most similar players (not including the exact match
 * if targetFeatures is one of the allPlayers entries).
 */
export function peerGroup(
  targetFeatures: number[],
  allPlayers: { id: string; features: number[] }[],
  k = 5
): string[] {
  const distances = allPlayers.map((p) => ({
    id: p.id,
    dist: euclidean(targetFeatures, p.features),
  }));
  distances.sort((a, b) => a.dist - b.dist);
  // Exclude exact match (distance === 0)
  const filtered = distances.filter((d) => d.dist > 0);
  return filtered.slice(0, k).map((d) => d.id);
}

/**
 * recommendation-engine.test.ts
 *
 * Comprehensive tests for the recommendation engine library.
 * Run: cd apps/web && npx vitest run __tests__/recommendation-engine.test.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  // Similarity metrics
  cosineSimilarity,
  pearsonCorrelation,
  jaccardSimilarity,
  euclideanDistance,
  manhattanDistance,
  hammingDistance,
  // User-based CF
  userSimilarityMatrix,
  predictUserRating,
  topNRecommendations,
  // Item-based CF
  itemSimilarityMatrix,
  predictItemRating,
  // Content-based
  computeTFIDF,
  contentBasedScore,
  buildUserProfile,
  contentBasedRecommendations,
  // Matrix factorization
  initializeMatrix,
  matrixFactorizationSGD,
  predictMFRating,
  reconstructMatrix,
  // Hybrid
  hybridScore,
  diversityPenalty,
  diversifiedTopN,
  // Sports helpers
  pickAffinityScore,
  sportPreferenceVector,
  bettorProfile,
  similarBettors,
  trendingPicks,
} from "@/lib/analytics/recommendation-engine";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const approx = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) < tol;

/** Safe index — asserts element exists */
function idx<T>(arr: T[], i: number): T {
  const v = arr[i];
  if (v === undefined) throw new Error(`No element at index ${i}`);
  return v;
}

/** Build small ratings map for testing */
function makeRatings(
  data: Record<string, Record<string, number>>
): Map<string, Map<string, number>> {
  const m: Map<string, Map<string, number>> = new Map();
  for (const [user, items] of Object.entries(data)) {
    const inner: Map<string, number> = new Map();
    for (const [item, rating] of Object.entries(items)) {
      inner.set(item, rating);
    }
    m.set(user, inner);
  }
  return m;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Cosine Similarity
// ─────────────────────────────────────────────────────────────────────────────

describe("cosineSimilarity", () => {
  it("identical vectors → 1", () => {
    expect(approx(cosineSimilarity([1, 2, 3], [1, 2, 3]), 1)).toBe(true);
  });

  it("orthogonal vectors → 0", () => {
    expect(approx(cosineSimilarity([1, 0], [0, 1]), 0)).toBe(true);
  });

  it("opposite vectors → -1", () => {
    expect(approx(cosineSimilarity([1, 0], [-1, 0]), -1)).toBe(true);
  });

  it("zero vector a → 0", () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
  });

  it("zero vector b → 0", () => {
    expect(cosineSimilarity([1, 2, 3], [0, 0, 0])).toBe(0);
  });

  it("both zero vectors → 0", () => {
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
  });

  it("known value [3,4] vs [4,3]", () => {
    // dot=24, |a|=5, |b|=5 → 24/25 = 0.96
    expect(approx(cosineSimilarity([3, 4], [4, 3]), 24 / 25)).toBe(true);
  });

  it("single-element vectors", () => {
    expect(approx(cosineSimilarity([5], [10]), 1)).toBe(true);
  });

  it("negative components", () => {
    const sim = cosineSimilarity([-1, -2], [-1, -2]);
    expect(approx(sim, 1)).toBe(true);
  });

  it("mixed positive/negative", () => {
    const sim = cosineSimilarity([1, -1], [-1, 1]);
    expect(approx(sim, -1)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Pearson Correlation
// ─────────────────────────────────────────────────────────────────────────────

describe("pearsonCorrelation", () => {
  it("perfect positive correlation → 1", () => {
    expect(approx(pearsonCorrelation([1, 2, 3, 4], [2, 4, 6, 8]), 1)).toBe(true);
  });

  it("perfect negative correlation → -1", () => {
    expect(approx(pearsonCorrelation([1, 2, 3, 4], [4, 3, 2, 1]), -1)).toBe(true);
  });

  it("zero standard deviation in a → 0", () => {
    expect(pearsonCorrelation([3, 3, 3], [1, 2, 3])).toBe(0);
  });

  it("zero standard deviation in b → 0", () => {
    expect(pearsonCorrelation([1, 2, 3], [5, 5, 5])).toBe(0);
  });

  it("empty arrays → 0", () => {
    expect(pearsonCorrelation([], [])).toBe(0);
  });

  it("known value: [1,2,3] vs [2,2,2] — b is constant → 0", () => {
    expect(pearsonCorrelation([1, 2, 3], [2, 2, 2])).toBe(0);
  });

  it("uncorrelated vectors returns value in [-1, 1]", () => {
    const r = pearsonCorrelation([1, 2, 3, 4], [2, 1, 4, 3]);
    expect(r).toBeGreaterThanOrEqual(-1);
    expect(r).toBeLessThanOrEqual(1);
  });

  it("two-element perfect correlation", () => {
    expect(approx(pearsonCorrelation([1, 2], [3, 4]), 1)).toBe(true);
  });

  it("symmetry: pearson(a,b) == pearson(b,a)", () => {
    const a = [1, 3, 5, 7];
    const b = [2, 4, 3, 8];
    expect(approx(pearsonCorrelation(a, b), pearsonCorrelation(b, a))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Jaccard Similarity
// ─────────────────────────────────────────────────────────────────────────────

describe("jaccardSimilarity", () => {
  it("identical sets → 1", () => {
    const s = new Set(["a", "b", "c"]);
    expect(jaccardSimilarity(s, new Set(["a", "b", "c"]))).toBe(1);
  });

  it("disjoint sets → 0", () => {
    expect(jaccardSimilarity(new Set(["a"]), new Set(["b"]))).toBe(0);
  });

  it("both empty → 0", () => {
    expect(jaccardSimilarity(new Set(), new Set())).toBe(0);
  });

  it("partial overlap: {a,b} vs {b,c} → 1/3", () => {
    expect(
      approx(jaccardSimilarity(new Set(["a", "b"]), new Set(["b", "c"])), 1 / 3)
    ).toBe(true);
  });

  it("subset: {a} in {a,b,c} → 1/3", () => {
    expect(
      approx(jaccardSimilarity(new Set(["a"]), new Set(["a", "b", "c"])), 1 / 3)
    ).toBe(true);
  });

  it("one empty set → 0", () => {
    expect(jaccardSimilarity(new Set(["a", "b"]), new Set())).toBe(0);
  });

  it("{a,b,c} vs {a,b,c,d} → 3/4", () => {
    expect(
      approx(
        jaccardSimilarity(new Set(["a", "b", "c"]), new Set(["a", "b", "c", "d"])),
        3 / 4
      )
    ).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Euclidean Distance
// ─────────────────────────────────────────────────────────────────────────────

describe("euclideanDistance", () => {
  it("same vector → 0", () => {
    expect(euclideanDistance([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it("3-4-5 triangle: [0,0] vs [3,4] → 5", () => {
    expect(approx(euclideanDistance([0, 0], [3, 4]), 5)).toBe(true);
  });

  it("1D distance", () => {
    expect(approx(euclideanDistance([0], [7]), 7)).toBe(true);
  });

  it("negative components", () => {
    expect(approx(euclideanDistance([-1, -1], [1, 1]), Math.sqrt(8))).toBe(true);
  });

  it("symmetry", () => {
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    expect(euclideanDistance(a, b)).toBe(euclideanDistance(b, a));
  });

  it("3D distance: [1,2,3] vs [4,6,3] → 5", () => {
    // sqrt(9 + 16 + 0) = 5
    expect(approx(euclideanDistance([1, 2, 3], [4, 6, 3]), 5)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Manhattan Distance
// ─────────────────────────────────────────────────────────────────────────────

describe("manhattanDistance", () => {
  it("same vector → 0", () => {
    expect(manhattanDistance([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it("[0,0] vs [3,4] → 7", () => {
    expect(manhattanDistance([0, 0], [3, 4])).toBe(7);
  });

  it("1D", () => {
    expect(manhattanDistance([5], [2])).toBe(3);
  });

  it("negative components", () => {
    expect(manhattanDistance([-1, -2], [1, 2])).toBe(6);
  });

  it("symmetry", () => {
    const a = [1, 5, 3];
    const b = [4, 2, 6];
    expect(manhattanDistance(a, b)).toBe(manhattanDistance(b, a));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Hamming Distance
// ─────────────────────────────────────────────────────────────────────────────

describe("hammingDistance", () => {
  it("identical → 0", () => {
    expect(hammingDistance([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it("all different", () => {
    expect(hammingDistance([1, 2, 3], [4, 5, 6])).toBe(3);
  });

  it("one difference", () => {
    expect(hammingDistance([1, 2, 3], [1, 2, 4])).toBe(1);
  });

  it("string arrays", () => {
    expect(hammingDistance(["a", "b", "c"], ["a", "x", "c"])).toBe(1);
  });

  it("throws on length mismatch", () => {
    expect(() => hammingDistance([1, 2], [1, 2, 3])).toThrow();
  });

  it("throws on length mismatch (longer first)", () => {
    expect(() => hammingDistance([1, 2, 3], [1, 2])).toThrow();
  });

  it("mixed types", () => {
    expect(hammingDistance([1, "b", 3], [1, "x", 3])).toBe(1);
  });

  it("empty arrays → 0", () => {
    expect(hammingDistance([], [])).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. User Similarity Matrix
// ─────────────────────────────────────────────────────────────────────────────

describe("userSimilarityMatrix", () => {
  const ratings = makeRatings({
    alice: { i1: 5, i2: 3, i3: 4, i4: 4 },
    bob: { i1: 3, i2: 1, i3: 2, i4: 3 },
    carol: { i1: 4, i2: 3, i3: 4, i4: 3 },
    dave: { i2: 2, i3: 5 },
  });

  let sims: Map<string, Map<string, number>>;

  beforeEach(() => {
    sims = userSimilarityMatrix(ratings);
  });

  it("returns symmetric similarities", () => {
    const ab = sims.get("alice")?.get("bob");
    const ba = sims.get("bob")?.get("alice");
    expect(ab).not.toBeUndefined();
    expect(approx(ab!, ba!)).toBe(true);
  });

  it("no self-similarity entries", () => {
    expect(sims.get("alice")?.get("alice")).toBeUndefined();
  });

  it("alice and bob are correlated (share 4 items)", () => {
    const sim = sims.get("alice")?.get("bob");
    expect(sim).not.toBeUndefined();
    expect(typeof sim).toBe("number");
  });

  it("similarities are in [-1, 1]", () => {
    for (const [, innerMap] of sims.entries()) {
      for (const [, val] of innerMap.entries()) {
        expect(val).toBeGreaterThanOrEqual(-1 - 1e-9);
        expect(val).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
  });

  it("pairs with shared items are included in result", () => {
    // dave shares i2,i3 with carol — 2 items → should be included
    const daveSims = sims.get("dave");
    expect(daveSims).not.toBeUndefined();
  });

  it("empty ratings returns empty map", () => {
    const result = userSimilarityMatrix(new Map());
    expect(result.size).toBe(0);
  });

  it("single user returns empty map", () => {
    const single = makeRatings({ alice: { i1: 5 } });
    const result = userSimilarityMatrix(single);
    expect(result.size).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. predictUserRating
// ─────────────────────────────────────────────────────────────────────────────

describe("predictUserRating", () => {
  const ratings = makeRatings({
    alice: { i1: 5, i2: 3, i3: 4 },
    bob: { i1: 4, i2: 2, i3: 4, i4: 3 },
    carol: { i1: 3, i2: 4, i3: 3, i4: 4 },
  });

  let sims: Map<string, Map<string, number>>;
  beforeEach(() => {
    sims = userSimilarityMatrix(ratings);
  });

  it("returns a number for a valid prediction", () => {
    const pred = predictUserRating("alice", "i4", ratings, sims);
    expect(pred).not.toBeNull();
    expect(typeof pred).toBe("number");
  });

  it("returns null for unknown user", () => {
    expect(predictUserRating("zoe", "i1", ratings, sims)).toBeNull();
  });

  it("returns null when no neighbors rated item", () => {
    // i5 is not rated by anyone
    expect(predictUserRating("alice", "i5", ratings, sims)).toBeNull();
  });

  it("predicted rating is a sensible value (not NaN)", () => {
    const pred = predictUserRating("alice", "i4", ratings, sims);
    if (pred !== null) expect(isNaN(pred)).toBe(false);
  });

  it("respects k=1 vs k=5 — still returns number", () => {
    const pred1 = predictUserRating("alice", "i4", ratings, sims, 1);
    const pred5 = predictUserRating("alice", "i4", ratings, sims, 5);
    if (pred1 !== null) expect(typeof pred1).toBe("number");
    if (pred5 !== null) expect(typeof pred5).toBe("number");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. topNRecommendations
// ─────────────────────────────────────────────────────────────────────────────

describe("topNRecommendations", () => {
  const ratings = makeRatings({
    alice: { i1: 5, i2: 3, i3: 4 },
    bob: { i1: 4, i2: 2, i3: 4, i4: 3 },
    carol: { i1: 3, i2: 4, i3: 3, i4: 4 },
  });

  let sims: Map<string, Map<string, number>>;
  beforeEach(() => {
    sims = userSimilarityMatrix(ratings);
  });

  it("alice does not get items she already rated", () => {
    const recs = topNRecommendations("alice", ratings, sims);
    const ids = recs.map((r) => r.itemId);
    expect(ids).not.toContain("i1");
    expect(ids).not.toContain("i2");
    expect(ids).not.toContain("i3");
  });

  it("recommendations are sorted by predictedRating desc", () => {
    const recs = topNRecommendations("alice", ratings, sims);
    for (let i = 1; i < recs.length; i++) {
      expect(idx(recs, i - 1).predictedRating).toBeGreaterThanOrEqual(idx(recs, i).predictedRating);
    }
  });

  it("returns at most n items", () => {
    const recs = topNRecommendations("alice", ratings, sims, 1);
    expect(recs.length).toBeLessThanOrEqual(1);
  });

  it("returns empty for user with no similarity data", () => {
    const recs = topNRecommendations("nobody", ratings, sims);
    expect(recs).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. itemSimilarityMatrix
// ─────────────────────────────────────────────────────────────────────────────

describe("itemSimilarityMatrix", () => {
  const ratings = makeRatings({
    u1: { i1: 5, i2: 3, i3: 4 },
    u2: { i1: 4, i2: 2, i3: 5 },
    u3: { i1: 3, i2: 4, i3: 3 },
  });

  let itemSims: Map<string, Map<string, number>>;
  beforeEach(() => {
    itemSims = itemSimilarityMatrix(ratings);
  });

  it("similarity is symmetric", () => {
    const s12 = itemSims.get("i1")?.get("i2");
    const s21 = itemSims.get("i2")?.get("i1");
    if (s12 !== undefined && s21 !== undefined) {
      expect(approx(s12, s21)).toBe(true);
    }
  });

  it("values in [-1, 1]", () => {
    for (const [, inner] of itemSims.entries()) {
      for (const [, val] of inner.entries()) {
        expect(val).toBeGreaterThanOrEqual(-1 - 1e-9);
        expect(val).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
  });

  it("no self-similarity", () => {
    expect(itemSims.get("i1")?.get("i1")).toBeUndefined();
  });

  it("returns map with item keys", () => {
    expect(itemSims.has("i1") || itemSims.has("i2") || itemSims.has("i3")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. predictItemRating
// ─────────────────────────────────────────────────────────────────────────────

describe("predictItemRating", () => {
  const ratings = makeRatings({
    u1: { i1: 5, i2: 3, i3: 4 },
    u2: { i1: 4, i2: 2, i3: 5 },
    u3: { i1: 3, i2: 4, i3: 3 },
    u4: { i1: 2, i4: 5 },
  });

  let itemSims: Map<string, Map<string, number>>;
  beforeEach(() => {
    itemSims = itemSimilarityMatrix(ratings);
  });

  it("returns number for valid prediction", () => {
    // u1 has rated i1 and i2; predict i3
    const pred = predictItemRating("u1", "i3", ratings, itemSims);
    expect(pred).not.toBeNull();
    if (pred !== null) expect(typeof pred).toBe("number");
  });

  it("returns null for unknown user", () => {
    expect(predictItemRating("nobody", "i1", ratings, itemSims)).toBeNull();
  });

  it("returns null if item has no similarity data", () => {
    // i5 is not in the matrix
    expect(predictItemRating("u1", "i5", ratings, itemSims)).toBeNull();
  });

  it("predicted rating is not NaN", () => {
    const pred = predictItemRating("u1", "i3", ratings, itemSims);
    if (pred !== null) expect(isNaN(pred)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. computeTFIDF
// ─────────────────────────────────────────────────────────────────────────────

describe("computeTFIDF", () => {
  it("empty input → empty array", () => {
    expect(computeTFIDF([])).toEqual([]);
  });

  it("single doc, one unique term → IDF = log(1/1) = 0", () => {
    // When every doc contains the term, IDF = log(n/n) = 0
    const result = computeTFIDF([["cat"]]);
    // IDF for 'cat' appearing in 1/1 docs = log(1) = 0 → TF-IDF = 0
    expect(idx(idx(result, 0), 0)).toBe(0);
  });

  it("two docs, unique term has higher score in its doc", () => {
    // doc0: [cat, cat, dog], doc1: [dog, dog]
    // 'cat' appears only in doc0 → IDF = log(2/1) = 0.693..
    // 'dog' appears in both → IDF = log(2/2) = 0
    const docs = [
      ["cat", "cat", "dog"],
      ["dog", "dog"],
    ];
    const matrix = computeTFIDF(docs);
    // Matrix columns order: first-seen term (cat=0, dog=1)
    // doc0: cat TF=2/3, dog TF=1/3
    // doc1: cat TF=0, dog TF=1
    // cat IDF = log(2/1) = 0.693..
    // dog IDF = log(2/2) = 0
    expect(idx(idx(matrix, 0), 0)).toBeGreaterThan(0); // cat in doc0 has positive TF-IDF
    expect(idx(idx(matrix, 0), 1)).toBe(0);            // dog in doc0: IDF=0 → TF-IDF=0
    expect(idx(idx(matrix, 1), 0)).toBe(0);            // cat not in doc1 → TF=0
    expect(idx(idx(matrix, 1), 1)).toBe(0);            // dog in doc1: IDF=0 → TF-IDF=0
  });

  it("matrix dimensions: m docs × n unique terms", () => {
    const docs = [["a", "b"], ["b", "c"], ["a", "c", "d"]];
    const matrix = computeTFIDF(docs);
    expect(matrix.length).toBe(3);
    expect(idx(matrix, 0).length).toBe(4); // a,b,c,d
  });

  it("returns number[][] (no undefined/NaN)", () => {
    const docs = [["foo", "bar", "foo"], ["bar", "baz"]];
    const matrix = computeTFIDF(docs);
    for (const row of matrix) {
      for (const val of row) {
        expect(isNaN(val)).toBe(false);
        expect(val).not.toBeUndefined();
      }
    }
  });

  it("single-doc, two distinct terms both have IDF=0", () => {
    // Only one doc → each term in IDF: log(1/1)=0
    const matrix = computeTFIDF([["foo", "bar"]]);
    expect(idx(matrix, 0).every((v) => v === 0)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. contentBasedScore
// ─────────────────────────────────────────────────────────────────────────────

describe("contentBasedScore", () => {
  it("identical vectors → 1", () => {
    expect(approx(contentBasedScore([1, 2, 3], [1, 2, 3]), 1)).toBe(true);
  });

  it("orthogonal vectors → 0", () => {
    expect(approx(contentBasedScore([1, 0], [0, 1]), 0)).toBe(true);
  });

  it("zero vector → 0", () => {
    expect(contentBasedScore([0, 0], [1, 2])).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 14. buildUserProfile
// ─────────────────────────────────────────────────────────────────────────────

describe("buildUserProfile", () => {
  it("empty array → empty array", () => {
    expect(buildUserProfile([])).toEqual([]);
  });

  it("single item → features scaled by rating / rating = features", () => {
    const profile = buildUserProfile([{ itemFeatures: [1, 2, 3], rating: 5 }]);
    // weighted avg with only one item: features * 5 / 5 = features
    expect(approx(idx(profile, 0), 1)).toBe(true);
    expect(approx(idx(profile, 1), 2)).toBe(true);
    expect(approx(idx(profile, 2), 3)).toBe(true);
  });

  it("two equal-rated items → average", () => {
    const profile = buildUserProfile([
      { itemFeatures: [1, 0], rating: 1 },
      { itemFeatures: [0, 1], rating: 1 },
    ]);
    expect(approx(idx(profile, 0), 0.5)).toBe(true);
    expect(approx(idx(profile, 1), 0.5)).toBe(true);
  });

  it("higher-rated item has more influence", () => {
    const profile = buildUserProfile([
      { itemFeatures: [1, 0], rating: 4 },
      { itemFeatures: [0, 1], rating: 1 },
    ]);
    // dim0: (4*1 + 1*0) / 5 = 0.8
    // dim1: (4*0 + 1*1) / 5 = 0.2
    expect(approx(idx(profile, 0), 0.8)).toBe(true);
    expect(approx(idx(profile, 1), 0.2)).toBe(true);
  });

  it("zero rating sum → returns zero vector", () => {
    const profile = buildUserProfile([{ itemFeatures: [1, 2], rating: 0 }]);
    expect(idx(profile, 0)).toBe(0);
    expect(idx(profile, 1)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 15. contentBasedRecommendations
// ─────────────────────────────────────────────────────────────────────────────

describe("contentBasedRecommendations", () => {
  const userProfile = [1, 0, 0];
  const items = [
    { id: "a", features: [1, 0, 0] },
    { id: "b", features: [0, 1, 0] },
    { id: "c", features: [0.9, 0.1, 0] },
    { id: "d", features: [0, 0, 1] },
  ];

  it("excludes rated items", () => {
    const recs = contentBasedRecommendations(userProfile, items, new Set(["a"]));
    expect(recs.map((r) => r.id)).not.toContain("a");
  });

  it("sorts by score descending", () => {
    const recs = contentBasedRecommendations(userProfile, items, new Set());
    for (let i = 1; i < recs.length; i++) {
      expect(idx(recs, i - 1).score).toBeGreaterThanOrEqual(idx(recs, i).score);
    }
  });

  it("best match is item a (parallel to profile)", () => {
    const recs = contentBasedRecommendations(userProfile, items, new Set());
    expect(idx(recs, 0).id).toBe("a");
  });

  it("respects n limit", () => {
    const recs = contentBasedRecommendations(userProfile, items, new Set(), 2);
    expect(recs.length).toBeLessThanOrEqual(2);
  });

  it("returns empty if all items are rated", () => {
    const rated = new Set(["a", "b", "c", "d"]);
    const recs = contentBasedRecommendations(userProfile, items, rated);
    expect(recs).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 16. initializeMatrix
// ─────────────────────────────────────────────────────────────────────────────

describe("initializeMatrix", () => {
  it("correct dimensions", () => {
    const m = initializeMatrix(3, 4);
    expect(m.length).toBe(3);
    for (const row of m) expect(row.length).toBe(4);
  });

  it("values within [-scale, scale] with default scale=0.1", () => {
    const m = initializeMatrix(5, 5);
    for (const row of m) {
      for (const val of row) {
        expect(val).toBeGreaterThanOrEqual(-0.1 - 1e-9);
        expect(val).toBeLessThanOrEqual(0.1 + 1e-9);
      }
    }
  });

  it("custom scale respected", () => {
    const scale = 0.5;
    const m = initializeMatrix(3, 3, scale);
    for (const row of m) {
      for (const val of row) {
        expect(val).toBeGreaterThanOrEqual(-scale - 1e-9);
        expect(val).toBeLessThanOrEqual(scale + 1e-9);
      }
    }
  });

  it("deterministic (same output on repeated calls)", () => {
    const m1 = initializeMatrix(4, 4);
    const m2 = initializeMatrix(4, 4);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        expect(idx(idx(m1, r), c)).toBe(idx(idx(m2, r), c));
      }
    }
  });

  it("zero dimensions produce empty matrix", () => {
    expect(initializeMatrix(0, 4)).toEqual([]);
    expect(initializeMatrix(3, 0)).toEqual([[], [], []]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 17. matrixFactorizationSGD
// ─────────────────────────────────────────────────────────────────────────────

describe("matrixFactorizationSGD", () => {
  const ratings = [
    { user: 0, item: 0, rating: 5 },
    { user: 0, item: 1, rating: 3 },
    { user: 1, item: 0, rating: 4 },
    { user: 1, item: 2, rating: 2 },
    { user: 2, item: 1, rating: 3 },
    { user: 2, item: 2, rating: 4 },
  ];

  it("returns P and Q with correct dimensions", () => {
    const { P, Q } = matrixFactorizationSGD(ratings, 3, 3, 5, 10);
    expect(P.length).toBe(3);
    expect(Q.length).toBe(3);
    for (const row of P) expect(row.length).toBe(5);
    for (const row of Q) expect(row.length).toBe(5);
  });

  it("predicted ratings converge toward actual after training", () => {
    const { P: Ptrained, Q: Qtrained } = matrixFactorizationSGD(ratings, 3, 3, 5, 100, 0.01, 0.01);

    let errorSum = 0;
    for (const { user, item, rating } of ratings) {
      const pu = Ptrained[user];
      const qi = Qtrained[item];
      if (pu && qi) {
        const pred = predictMFRating(pu, qi);
        errorSum += Math.abs(pred - rating);
      }
    }
    // After 100 epochs, total absolute error should be reasonable
    expect(errorSum).toBeLessThan(ratings.length * 4); // generous bound
  });

  it("no NaN values in P or Q", () => {
    const { P, Q } = matrixFactorizationSGD(ratings, 3, 3, 5, 20);
    for (const row of P) for (const v of row) expect(isNaN(v)).toBe(false);
    for (const row of Q) for (const v of row) expect(isNaN(v)).toBe(false);
  });

  it("empty ratings returns initialized matrices", () => {
    const { P, Q } = matrixFactorizationSGD([], 2, 2, 3, 5);
    expect(P.length).toBe(2);
    expect(Q.length).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 18. predictMFRating
// ─────────────────────────────────────────────────────────────────────────────

describe("predictMFRating", () => {
  it("dot product of [1,2,3] and [1,2,3] = 14", () => {
    expect(predictMFRating([1, 2, 3], [1, 2, 3])).toBe(14);
  });

  it("zero vectors → 0", () => {
    expect(predictMFRating([0, 0, 0], [1, 2, 3])).toBe(0);
  });

  it("single factor", () => {
    expect(predictMFRating([3], [4])).toBe(12);
  });

  it("negative factors", () => {
    expect(predictMFRating([-1, 2], [3, -4])).toBe(-11);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 19. reconstructMatrix
// ─────────────────────────────────────────────────────────────────────────────

describe("reconstructMatrix", () => {
  it("1 user × 1 item with 1 factor", () => {
    const P = [[3]];
    const Q = [[4]];
    const R = reconstructMatrix(P, Q);
    expect(idx(idx(R, 0), 0)).toBe(12);
  });

  it("2×2 reconstruction", () => {
    const P = [[1, 0], [0, 1]];
    const Q = [[1, 0], [0, 1]];
    const R = reconstructMatrix(P, Q);
    // R = I * I^T = I
    expect(idx(idx(R, 0), 0)).toBe(1);
    expect(idx(idx(R, 0), 1)).toBe(0);
    expect(idx(idx(R, 1), 0)).toBe(0);
    expect(idx(idx(R, 1), 1)).toBe(1);
  });

  it("dimensions: numUsers × numItems", () => {
    const P = initializeMatrix(3, 5);
    const Q = initializeMatrix(4, 5);
    const R = reconstructMatrix(P, Q);
    expect(R.length).toBe(3);
    for (const row of R) expect(row.length).toBe(4);
  });

  it("no NaN in result", () => {
    const P = initializeMatrix(3, 5);
    const Q = initializeMatrix(4, 5);
    const R = reconstructMatrix(P, Q);
    for (const row of R) for (const v of row) expect(isNaN(v)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 20. hybridScore
// ─────────────────────────────────────────────────────────────────────────────

describe("hybridScore", () => {
  it("null CF → returns cbScore", () => {
    expect(hybridScore(null, 0.7)).toBe(0.7);
  });

  it("null CF with custom weight still returns cbScore", () => {
    expect(hybridScore(null, 0.8, 0.9)).toBe(0.8);
  });

  it("both provided, default weight 0.6/0.4", () => {
    // 0.6 * 0.8 + 0.4 * 0.5 = 0.48 + 0.2 = 0.68
    expect(approx(hybridScore(0.8, 0.5), 0.68)).toBe(true);
  });

  it("cfWeight=1 → uses cfScore only", () => {
    expect(approx(hybridScore(0.7, 0.2, 1.0), 0.7)).toBe(true);
  });

  it("cfWeight=0 → uses cbScore only", () => {
    expect(approx(hybridScore(0.7, 0.2, 0.0), 0.2)).toBe(true);
  });

  it("equal weights with cfWeight=0.5", () => {
    // 0.5 * 0.6 + 0.5 * 0.4 = 0.5
    expect(approx(hybridScore(0.6, 0.4, 0.5), 0.5)).toBe(true);
  });

  it("negative scores are handled", () => {
    const result = hybridScore(-0.5, 0.5, 0.5);
    expect(approx(result, 0)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 21. diversityPenalty
// ─────────────────────────────────────────────────────────────────────────────

describe("diversityPenalty", () => {
  it("no selected items → 0 (no penalty)", () => {
    const penalty = diversityPenalty([], [], { id: "x", features: [1, 0] });
    expect(penalty).toBe(0);
  });

  it("new item identical to selected → penalty ≈ 1", () => {
    const selected = [{ id: "a", features: [1, 0] }];
    const penalty = diversityPenalty([], selected, { id: "b", features: [1, 0] });
    expect(approx(penalty, 1)).toBe(true);
  });

  it("new item orthogonal to selected → penalty ≈ 0", () => {
    const selected = [{ id: "a", features: [1, 0] }];
    const penalty = diversityPenalty([], selected, { id: "b", features: [0, 1] });
    expect(approx(penalty, 0)).toBe(true);
  });

  it("averages similarity across multiple selected items", () => {
    const selected = [
      { id: "a", features: [1, 0] },
      { id: "b", features: [0, 1] },
    ];
    const newItem = { id: "c", features: [1, 0] };
    // cos([1,0],[1,0])=1, cos([0,1],[1,0])=0 → avg=0.5
    const penalty = diversityPenalty([], selected, newItem);
    expect(approx(penalty, 0.5)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 22. diversifiedTopN
// ─────────────────────────────────────────────────────────────────────────────

describe("diversifiedTopN", () => {
  const candidates = [
    { id: "a", score: 0.9, features: [1, 0, 0] },
    { id: "b", score: 0.8, features: [1, 0, 0] }, // similar to a
    { id: "c", score: 0.7, features: [0, 1, 0] }, // diverse
    { id: "d", score: 0.6, features: [0, 0, 1] }, // diverse
    { id: "e", score: 0.5, features: [0.9, 0.1, 0] }, // similar to a
  ];

  it("returns at most n items", () => {
    const recs = diversifiedTopN(candidates, 3);
    expect(recs.length).toBeLessThanOrEqual(3);
  });

  it("first pick is the highest-scoring item", () => {
    const recs = diversifiedTopN(candidates, 5);
    expect(idx(recs, 0).id).toBe("a");
  });

  it("diverse items preferred over similar high-scored items", () => {
    // With diversity weighting, c and d (diverse) should be preferred over b,e (similar to a)
    const recs = diversifiedTopN(candidates, 3, 0.9);
    const ids = recs.map((r) => r.id);
    // c and d should appear before b or e in a highly-diverse selection
    expect(ids).toContain("c");
  });

  it("default n=10 doesn't exceed candidate count", () => {
    const recs = diversifiedTopN(candidates);
    expect(recs.length).toBeLessThanOrEqual(candidates.length);
  });

  it("empty candidates → empty result", () => {
    expect(diversifiedTopN([])).toEqual([]);
  });

  it("returns original scores", () => {
    const recs = diversifiedTopN(candidates, 2);
    for (const rec of recs) {
      const orig = candidates.find((c) => c.id === rec.id)!;
      expect(rec.score).toBe(orig.score);
    }
  });

  it("diversityWeight=0 → pure score ordering", () => {
    const recs = diversifiedTopN(candidates, 5, 0);
    for (let i = 1; i < recs.length; i++) {
      expect(idx(recs, i - 1).score).toBeGreaterThanOrEqual(idx(recs, i).score);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 23. pickAffinityScore
// ─────────────────────────────────────────────────────────────────────────────

describe("pickAffinityScore", () => {
  const history = [
    { sport: "NBA", betType: "spread", won: true },
    { sport: "NBA", betType: "spread", won: true },
    { sport: "NBA", betType: "spread", won: false },
    { sport: "NFL", betType: "total", won: false },
    { sport: "NFL", betType: "moneyline", won: true },
  ];

  it("no history → 0.5", () => {
    expect(pickAffinityScore([], { sport: "NBA", betType: "spread" })).toBe(0.5);
  });

  it("no matching sport+betType → 0.5", () => {
    expect(
      pickAffinityScore(history, { sport: "MLB", betType: "spread" })
    ).toBe(0.5);
  });

  it("NBA spread: 2 wins / 3 attempts → 2/3", () => {
    const score = pickAffinityScore(history, { sport: "NBA", betType: "spread" });
    expect(approx(score, 2 / 3)).toBe(true);
  });

  it("NFL total: 0 wins / 1 attempt → 0", () => {
    expect(pickAffinityScore(history, { sport: "NFL", betType: "total" })).toBe(0);
  });

  it("NFL moneyline: 1 win / 1 attempt → 1", () => {
    expect(pickAffinityScore(history, { sport: "NFL", betType: "moneyline" })).toBe(1);
  });

  it("returns value in [0, 1]", () => {
    const score = pickAffinityScore(history, { sport: "NBA", betType: "spread" });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 24. sportPreferenceVector
// ─────────────────────────────────────────────────────────────────────────────

describe("sportPreferenceVector", () => {
  const sports = ["NBA", "NFL", "MLB"];

  it("empty history → zero vector", () => {
    const vec = sportPreferenceVector([], sports);
    expect(vec).toEqual([0, 0, 0]);
  });

  it("single sport → unit vector with 1 at that index", () => {
    const vec = sportPreferenceVector([{ sport: "NBA", engagementScore: 5 }], sports);
    expect(approx(idx(vec, 0), 1)).toBe(true);
    expect(idx(vec, 1)).toBe(0);
    expect(idx(vec, 2)).toBe(0);
  });

  it("unit vector (magnitude = 1) when non-zero", () => {
    const history = [
      { sport: "NBA", engagementScore: 3 },
      { sport: "NFL", engagementScore: 4 },
    ];
    const vec = sportPreferenceVector(history, sports);
    const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    expect(approx(mag, 1)).toBe(true);
  });

  it("ignores unknown sports", () => {
    const history = [{ sport: "HOCKEY", engagementScore: 10 }];
    const vec = sportPreferenceVector(history, sports);
    expect(vec).toEqual([0, 0, 0]);
  });

  it("sums engagement for repeated sport", () => {
    const history = [
      { sport: "NBA", engagementScore: 2 },
      { sport: "NBA", engagementScore: 3 },
    ];
    const vec = sportPreferenceVector(history, sports);
    // total NBA=5, others=0 → normalized: [1, 0, 0]
    expect(approx(idx(vec, 0), 1)).toBe(true);
  });

  it("returns vector of length = sports.length", () => {
    const history = [{ sport: "NBA", engagementScore: 1 }];
    const vec = sportPreferenceVector(history, sports);
    expect(vec.length).toBe(sports.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 25. bettorProfile
// ─────────────────────────────────────────────────────────────────────────────

describe("bettorProfile", () => {
  it("empty history → zeros, sharpness=1", () => {
    const p = bettorProfile([]);
    expect(p.avgConfidence).toBe(0);
    expect(p.winRate).toBe(0);
    expect(p.avgStake).toBe(0);
    expect(p.sharpness).toBe(1);
  });

  it("single bet → correct averages, sharpness=1", () => {
    const p = bettorProfile([{ confidence: 80, won: true, stake: 100 }]);
    expect(p.avgConfidence).toBe(80);
    expect(p.winRate).toBe(1);
    expect(p.avgStake).toBe(100);
    expect(p.sharpness).toBe(1);
  });

  it("computes win rate correctly", () => {
    const history = [
      { confidence: 70, won: true, stake: 50 },
      { confidence: 60, won: false, stake: 50 },
      { confidence: 80, won: true, stake: 50 },
      { confidence: 55, won: false, stake: 50 },
    ];
    const p = bettorProfile(history);
    expect(approx(p.winRate, 0.5)).toBe(true);
  });

  it("computes avgConfidence correctly", () => {
    const history = [
      { confidence: 60, won: true, stake: 100 },
      { confidence: 80, won: false, stake: 100 },
    ];
    const p = bettorProfile(history);
    expect(approx(p.avgConfidence, 70)).toBe(true);
  });

  it("computes avgStake correctly", () => {
    const history = [
      { confidence: 60, won: true, stake: 100 },
      { confidence: 80, won: false, stake: 200 },
    ];
    const p = bettorProfile(history);
    expect(approx(p.avgStake, 150)).toBe(true);
  });

  it("sharpness is in [-1, 1]", () => {
    const history = Array.from({ length: 10 }, (_, i) => ({
      confidence: 50 + i * 5,
      won: i % 2 === 0,
      stake: 100,
    }));
    const p = bettorProfile(history);
    expect(p.sharpness).toBeGreaterThanOrEqual(-1 - 1e-9);
    expect(p.sharpness).toBeLessThanOrEqual(1 + 1e-9);
  });

  it("constant outcomes → pearson=0 (std of outcome is 0)", () => {
    // Both won → constant outcome → pearson=0
    const history = [
      { confidence: 0.6, won: true, stake: 100 },
      { confidence: 0.8, won: true, stake: 100 },
    ];
    const p = bettorProfile(history);
    expect(p.sharpness).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 26. similarBettors
// ─────────────────────────────────────────────────────────────────────────────

describe("similarBettors", () => {
  const pool = [
    { userId: "u1", avgConfidence: 70, winRate: 0.55, avgStake: 100, sharpness: 0.3 },
    { userId: "u2", avgConfidence: 60, winRate: 0.45, avgStake: 50, sharpness: 0.1 },
    { userId: "u3", avgConfidence: 75, winRate: 0.58, avgStake: 110, sharpness: 0.35 },
    { userId: "u4", avgConfidence: 40, winRate: 0.30, avgStake: 200, sharpness: -0.2 },
    { userId: "u5", avgConfidence: 72, winRate: 0.56, avgStake: 105, sharpness: 0.32 },
  ];

  const profile = { avgConfidence: 71, winRate: 0.55, avgStake: 102, sharpness: 0.31 };

  it("returns k users", () => {
    const result = similarBettors(profile, pool, 3);
    expect(result.length).toBe(3);
  });

  it("returns user IDs as strings", () => {
    const result = similarBettors(profile, pool);
    for (const id of result) expect(typeof id).toBe("string");
  });

  it("empty pool → empty result", () => {
    expect(similarBettors(profile, [])).toEqual([]);
  });

  it("profile identical to a pool member → that member is first", () => {
    const target = pool[0];
    if (!target) throw new Error("pool is empty");
    const result = similarBettors(
      { avgConfidence: target.avgConfidence, winRate: target.winRate, avgStake: target.avgStake, sharpness: target.sharpness },
      pool,
      1
    );
    expect(idx(result, 0)).toBe("u1");
  });

  it("k larger than pool returns all pool members", () => {
    const result = similarBettors(profile, pool, 100);
    expect(result.length).toBe(pool.length);
  });

  it("default k=5", () => {
    const result = similarBettors(profile, pool);
    expect(result.length).toBe(Math.min(5, pool.length));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 27. trendingPicks
// ─────────────────────────────────────────────────────────────────────────────

describe("trendingPicks", () => {
  const nowSeconds = Date.now() / 1000;
  const oneHourAgo = nowSeconds - 3600;
  const tenHoursAgo = nowSeconds - 36000;

  it("empty maps → empty array", () => {
    expect(trendingPicks(new Map(), new Map())).toEqual([]);
  });

  it("recent pick scores higher than old pick with same views", () => {
    const views = new Map([["recent", 100], ["old", 100]]);
    const recency = new Map([["recent", nowSeconds], ["old", tenHoursAgo]]);
    const result = trendingPicks(views, recency);
    expect(idx(result, 0).pickId).toBe("recent");
  });

  it("sorted descending by score", () => {
    const views = new Map([["p1", 50], ["p2", 100], ["p3", 200]]);
    const recency = new Map([
      ["p1", nowSeconds],
      ["p2", nowSeconds],
      ["p3", nowSeconds],
    ]);
    const result = trendingPicks(views, recency);
    for (let i = 1; i < result.length; i++) {
      expect(idx(result, i - 1).score).toBeGreaterThanOrEqual(idx(result, i).score);
    }
  });

  it("picks not in recency map are excluded", () => {
    const views = new Map([["p1", 100], ["p2", 50]]);
    const recency = new Map([["p1", nowSeconds]]);
    const result = trendingPicks(views, recency);
    expect(result.map((r) => r.pickId)).not.toContain("p2");
  });

  it("higher lambda → stronger time decay", () => {
    const views = new Map([["p1", 1000]]);
    const recency = new Map([["p1", oneHourAgo]]);
    const score_low = idx(trendingPicks(views, recency, 0.01), 0).score;
    const score_high = idx(trendingPicks(views, recency, 1.0), 0).score;
    expect(score_low).toBeGreaterThan(score_high);
  });

  it("picks with 0 views score 0", () => {
    const views = new Map([["p1", 0]]);
    const recency = new Map([["p1", nowSeconds]]);
    const result = trendingPicks(views, recency);
    expect(idx(result, 0).score).toBe(0);
  });

  it("scores are non-negative", () => {
    const views = new Map([["p1", 100], ["p2", 200]]);
    const recency = new Map([["p1", nowSeconds], ["p2", oneHourAgo]]);
    const result = trendingPicks(views, recency);
    for (const r of result) expect(r.score).toBeGreaterThanOrEqual(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 28. Matrix Factorization Convergence
// ─────────────────────────────────────────────────────────────────────────────

describe("matrixFactorizationSGD convergence", () => {
  it("RMSE improves with more epochs", () => {
    const observations = [
      { user: 0, item: 0, rating: 5 },
      { user: 0, item: 1, rating: 3 },
      { user: 0, item: 2, rating: 1 },
      { user: 1, item: 0, rating: 2 },
      { user: 1, item: 1, rating: 4 },
      { user: 1, item: 2, rating: 5 },
      { user: 2, item: 0, rating: 1 },
      { user: 2, item: 1, rating: 2 },
      { user: 2, item: 2, rating: 4 },
    ];

    const rmse = (P: number[][], Q: number[][]) => {
      let sum = 0;
      for (const { user, item, rating } of observations) {
        const pu = P[user];
        const qi = Q[item];
        if (pu && qi) {
          const pred = predictMFRating(pu, qi);
          sum += (pred - rating) ** 2;
        }
      }
      return Math.sqrt(sum / observations.length);
    };

    const { P: P5, Q: Q5 } = matrixFactorizationSGD(observations, 3, 3, 5, 5);
    const { P: P100, Q: Q100 } = matrixFactorizationSGD(observations, 3, 3, 5, 100);

    const rmse5 = rmse(P5, Q5);
    const rmse100 = rmse(P100, Q100);

    // 100 epochs should have lower RMSE than 5 epochs
    expect(rmse100).toBeLessThan(rmse5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 29. Hybrid Recommender Edge Cases
// ─────────────────────────────────────────────────────────────────────────────

describe("hybridScore edge cases", () => {
  it("cfScore=0, cbScore=0 → 0", () => {
    expect(hybridScore(0, 0)).toBe(0);
  });

  it("cfScore=1, cbScore=1 → 1", () => {
    expect(approx(hybridScore(1, 1), 1)).toBe(true);
  });

  it("custom weight 0.8: result between cf and cb", () => {
    const result = hybridScore(0.9, 0.5, 0.8);
    // 0.8 * 0.9 + 0.2 * 0.5 = 0.72 + 0.10 = 0.82
    expect(approx(result, 0.82)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 30. Integration: full pipeline
// ─────────────────────────────────────────────────────────────────────────────

describe("Integration: collaborative filtering pipeline", () => {
  const rawRatings = {
    alice: { item1: 5, item2: 3, item3: 4, item4: 4 },
    bob: { item1: 3, item2: 1, item3: 2, item4: 3, item5: 3 },
    carol: { item1: 4, item2: 3, item3: 4, item4: 3, item5: 5 },
    dave: { item1: 3, item3: 3, item5: 4 },
    eve: { item2: 2, item3: 4, item4: 4, item5: 5 },
  };

  const ratings = makeRatings(rawRatings);
  const sims = userSimilarityMatrix(ratings);

  it("alice gets recommendations she hasn't rated", () => {
    const recs = topNRecommendations("alice", ratings, sims, 5);
    const aliceRated = new Set(Object.keys(rawRatings.alice));
    for (const rec of recs) {
      expect(aliceRated.has(rec.itemId)).toBe(false);
    }
  });

  it("all predicted ratings are finite numbers", () => {
    const recs = topNRecommendations("alice", ratings, sims, 10);
    for (const rec of recs) {
      expect(isFinite(rec.predictedRating)).toBe(true);
    }
  });

  it("item-based CF also works for this dataset", () => {
    const itemSims = itemSimilarityMatrix(ratings);
    const pred = predictItemRating("alice", "item5", ratings, itemSims);
    // alice hasn't rated item5; should produce a prediction or null
    expect(pred === null || typeof pred === "number").toBe(true);
    if (pred !== null) expect(isNaN(pred)).toBe(false);
  });
});

describe("Integration: content-based pipeline", () => {
  const docs = [
    ["nba", "basketball", "spread", "points"],
    ["nfl", "football", "moneyline", "touchdown"],
    ["nba", "basketball", "moneyline", "slam"],
    ["mlb", "baseball", "total", "runs"],
  ];

  it("TF-IDF produces a valid matrix", () => {
    const matrix = computeTFIDF(docs);
    expect(matrix.length).toBe(4);
    expect(idx(matrix, 0).length).toBeGreaterThan(0);
  });

  it("content-based pipeline returns sorted results", () => {
    const matrix = computeTFIDF(docs);
    const row0 = idx(matrix, 0);
    const row2 = idx(matrix, 2);
    const userProfile = buildUserProfile([
      { itemFeatures: row0, rating: 5 },
      { itemFeatures: row2, rating: 4 },
    ]);
    const items = matrix.map((f, i) => ({ id: `doc${i}`, features: f }));
    const rated = new Set(["doc0", "doc2"]);
    const recs = contentBasedRecommendations(userProfile, items, rated);
    for (let i = 1; i < recs.length; i++) {
      expect(idx(recs, i - 1).score).toBeGreaterThanOrEqual(idx(recs, i).score);
    }
  });
});

describe("Integration: sports helpers pipeline", () => {
  it("builds bettor profile and finds similar bettors", () => {
    const myHistory = [
      { confidence: 70, won: true, stake: 100 },
      { confidence: 65, won: false, stake: 80 },
      { confidence: 75, won: true, stake: 120 },
    ];
    const myProfile = bettorProfile(myHistory);

    const pool = [
      { userId: "pro1", avgConfidence: 72, winRate: 0.60, avgStake: 110, sharpness: 0.4 },
      { userId: "rec1", avgConfidence: 50, winRate: 0.40, avgStake: 200, sharpness: -0.1 },
      { userId: "sim1", avgConfidence: 71, winRate: 0.57, avgStake: 98, sharpness: 0.32 },
    ];

    const similar = similarBettors(myProfile, pool, 2);
    expect(similar.length).toBe(2);
    // pro1 and sim1 are the closest matches to myProfile; the furthest should be rec1
    expect(similar).not.toContain("rec1");
  });

  it("pick affinity + sport preference integration", () => {
    const history = [
      { sport: "NBA", betType: "spread", won: true },
      { sport: "NBA", betType: "spread", won: true },
      { sport: "NFL", betType: "total", won: false },
    ];
    const sports = ["NBA", "NFL", "MLB"];
    const engagementHistory = [
      { sport: "NBA", engagementScore: 10 },
      { sport: "NBA", engagementScore: 5 },
      { sport: "NFL", engagementScore: 3 },
    ];

    const affinity = pickAffinityScore(history, { sport: "NBA", betType: "spread" });
    const prefVec = sportPreferenceVector(engagementHistory, sports);

    expect(approx(affinity, 1)).toBe(true); // 2/2 wins
    expect(idx(prefVec, 0)).toBeGreaterThan(idx(prefVec, 1)); // NBA > NFL
    expect(idx(prefVec, 2)).toBe(0); // No MLB history
  });
});

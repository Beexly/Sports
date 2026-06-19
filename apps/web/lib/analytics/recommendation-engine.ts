/**
 * recommendation-engine.ts
 *
 * Pure TypeScript analytics library for sports prediction recommendations.
 * Zero npm dependencies — Node built-ins only.
 * Strict mode compatible (noUncheckedIndexedAccess, strict).
 */

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Safe array read — asserts the element exists (caller must ensure bounds). */
function at<T>(arr: T[], i: number): T {
  const v = arr[i];
  if (v === undefined) throw new RangeError(`Index ${i} out of bounds (length ${arr.length})`);
  return v;
}

// ─── Similarity Metrics ───────────────────────────────────────────────────────

/** L2 norm of a vector. */
function normVec(v: number[]): number {
  let sum = 0;
  for (let i = 0; i < v.length; i++) {
    const x = at(v, i);
    sum += x * x;
  }
  return Math.sqrt(sum);
}

/**
 * Cosine similarity between two vectors.
 * Returns 0 if either vector is the zero vector.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  const na = normVec(a);
  const nb = normVec(b);
  if (na === 0 || nb === 0) return 0;

  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += at(a, i) * at(b, i);
  }
  return dot / (na * nb);
}

/**
 * Pearson correlation coefficient between two vectors.
 * Returns 0 if either vector has zero standard deviation.
 */
export function pearsonCorrelation(a: number[], b: number[]): number {
  const n = a.length;
  if (n === 0) return 0;

  let sumA = 0;
  let sumB = 0;
  for (let i = 0; i < n; i++) {
    sumA += at(a, i);
    sumB += at(b, i);
  }
  const meanA = sumA / n;
  const meanB = sumB / n;

  let num = 0;
  let da2 = 0;
  let db2 = 0;
  for (let i = 0; i < n; i++) {
    const da = at(a, i) - meanA;
    const db = at(b, i) - meanB;
    num += da * db;
    da2 += da * da;
    db2 += db * db;
  }

  const denom = Math.sqrt(da2 * db2);
  if (denom === 0) return 0;
  return num / denom;
}

/**
 * Jaccard similarity between two sets.
 * Returns 0 if both sets are empty.
 */
export function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 0;

  let intersectionSize = 0;
  for (const item of setA) {
    if (setB.has(item)) intersectionSize++;
  }

  const unionSize = setA.size + setB.size - intersectionSize;
  return intersectionSize / unionSize;
}

/**
 * Euclidean distance between two equal-length vectors.
 */
export function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = at(a, i) - at(b, i);
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Manhattan distance between two equal-length vectors.
 */
export function manhattanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.abs(at(a, i) - at(b, i));
  }
  return sum;
}

/**
 * Hamming distance: count of positions where the elements differ.
 * Throws if arrays have different lengths.
 */
export function hammingDistance(a: (string | number)[], b: (string | number)[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `hammingDistance: arrays must have equal length (got ${a.length} and ${b.length})`
    );
  }
  let count = 0;
  for (let i = 0; i < a.length; i++) {
    if (at(a, i) !== at(b, i)) count++;
  }
  return count;
}

// ─── Collaborative Filtering (User-Based) ────────────────────────────────────

/**
 * Build a user-user similarity matrix using Pearson correlation.
 * Only pairs of users who share at least 2 rated items are included.
 *
 * @param ratings  Map<userId, Map<itemId, rating>>
 * @returns        Map<userId, Map<userId, pearsonCorrelation>>
 */
export function userSimilarityMatrix(
  ratings: Map<string, Map<string, number>>
): Map<string, Map<string, number>> {
  const users = Array.from(ratings.keys());
  const result = new Map<string, Map<string, number>>();

  for (let i = 0; i < users.length; i++) {
    const uA = at(users, i);
    const ratingsA = ratings.get(uA);
    if (!ratingsA) continue;

    for (let j = i + 1; j < users.length; j++) {
      const uB = at(users, j);
      const ratingsB = ratings.get(uB);
      if (!ratingsB) continue;

      // Find shared items
      const sharedItems: string[] = [];
      for (const itemId of ratingsA.keys()) {
        if (ratingsB.has(itemId)) sharedItems.push(itemId);
      }

      if (sharedItems.length < 2) continue;

      const vecA: number[] = [];
      const vecB: number[] = [];
      for (const id of sharedItems) {
        const va = ratingsA.get(id);
        const vb = ratingsB.get(id);
        if (va !== undefined && vb !== undefined) {
          vecA.push(va);
          vecB.push(vb);
        }
      }

      const sim = pearsonCorrelation(vecA, vecB);

      if (!result.has(uA)) result.set(uA, new Map());
      if (!result.has(uB)) result.set(uB, new Map());
      result.get(uA)!.set(uB, sim);
      result.get(uB)!.set(uA, sim);
    }
  }

  return result;
}

/**
 * Predict a user's rating for an item using user-based collaborative filtering.
 *
 * @param userId       Target user
 * @param itemId       Target item
 * @param ratings      Full ratings matrix
 * @param similarities Pre-computed user similarity matrix
 * @param k            Max neighbors to use (default 5)
 * @returns            Predicted rating, or null if no suitable neighbors found
 */
export function predictUserRating(
  userId: string,
  itemId: string,
  ratings: Map<string, Map<string, number>>,
  similarities: Map<string, Map<string, number>>,
  k = 5
): number | null {
  const userSims = similarities.get(userId);
  if (!userSims) return null;

  // Gather neighbors who have rated this item
  const neighbors: Array<{ userId: string; sim: number; rating: number }> = [];
  for (const [neighborId, sim] of userSims.entries()) {
    const neighborRatings = ratings.get(neighborId);
    if (neighborRatings) {
      const r = neighborRatings.get(itemId);
      if (r !== undefined) {
        neighbors.push({ userId: neighborId, sim, rating: r });
      }
    }
  }

  if (neighbors.length === 0) return null;

  // Take top-k by absolute similarity
  neighbors.sort((a, b) => Math.abs(b.sim) - Math.abs(a.sim));
  const topK = neighbors.slice(0, k);

  // Weighted average: Σ(sim_i * rating_i) / Σ|sim_i|
  let weightedSum = 0;
  let weightSum = 0;
  for (const { sim, rating } of topK) {
    weightedSum += sim * rating;
    weightSum += Math.abs(sim);
  }

  if (weightSum === 0) return null;
  return weightedSum / weightSum;
}

/**
 * Return top-N item recommendations for a user using user-based CF.
 *
 * @param userId       Target user
 * @param ratings      Full ratings matrix
 * @param similarities Pre-computed user similarity matrix
 * @param n            Number of recommendations (default 10)
 * @param k            Neighbor count for prediction (default 5)
 * @returns            Array of {itemId, predictedRating}, sorted desc
 */
export function topNRecommendations(
  userId: string,
  ratings: Map<string, Map<string, number>>,
  similarities: Map<string, Map<string, number>>,
  n = 10,
  k = 5
): Array<{ itemId: string; predictedRating: number }> {
  const userRatings = ratings.get(userId) ?? new Map<string, number>();

  // Collect all items from the rating matrix
  const allItems = new Set<string>();
  for (const itemMap of ratings.values()) {
    for (const itemId of itemMap.keys()) {
      allItems.add(itemId);
    }
  }

  const candidates: Array<{ itemId: string; predictedRating: number }> = [];
  for (const itemId of allItems) {
    if (userRatings.has(itemId)) continue;

    const predicted = predictUserRating(userId, itemId, ratings, similarities, k);
    if (predicted !== null) {
      candidates.push({ itemId, predictedRating: predicted });
    }
  }

  candidates.sort((a, b) => b.predictedRating - a.predictedRating);
  return candidates.slice(0, n);
}

// ─── Item-Based Collaborative Filtering ──────────────────────────────────────

/**
 * Build an item-item similarity matrix using Pearson correlation over shared users.
 *
 * @param ratings  Map<userId, Map<itemId, rating>>
 * @returns        Map<itemId, Map<itemId, pearsonCorrelation>>
 */
export function itemSimilarityMatrix(
  ratings: Map<string, Map<string, number>>
): Map<string, Map<string, number>> {
  // Transpose: itemId → Map<userId, rating>
  const itemRatings = new Map<string, Map<string, number>>();
  for (const [userId, userRatings] of ratings.entries()) {
    for (const [itemId, rating] of userRatings.entries()) {
      if (!itemRatings.has(itemId)) itemRatings.set(itemId, new Map());
      itemRatings.get(itemId)!.set(userId, rating);
    }
  }

  const items = Array.from(itemRatings.keys());
  const result = new Map<string, Map<string, number>>();

  for (let i = 0; i < items.length; i++) {
    const itemA = at(items, i);
    const ratingsA = itemRatings.get(itemA);
    if (!ratingsA) continue;

    for (let j = i + 1; j < items.length; j++) {
      const itemB = at(items, j);
      const ratingsB = itemRatings.get(itemB);
      if (!ratingsB) continue;

      // Find shared users
      const sharedUsers: string[] = [];
      for (const uid of ratingsA.keys()) {
        if (ratingsB.has(uid)) sharedUsers.push(uid);
      }

      if (sharedUsers.length < 2) continue;

      const vecA: number[] = [];
      const vecB: number[] = [];
      for (const uid of sharedUsers) {
        const va = ratingsA.get(uid);
        const vb = ratingsB.get(uid);
        if (va !== undefined && vb !== undefined) {
          vecA.push(va);
          vecB.push(vb);
        }
      }

      const sim = pearsonCorrelation(vecA, vecB);

      if (!result.has(itemA)) result.set(itemA, new Map());
      if (!result.has(itemB)) result.set(itemB, new Map());
      result.get(itemA)!.set(itemB, sim);
      result.get(itemB)!.set(itemA, sim);
    }
  }

  return result;
}

/**
 * Predict a user's rating for an item using item-based collaborative filtering.
 *
 * @param userId    Target user
 * @param itemId    Target item
 * @param ratings   Full ratings matrix
 * @param itemSims  Pre-computed item similarity matrix
 * @param k         Max similar items to use (default 5)
 * @returns         Predicted rating, or null if not possible
 */
export function predictItemRating(
  userId: string,
  itemId: string,
  ratings: Map<string, Map<string, number>>,
  itemSims: Map<string, Map<string, number>>,
  k = 5
): number | null {
  const userRatings = ratings.get(userId);
  if (!userRatings) return null;

  const simsForItem = itemSims.get(itemId);
  if (!simsForItem) return null;

  // Gather items the user HAS rated that are similar to target
  const candidates: Array<{ sim: number; rating: number }> = [];
  for (const [ratedItemId, rating] of userRatings.entries()) {
    const sim = simsForItem.get(ratedItemId);
    if (sim !== undefined) {
      candidates.push({ sim, rating });
    }
  }

  if (candidates.length === 0) return null;

  // Top-k by absolute similarity
  candidates.sort((a, b) => Math.abs(b.sim) - Math.abs(a.sim));
  const topK = candidates.slice(0, k);

  let weightedSum = 0;
  let weightSum = 0;
  for (const { sim, rating } of topK) {
    weightedSum += sim * rating;
    weightSum += Math.abs(sim);
  }

  if (weightSum === 0) return null;
  return weightedSum / weightSum;
}

// ─── Content-Based Filtering ─────────────────────────────────────────────────

/**
 * Compute TF-IDF matrix for a collection of tokenized documents.
 *
 * @param documents  Array of documents, each being an array of tokens
 * @returns          matrix[docIndex][termIndex], columns ordered by first-seen term
 */
export function computeTFIDF(documents: string[][]): number[][] {
  if (documents.length === 0) return [];

  // Build vocabulary (insertion order = column order)
  const vocab = new Map<string, number>();
  for (const doc of documents) {
    for (const token of doc) {
      if (!vocab.has(token)) vocab.set(token, vocab.size);
    }
  }

  const numDocs = documents.length;
  const numTerms = vocab.size;

  // Document frequency: how many docs contain each term
  const df = new Array<number>(numTerms).fill(0);
  for (const doc of documents) {
    const seen = new Set<string>(doc);
    for (const token of seen) {
      const idx = vocab.get(token);
      if (idx !== undefined && idx < numTerms) {
        df[idx] = (df[idx] ?? 0) + 1;
      }
    }
  }

  // Build TF-IDF matrix
  const matrix: number[][] = [];
  for (const doc of documents) {
    const tf = new Array<number>(numTerms).fill(0);

    for (const token of doc) {
      const idx = vocab.get(token);
      if (idx !== undefined && idx < numTerms) {
        tf[idx] = (tf[idx] ?? 0) + 1;
      }
    }
    const docLen = doc.length || 1;

    const tfidf = new Array<number>(numTerms).fill(0);
    for (let t = 0; t < numTerms; t++) {
      const termTF = (tf[t] ?? 0) / docLen;
      const dfVal = df[t] ?? 0;
      const idf = dfVal > 0 ? Math.log(numDocs / dfVal) : 0;
      tfidf[t] = termTF * idf;
    }
    matrix.push(tfidf);
  }

  return matrix;
}

/**
 * Content-based score: cosine similarity between a user profile and item features.
 */
export function contentBasedScore(userProfile: number[], itemFeatures: number[]): number {
  return cosineSimilarity(userProfile, itemFeatures);
}

/**
 * Build a user content profile as a rating-weighted average of item feature vectors.
 *
 * @param ratedItems  Items the user has rated, each with feature vector and rating
 * @returns           Weighted-average feature vector (user profile)
 */
export function buildUserProfile(
  ratedItems: Array<{ itemFeatures: number[]; rating: number }>
): number[] {
  if (ratedItems.length === 0) return [];

  const first = ratedItems[0];
  if (!first) return [];
  const dim = first.itemFeatures.length;
  const profile = new Array<number>(dim).fill(0);
  let totalWeight = 0;

  for (const { itemFeatures, rating } of ratedItems) {
    for (let i = 0; i < dim; i++) {
      profile[i] = (profile[i] ?? 0) + (itemFeatures[i] ?? 0) * rating;
    }
    totalWeight += rating;
  }

  if (totalWeight === 0) return profile;
  return profile.map((v) => v / totalWeight);
}

/**
 * Return top-N unrated items ranked by content-based similarity to user profile.
 *
 * @param userProfile  User feature vector
 * @param items        Candidate items with id and feature vectors
 * @param rated        Set of item IDs the user has already rated
 * @param n            Number of results (default 10)
 * @returns            Array of {id, score} sorted desc
 */
export function contentBasedRecommendations(
  userProfile: number[],
  items: Array<{ id: string; features: number[] }>,
  rated: Set<string>,
  n = 10
): Array<{ id: string; score: number }> {
  const results: Array<{ id: string; score: number }> = [];

  for (const item of items) {
    if (rated.has(item.id)) continue;
    const score = contentBasedScore(userProfile, item.features);
    results.push({ id: item.id, score });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, n);
}

// ─── Matrix Factorization (SGD) ───────────────────────────────────────────────

/**
 * Initialize a matrix with a deterministic seed-based pattern for reproducibility.
 * Uses formula: ((row * cols + col) * 0.001) % (2 * scale) - scale
 *
 * @param rows   Number of rows
 * @param cols   Number of columns
 * @param scale  Magnitude of initialization range [-scale, scale] (default 0.1)
 * @returns      Initialized matrix
 */
export function initializeMatrix(rows: number, cols: number, scale = 0.1): number[][] {
  const matrix: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols; c++) {
      // Deterministic seed-based init
      const seed = (r * cols + c) * 0.001;
      // Map seed to range [-scale, scale]
      const span = 2 * scale;
      const val = ((seed % span) + span) % span - scale;
      row.push(val);
    }
    matrix.push(row);
  }
  return matrix;
}

/**
 * Matrix factorization via Stochastic Gradient Descent.
 * Factorizes ratings into P (users × factors) and Q (items × factors)
 * such that P * Q^T ≈ R.
 *
 * @param ratings   Array of observed ratings {user, item, rating}
 * @param numUsers  Total number of users
 * @param numItems  Total number of items
 * @param factors   Latent factors (default 10)
 * @param epochs    Training epochs (default 20)
 * @param lr        Learning rate (default 0.01)
 * @param reg       Regularization coefficient (default 0.02)
 * @returns         {P: user matrix, Q: item matrix}
 */
export function matrixFactorizationSGD(
  ratings: Array<{ user: number; item: number; rating: number }>,
  numUsers: number,
  numItems: number,
  factors = 10,
  epochs = 20,
  lr = 0.01,
  reg = 0.02
): { P: number[][]; Q: number[][] } {
  const P = initializeMatrix(numUsers, factors, 0.1);
  const Q = initializeMatrix(numItems, factors, 0.1);

  for (let epoch = 0; epoch < epochs; epoch++) {
    for (const { user, item, rating } of ratings) {
      const pu = P[user];
      const qi = Q[item];
      if (!pu || !qi) continue;

      // Prediction
      let pred = 0;
      for (let f = 0; f < factors; f++) {
        pred += (pu[f] ?? 0) * (qi[f] ?? 0);
      }
      const err = rating - pred;

      // Update P[user] and Q[item]
      for (let f = 0; f < factors; f++) {
        const puf = pu[f] ?? 0;
        const qif = qi[f] ?? 0;
        pu[f] = puf + lr * (err * qif - reg * puf);
        qi[f] = qif + lr * (err * puf - reg * qif);
      }
    }
  }

  return { P, Q };
}

/**
 * Predict a rating as the dot product of user and item factor vectors.
 */
export function predictMFRating(userFactors: number[], itemFactors: number[]): number {
  let sum = 0;
  for (let i = 0; i < userFactors.length; i++) {
    sum += (userFactors[i] ?? 0) * (itemFactors[i] ?? 0);
  }
  return sum;
}

/**
 * Reconstruct the full ratings matrix from P and Q.
 * Result[i][j] = P[i] · Q[j]
 *
 * @param P  User matrix (numUsers × factors)
 * @param Q  Item matrix (numItems × factors)
 * @returns  Reconstructed matrix (numUsers × numItems)
 */
export function reconstructMatrix(P: number[][], Q: number[][]): number[][] {
  return P.map((pu) => Q.map((qi) => predictMFRating(pu, qi)));
}

// ─── Hybrid Recommender ───────────────────────────────────────────────────────

/**
 * Hybrid score blending collaborative filtering and content-based scores.
 * If cfScore is null, uses cbScore only.
 *
 * @param cfScore    CF score (or null if unavailable)
 * @param cbScore    Content-based score
 * @param cfWeight   Weight for CF (default 0.6); CB weight = 1 - cfWeight
 * @returns          Blended score
 */
export function hybridScore(cfScore: number | null, cbScore: number, cfWeight = 0.6): number {
  if (cfScore === null) return cbScore;
  return cfWeight * cfScore + (1 - cfWeight) * cbScore;
}

/**
 * Diversity penalty for a new item: average cosine similarity between
 * the new item and all already-selected items.
 * Returns 0 if no items have been selected yet.
 *
 * @param candidates  All candidates (kept for API compatibility)
 * @param selected    Already-selected items
 * @param newItem     Item being evaluated
 * @returns           Penalty in [0, 1]; lower = more diverse
 */
export function diversityPenalty(
  candidates: Array<{ id: string; features: number[] }>,
  selected: Array<{ id: string; features: number[] }>,
  newItem: { id: string; features: number[] }
): number {
  if (selected.length === 0) return 0;

  let totalSim = 0;
  for (const sel of selected) {
    totalSim += cosineSimilarity(sel.features, newItem.features);
  }
  return totalSim / selected.length;
}

/**
 * Greedy diversified top-N selection.
 *
 * At each step, selects the candidate that maximises:
 *   (1 - diversityWeight) * score - diversityWeight * diversityPenalty
 *
 * @param candidates      Scored candidates with feature vectors
 * @param n               Number of items to return (default 10)
 * @param diversityWeight Weight on diversity penalty (default 0.3)
 * @returns               Selected items in selection order, with original scores
 */
export function diversifiedTopN(
  candidates: Array<{ id: string; score: number; features: number[] }>,
  n = 10,
  diversityWeight = 0.3
): Array<{ id: string; score: number }> {
  const remaining = [...candidates];
  const selected: Array<{ id: string; features: number[] }> = [];
  const result: Array<{ id: string; score: number }> = [];

  const limit = Math.min(n, candidates.length);

  while (result.length < limit && remaining.length > 0) {
    let bestIdx = -1;
    let bestVal = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      if (!candidate) continue;
      const penalty = diversityPenalty([], selected, candidate);
      const val = (1 - diversityWeight) * candidate.score - diversityWeight * penalty;
      if (val > bestVal) {
        bestVal = val;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) break;

    const chosen = remaining[bestIdx];
    if (!chosen) break;
    selected.push({ id: chosen.id, features: chosen.features });
    result.push({ id: chosen.id, score: chosen.score });
    remaining.splice(bestIdx, 1);
  }

  return result;
}

// ─── Sports-Specific Recommendation Helpers ───────────────────────────────────

/**
 * Compute affinity score for a pick candidate based on the user's win rate
 * for matching sport+betType combinations.
 * Returns 0.5 if no matching history exists.
 *
 * @param userHistory  Past picks with outcome
 * @param candidate    Candidate pick to evaluate
 * @returns            Win rate in [0,1], or 0.5 if no history
 */
export function pickAffinityScore(
  userHistory: Array<{ sport: string; betType: string; won: boolean }>,
  candidate: { sport: string; betType: string }
): number {
  const matching = userHistory.filter(
    (h) => h.sport === candidate.sport && h.betType === candidate.betType
  );

  if (matching.length === 0) return 0.5;

  const wins = matching.filter((h) => h.won).length;
  return wins / matching.length;
}

/**
 * Build a normalized sport preference vector from engagement history.
 *
 * @param history  Array of {sport, engagementScore} events
 * @param sports   Ordered list of sports defining the vector dimensions
 * @returns        Unit-normalized engagement vector
 */
export function sportPreferenceVector(
  history: Array<{ sport: string; engagementScore: number }>,
  sports: string[]
): number[] {
  const engagement = new Array<number>(sports.length).fill(0);

  for (const { sport, engagementScore } of history) {
    const idx = sports.indexOf(sport);
    if (idx !== -1) {
      engagement[idx] = (engagement[idx] ?? 0) + engagementScore;
    }
  }

  const magnitude = normVec(engagement);
  if (magnitude === 0) return engagement;
  return engagement.map((v) => v / magnitude);
}

/**
 * Compute a bettor profile from their betting history.
 *
 * @param history  Bet outcomes with confidence, win flag, and stake
 * @returns        Summary statistics including sharpness
 */
export function bettorProfile(
  history: Array<{ confidence: number; won: boolean; stake: number }>
): { avgConfidence: number; winRate: number; avgStake: number; sharpness: number } {
  if (history.length === 0) {
    return { avgConfidence: 0, winRate: 0, avgStake: 0, sharpness: 1 };
  }

  const n = history.length;
  const avgConfidence = history.reduce((s, h) => s + h.confidence, 0) / n;
  const winRate = history.filter((h) => h.won).length / n;
  const avgStake = history.reduce((s, h) => s + h.stake, 0) / n;

  // Sharpness: Pearson correlation between confidence and binary win outcome
  if (n < 2) {
    return { avgConfidence, winRate, avgStake, sharpness: 1 };
  }

  const confidences = history.map((h) => h.confidence);
  const outcomes = history.map((h) => (h.won ? 1 : 0));
  const sharpness = pearsonCorrelation(confidences, outcomes);

  return { avgConfidence, winRate, avgStake, sharpness };
}

interface BettorFeatures {
  avgConfidence: number;
  winRate: number;
  avgStake: number;
  sharpness: number;
}

interface PoolMember extends BettorFeatures {
  userId: string;
}

/**
 * Find the k most similar bettors to a given profile using Euclidean distance
 * on normalized features.
 *
 * Features normalized to [0,1] range based on the pool's min/max.
 *
 * @param profile  Target bettor profile
 * @param pool     Pool of bettors to compare against
 * @param k        Number of similar bettors to return (default 5)
 * @returns        Array of userIds sorted by ascending distance
 */
export function similarBettors(
  profile: BettorFeatures,
  pool: PoolMember[],
  k = 5
): string[] {
  if (pool.length === 0) return [];

  // Include target in normalization pool to ensure consistent scaling
  const all: BettorFeatures[] = [profile, ...pool];

  const featureKeys = ["avgConfidence", "winRate", "avgStake", "sharpness"] as const;

  // Compute min/max for normalization
  const mins: Record<string, number> = {};
  const maxs: Record<string, number> = {};
  for (const key of featureKeys) {
    mins[key] = Math.min(...all.map((p) => p[key]));
    maxs[key] = Math.max(...all.map((p) => p[key]));
  }

  const normalize = (p: BettorFeatures): number[] => {
    return featureKeys.map((key) => {
      const minVal = mins[key] ?? 0;
      const maxVal = maxs[key] ?? 0;
      const range = maxVal - minVal;
      if (range === 0) return 0;
      return (p[key] - minVal) / range;
    });
  };

  const targetVec = normalize(profile);

  const distances = pool.map((p) => ({
    userId: p.userId,
    dist: euclideanDistance(targetVec, normalize(p)),
  }));

  distances.sort((a, b) => a.dist - b.dist);
  return distances.slice(0, k).map((d) => d.userId);
}

/**
 * Score picks by trending engagement using a time-decay model.
 *
 * score = views * exp(-lambda * (now_hours - recency_hours))
 *
 * @param views    Map<pickId, viewCount>
 * @param recency  Map<pickId, timestampSeconds>
 * @param lambda   Decay rate (default 0.1)
 * @returns        Sorted array of {pickId, score} desc
 */
export function trendingPicks(
  views: Map<string, number>,
  recency: Map<string, number>,
  lambda = 0.1
): Array<{ pickId: string; score: number }> {
  const nowHours = Date.now() / 1000 / 3600;

  const results: Array<{ pickId: string; score: number }> = [];

  for (const [pickId, viewCount] of views.entries()) {
    const recencyTimestamp = recency.get(pickId);
    if (recencyTimestamp === undefined) continue;

    const recencyHours = recencyTimestamp / 3600;
    const age = nowHours - recencyHours;
    const score = viewCount * Math.exp(-lambda * age);
    results.push({ pickId, score });
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

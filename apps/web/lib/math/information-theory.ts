/**
 * Information theory utilities — pure, zero dependencies.
 *
 * Covers: Shannon entropy, KL divergence, mutual information, cross-entropy,
 * Huffman coding, run-length encoding, channel capacity, and sports-prediction
 * information-theory helpers.
 *
 * All functions are pure (no side effects). No `any` types. No banned phrases.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HuffmanNode {
  symbol?: string;
  weight: number;
  left?: HuffmanNode;
  right?: HuffmanNode;
}

export interface HuffmanCode {
  symbol: string;
  code: string;
  frequency: number;
  bits: number;
}

export interface EntropyResult {
  entropy: number; // bits
  maxEntropy: number;
  normalizedEntropy: number; // 0-1
}

export interface MutualInfoResult {
  mutualInformation: number;
  normalizedMI: number; // NMI = MI/sqrt(H(X)*H(Y))
}

// ─── Internal helpers ────────────────────────────────────────────────────────

const LOG2 = Math.log(2);

function log2(x: number): number {
  return Math.log(x) / LOG2;
}

/** Safe log2: returns 0 for x ≤ 0 (0 × log2(0) = 0 by convention). */
function safeLog2(x: number): number {
  if (x <= 0) return 0;
  return log2(x);
}

// ─── Basic entropy ───────────────────────────────────────────────────────────

/**
 * Shannon entropy of a probability distribution (in bits).
 * H(P) = -sum(p × log2(p))
 * Ignores p=0 terms. Input should sum to ~1.
 */
export function shannonEntropy(probs: number[]): number {
  let h = 0;
  for (const p of probs) {
    if (p <= 0) continue;
    h -= p * safeLog2(p);
  }
  return h;
}

/**
 * Convert counts to probabilities and compute Shannon entropy.
 */
export function empiricalEntropy(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  const probs = counts.map((c) => c / total);
  return shannonEntropy(probs);
}

/**
 * Returns entropy, max entropy (log2(n)), and normalized entropy (0–1).
 */
export function entropyResult(probs: number[]): EntropyResult {
  const n = probs.filter((p) => p > 0).length;
  const e = shannonEntropy(probs);
  const maxE = n <= 1 ? 0 : log2(n);
  const normalizedEntropy = maxE === 0 ? 0 : e / maxE;
  return { entropy: e, maxEntropy: maxE, normalizedEntropy };
}

/**
 * Joint entropy H(X,Y) from a 2D joint probability matrix.
 * H(X,Y) = -sum_i,j p[i][j] × log2(p[i][j])
 */
export function jointEntropy(jointProbs: number[][]): number {
  let h = 0;
  for (const row of jointProbs) {
    for (const p of row) {
      if (p <= 0) continue;
      h -= p * safeLog2(p);
    }
  }
  return h;
}

/**
 * Conditional entropy H(Y|X) = H(X,Y) - H(X).
 * Marginals for X are derived by summing rows of the joint matrix.
 */
export function conditionalEntropy(jointProbs: number[][]): number {
  if (jointProbs.length === 0) return 0;
  const margX = jointProbs.map((row) => row.reduce((a, b) => a + b, 0));
  return jointEntropy(jointProbs) - shannonEntropy(margX);
}

/**
 * KL divergence D(P||Q) = sum(p × log2(p/q)) in bits.
 * Returns Infinity if q[i]=0 and p[i]>0.
 * Skips terms where p[i]=0.
 */
export function relativeEntropy(p: number[], q: number[]): number {
  let kl = 0;
  for (let i = 0; i < p.length; i++) {
    const pi = p[i] ?? 0;
    const qi = q[i] ?? 0;
    if (pi <= 0) continue;
    if (qi <= 0) return Infinity;
    kl += pi * log2(pi / qi);
  }
  return kl;
}

/**
 * Cross entropy H(P,Q) = -sum(p × log2(q)).
 * Returns Infinity if q[i]=0 and p[i]>0. Skips where p[i]=0.
 */
export function crossEntropy(p: number[], q: number[]): number {
  let ce = 0;
  for (let i = 0; i < p.length; i++) {
    const pi = p[i] ?? 0;
    const qi = q[i] ?? 0;
    if (pi <= 0) continue;
    if (qi <= 0) return Infinity;
    ce -= pi * safeLog2(qi);
  }
  return ce;
}

/**
 * Jensen-Shannon divergence: JSD(P||Q) = 0.5×KL(P||M) + 0.5×KL(Q||M)
 * where M = (P+Q)/2. Always finite and in [0,1] (log2 base).
 */
export function jensenShannonDivergence(p: number[], q: number[]): number {
  const len = Math.max(p.length, q.length);
  const m = Array.from({ length: len }, (_, i) => ((p[i] ?? 0) + (q[i] ?? 0)) / 2);
  const pPadded = Array.from({ length: len }, (_, i) => p[i] ?? 0);
  const qPadded = Array.from({ length: len }, (_, i) => q[i] ?? 0);
  return 0.5 * relativeEntropy(pPadded, m) + 0.5 * relativeEntropy(qPadded, m);
}

/**
 * Jensen-Shannon distance: sqrt(JSD). This is a proper metric.
 */
export function jensenShannonDistance(p: number[], q: number[]): number {
  return Math.sqrt(jensenShannonDivergence(p, q));
}

// ─── Mutual information ──────────────────────────────────────────────────────

/**
 * Mutual information MI(X;Y) = H(X) + H(Y) - H(X,Y).
 * jointProbs is a 2D matrix; rows=X values, cols=Y values.
 */
export function mutualInformation(jointProbs: number[][]): number {
  if (jointProbs.length === 0) return 0;
  const cols = jointProbs[0]?.length ?? 0;
  const margX = jointProbs.map((row) => row.reduce((a, b) => a + b, 0));
  const margY = Array.from({ length: cols }, (_, j) =>
    jointProbs.reduce((acc, row) => acc + (row[j] ?? 0), 0),
  );
  return shannonEntropy(margX) + shannonEntropy(margY) - jointEntropy(jointProbs);
}

/**
 * Returns MI and NMI = MI / sqrt(H(X) × H(Y)).
 */
export function mutualInfoResult(jointProbs: number[][]): MutualInfoResult {
  if (jointProbs.length === 0) return { mutualInformation: 0, normalizedMI: 0 };
  const cols = jointProbs[0]?.length ?? 0;
  const margX = jointProbs.map((row) => row.reduce((a, b) => a + b, 0));
  const margY = Array.from({ length: cols }, (_, j) =>
    jointProbs.reduce((acc, row) => acc + (row[j] ?? 0), 0),
  );
  const hx = shannonEntropy(margX);
  const hy = shannonEntropy(margY);
  const mi = hx + hy - jointEntropy(jointProbs);
  const denom = Math.sqrt(hx * hy);
  const normalizedMI = denom === 0 ? 0 : mi / denom;
  return { mutualInformation: Math.max(0, mi), normalizedMI: Math.max(0, normalizedMI) };
}

/**
 * Discretize continuous x,y into bins and build a normalized joint probability table.
 */
export function empiricalJointProbs(
  x: number[],
  y: number[],
  xBins: number,
  yBins: number,
): number[][] {
  if (x.length === 0 || y.length === 0) return [];
  const n = Math.min(x.length, y.length);
  const xMin = Math.min(...x);
  const xMax = Math.max(...x);
  const yMin = Math.min(...y);
  const yMax = Math.max(...y);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  const table: number[][] = Array.from({ length: xBins }, () => Array(yBins).fill(0));

  for (let k = 0; k < n; k++) {
    const xi = Math.min(xBins - 1, Math.floor(((x[k]! - xMin) / xRange) * xBins));
    const yi = Math.min(yBins - 1, Math.floor(((y[k]! - yMin) / yRange) * yBins));
    table[xi]![yi]! += 1;
  }

  // Normalize
  return table.map((row) => row.map((c) => c / n));
}

/**
 * Estimate mutual information from continuous samples by discretizing into bins.
 */
export function mutualInfoFromSamples(x: number[], y: number[], bins = 10): number {
  const joint = empiricalJointProbs(x, y, bins, bins);
  return mutualInformation(joint);
}

/**
 * Conditional MI: CMI(X;Y|Z) = H(X|Z) + H(Y|Z) - H(X,Y|Z)
 * Approximated from 3-way joint distribution p[x][y][z].
 */
export function conditionalMI(jointXYZ: number[][][]): number {
  if (jointXYZ.length === 0) return 0;
  const xDim = jointXYZ.length;
  const yDim = jointXYZ[0]?.length ?? 0;
  const zDim = jointXYZ[0]?.[0]?.length ?? 0;

  // Marginalize to get p[x][z], p[y][z], p[x][y][z], p[z]
  const pXZ: number[][] = Array.from({ length: xDim }, () => Array(zDim).fill(0));
  const pYZ: number[][] = Array.from({ length: yDim }, () => Array(zDim).fill(0));
  const pXYZ: number[][][] = jointXYZ;
  const pZ: number[] = Array(zDim).fill(0);

  for (let xi = 0; xi < xDim; xi++) {
    for (let yi = 0; yi < yDim; yi++) {
      for (let zi = 0; zi < zDim; zi++) {
        const v = jointXYZ[xi]?.[yi]?.[zi] ?? 0;
        pXZ[xi]![zi]! += v;
        pYZ[yi]![zi]! += v;
        pZ[zi]! += v;
      }
    }
  }

  // H(X|Z) = H(X,Z) - H(Z)
  const hXZ = jointEntropy(pXZ);
  const hYZ = jointEntropy(pYZ);
  const hZ = shannonEntropy(pZ);

  // H(X,Y|Z) = H(X,Y,Z) - H(Z)
  let hXYZ = 0;
  for (let xi = 0; xi < xDim; xi++) {
    for (let yi = 0; yi < yDim; yi++) {
      for (let zi = 0; zi < zDim; zi++) {
        const v = pXYZ[xi]?.[yi]?.[zi] ?? 0;
        if (v <= 0) continue;
        hXYZ -= v * safeLog2(v);
      }
    }
  }

  // CMI(X;Y|Z) = H(X|Z) + H(Y|Z) - H(X,Y|Z)
  const hXgivenZ = hXZ - hZ;
  const hYgivenZ = hYZ - hZ;
  const hXYgivenZ = hXYZ - hZ;

  return Math.max(0, hXgivenZ + hYgivenZ - hXYgivenZ);
}

// ─── Coding theory — Huffman ──────────────────────────────────────────────────

/** Min-heap helper: insert into heap. */
function heapPush(heap: HuffmanNode[], node: HuffmanNode): void {
  heap.push(node);
  let i = heap.length - 1;
  while (i > 0) {
    const parent = Math.floor((i - 1) / 2);
    if ((heap[parent]?.weight ?? Infinity) <= (heap[i]?.weight ?? Infinity)) break;
    [heap[parent], heap[i]] = [heap[i]!, heap[parent]!];
    i = parent;
  }
}

/** Min-heap helper: extract minimum weight node. */
function heapPop(heap: HuffmanNode[]): HuffmanNode | undefined {
  if (heap.length === 0) return undefined;
  const top = heap[0]!;
  const last = heap.pop()!;
  if (heap.length === 0) return top;
  heap[0] = last;
  let i = 0;
  while (true) {
    const left = 2 * i + 1;
    const right = 2 * i + 2;
    let smallest = i;
    if (left < heap.length && (heap[left]?.weight ?? Infinity) < (heap[smallest]?.weight ?? Infinity)) {
      smallest = left;
    }
    if (right < heap.length && (heap[right]?.weight ?? Infinity) < (heap[smallest]?.weight ?? Infinity)) {
      smallest = right;
    }
    if (smallest === i) break;
    [heap[i], heap[smallest]] = [heap[smallest]!, heap[i]!];
    i = smallest;
  }
  return top;
}

/**
 * Build a Huffman tree from a frequency map using an array-based min-heap.
 */
export function buildHuffmanTree(frequencies: Record<string, number>): HuffmanNode {
  const heap: HuffmanNode[] = [];
  for (const [symbol, weight] of Object.entries(frequencies)) {
    heapPush(heap, { symbol, weight });
  }
  if (heap.length === 0) return { weight: 0 };
  while (heap.length > 1) {
    const left = heapPop(heap)!;
    const right = heapPop(heap)!;
    heapPush(heap, { weight: left.weight + right.weight, left, right });
  }
  return heap[0]!;
}

/**
 * Traverse the Huffman tree and extract symbol→code mappings.
 * Left branch = '0', right branch = '1'.
 */
export function huffmanCodes(tree: HuffmanNode): HuffmanCode[] {
  const results: HuffmanCode[] = [];

  function traverse(node: HuffmanNode, prefix: string): void {
    if (node.symbol !== undefined) {
      // Leaf node
      results.push({
        symbol: node.symbol,
        code: prefix.length === 0 ? "0" : prefix, // single-symbol edge case
        frequency: node.weight,
        bits: prefix.length === 0 ? 1 : prefix.length,
      });
      return;
    }
    if (node.left) traverse(node.left, prefix + "0");
    if (node.right) traverse(node.right, prefix + "1");
  }

  traverse(tree, "");
  return results;
}

/**
 * Huffman-encode a string.
 * Returns per-symbol codes, the encoded bit string, and compression ratio.
 * compressionRatio = encodedBits / (text.length × 8)
 */
export function huffmanEncode(text: string): {
  codes: Record<string, string>;
  encoded: string;
  compressionRatio: number;
} {
  if (text.length === 0) return { codes: {}, encoded: "", compressionRatio: 1 };

  const freq: Record<string, number> = {};
  for (const ch of text) {
    freq[ch] = (freq[ch] ?? 0) + 1;
  }

  const tree = buildHuffmanTree(freq);
  const codeList = huffmanCodes(tree);
  const codes: Record<string, string> = {};
  for (const c of codeList) {
    codes[c.symbol] = c.code;
  }

  let encoded = "";
  for (const ch of text) {
    encoded += codes[ch] ?? "";
  }

  const compressionRatio = encoded.length / (text.length * 8);
  return { codes, encoded, compressionRatio };
}

/**
 * Average code length = sum(freq/total × bits).
 */
export function averageCodeLength(codes: HuffmanCode[], totalSymbols: number): number {
  if (totalSymbols === 0) return 0;
  return codes.reduce((acc, c) => acc + (c.frequency / totalSymbols) * c.bits, 0);
}

/**
 * Huffman efficiency = entropy / averageCodeLength.
 * Should be ≤ 1, ideally close to 1.
 */
export function huffmanEfficiency(
  codes: HuffmanCode[],
  totalSymbols: number,
  entropy: number,
): number {
  const avgLen = averageCodeLength(codes, totalSymbols);
  if (avgLen === 0) return 1;
  return entropy / avgLen;
}

// ─── Information content ─────────────────────────────────────────────────────

/**
 * Self-information (surprisal) of event with probability p.
 * I(p) = log2(1/p) = -log2(p)
 */
export function selfInformation(p: number): number {
  if (p <= 0) return Infinity;
  if (p >= 1) return 0;
  return -safeLog2(p);
}

/**
 * Information gain used in decision trees.
 * IG = H(parent) - sum(|child|/|parent| × H(child))
 */
export function informationGain(parentCounts: number[], childCountSets: number[][]): number {
  const parentTotal = parentCounts.reduce((a, b) => a + b, 0);
  if (parentTotal === 0) return 0;
  const parentEntropy = empiricalEntropy(parentCounts);

  let weightedChildEntropy = 0;
  for (const childCounts of childCountSets) {
    const childTotal = childCounts.reduce((a, b) => a + b, 0);
    const weight = childTotal / parentTotal;
    weightedChildEntropy += weight * empiricalEntropy(childCounts);
  }
  return parentEntropy - weightedChildEntropy;
}

/**
 * Gini impurity = 1 - sum(p²).
 */
export function giniImpurity(probs: number[]): number {
  return 1 - probs.reduce((acc, p) => acc + p * p, 0);
}

/** Gini impurity from counts (converts to probs internally). */
function giniFromCounts(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  const probs = counts.map((c) => c / total);
  return giniImpurity(probs);
}

/**
 * Gini information gain: reduction in Gini impurity from a split.
 */
export function giniInformationGain(parentCounts: number[], childCountSets: number[][]): number {
  const parentTotal = parentCounts.reduce((a, b) => a + b, 0);
  if (parentTotal === 0) return 0;
  const parentGini = giniFromCounts(parentCounts);

  let weightedChildGini = 0;
  for (const childCounts of childCountSets) {
    const childTotal = childCounts.reduce((a, b) => a + b, 0);
    const weight = childTotal / parentTotal;
    weightedChildGini += weight * giniFromCounts(childCounts);
  }
  return parentGini - weightedChildGini;
}

/**
 * Information gain ratio = IG / intrinsicInfo.
 * Intrinsic info = -sum(|child|/|parent| × log2(|child|/|parent|))
 */
export function infoGainRatio(parentCounts: number[], childCountSets: number[][]): number {
  const parentTotal = parentCounts.reduce((a, b) => a + b, 0);
  if (parentTotal === 0) return 0;

  const ig = informationGain(parentCounts, childCountSets);

  let intrinsicInfo = 0;
  for (const childCounts of childCountSets) {
    const childTotal = childCounts.reduce((a, b) => a + b, 0);
    if (childTotal === 0) continue;
    const weight = childTotal / parentTotal;
    intrinsicInfo -= weight * log2(weight);
  }

  if (intrinsicInfo === 0) return 0;
  return ig / intrinsicInfo;
}

// ─── Channel capacity ─────────────────────────────────────────────────────────

/**
 * Binary entropy function H(p) = -p×log2(p) - (1-p)×log2(1-p).
 * Returns 0 for p=0 or p=1.
 */
export function binaryEntropy(p: number): number {
  if (p <= 0 || p >= 1) return 0;
  return -(p * safeLog2(p) + (1 - p) * safeLog2(1 - p));
}

/**
 * Binary symmetric channel capacity = 1 - H(crossoverProb).
 */
export function binarySymmetricChannel(crossoverProb: number): number {
  return 1 - binaryEntropy(crossoverProb);
}

/**
 * Approximate channel capacity for a channel with transition matrix.
 * Rows = input symbols, cols = output symbols.
 * Approximated using uniform input distribution: MI(X;Y) for uniform X.
 */
export function channelCapacity(transitionMatrix: number[][]): number {
  if (transitionMatrix.length === 0) return 0;
  const numInputs = transitionMatrix.length;
  const numOutputs = transitionMatrix[0]?.length ?? 0;
  if (numOutputs === 0) return 0;

  const pInput = 1 / numInputs;

  // Build joint probability table: p[i][j] = pInput × transitionMatrix[i][j]
  const joint: number[][] = transitionMatrix.map((row) => row.map((t) => pInput * t));
  return mutualInformation(joint);
}

// ─── Compression utilities ────────────────────────────────────────────────────

/**
 * Run-length encode a string: consecutive repeated characters are grouped.
 */
export function runLengthEncode(data: string): Array<{ symbol: string; count: number }> {
  if (data.length === 0) return [];
  const result: Array<{ symbol: string; count: number }> = [];
  let current = data[0]!;
  let count = 1;
  for (let i = 1; i < data.length; i++) {
    if (data[i] === current) {
      count++;
    } else {
      result.push({ symbol: current, count });
      current = data[i]!;
      count = 1;
    }
  }
  result.push({ symbol: current, count });
  return result;
}

/**
 * Decode a run-length encoded array back to a string.
 */
export function runLengthDecode(encoded: Array<{ symbol: string; count: number }>): string {
  return encoded.map(({ symbol, count }) => symbol.repeat(count)).join("");
}

/**
 * Compression ratio = originalBits / compressedBits. >1 means compression achieved.
 */
export function compressionRatio(originalBits: number, compressedBits: number): number {
  if (compressedBits === 0) return Infinity;
  return originalBits / compressedBits;
}

/** Convert bytes to bits. */
export function bytesToBits(bytes: number): number {
  return bytes * 8;
}

/** Convert bits to bytes. By default rounds up (ceiling). */
export function bitsToBytes(bits: number, roundUp = true): number {
  const exact = bits / 8;
  return roundUp ? Math.ceil(exact) : exact;
}

// ─── Sports prediction information theory ────────────────────────────────────

/**
 * Entropy of model confidence scores.
 * Treats confidence/100 as a probability for each pick; measures uncertainty.
 */
export function predictionEntropy(confidenceScores: number[]): number {
  if (confidenceScores.length === 0) return 0;
  const probs = confidenceScores.map((c) => c / 100);
  return shannonEntropy(probs);
}

/**
 * Entropy of a betting market's implied probability distribution.
 * e.g. [homeWin, draw, awayWin]
 */
export function betMarketEntropy(impliedProbs: number[]): number {
  return shannonEntropy(impliedProbs);
}

/**
 * Information edge between model and market for a binary event.
 * KL divergence: modelProb × log2(modelProb/marketProb) + (1-m) × log2((1-m)/(1-k))
 */
export function informationEdge(modelProb: number, marketProb: number): number {
  if (modelProb <= 0 || marketProb <= 0) return Infinity;
  if (modelProb >= 1 || marketProb >= 1) {
    // Handle edge cases carefully
    if (modelProb >= 1 && marketProb >= 1) return 0;
    if (modelProb >= 1) return Infinity;
    if (marketProb >= 1) return Infinity;
  }
  const term1 = modelProb * log2(modelProb / marketProb);
  const term2 = (1 - modelProb) * log2((1 - modelProb) / (1 - marketProb));
  return term1 + term2;
}

/**
 * Entropy of actual outcome distribution weighted by calibration bucket counts.
 * Lower = more calibrated (predicted entropy close to actual).
 */
export function expectedCalibrationEntropy(
  calibrationBuckets: { predicted: number; actual: number; count: number }[],
): number {
  const totalCount = calibrationBuckets.reduce((a, b) => a + b.count, 0);
  if (totalCount === 0) return 0;

  // Weighted entropy of the actual outcome distribution
  let h = 0;
  for (const bucket of calibrationBuckets) {
    const weight = bucket.count / totalCount;
    const p = bucket.actual;
    if (p > 0 && p < 1) {
      h -= weight * (p * safeLog2(p) + (1 - p) * safeLog2(1 - p));
    }
    // p=0 or p=1 contribute 0 entropy
  }
  return h;
}

/**
 * Pick diversity score = normalized entropy of sport distribution × normalized entropy of pick type distribution.
 * 0 = all same, 1 = maximally diverse.
 */
export function pickDiversityScore(picks: { sport: string; pickType: string }[]): number {
  if (picks.length === 0) return 0;

  // Count sports
  const sportCounts: Record<string, number> = {};
  const pickTypeCounts: Record<string, number> = {};
  for (const pick of picks) {
    sportCounts[pick.sport] = (sportCounts[pick.sport] ?? 0) + 1;
    pickTypeCounts[pick.pickType] = (pickTypeCounts[pick.pickType] ?? 0) + 1;
  }

  const sportProbs = Object.values(sportCounts).map((c) => c / picks.length);
  const pickTypeProbs = Object.values(pickTypeCounts).map((c) => c / picks.length);

  const nSports = sportProbs.length;
  const nTypes = pickTypeProbs.length;

  const sportEntropy = shannonEntropy(sportProbs);
  const pickTypeEntropy = shannonEntropy(pickTypeProbs);

  const maxSportEntropy = nSports <= 1 ? 0 : log2(nSports);
  const maxTypeEntropy = nTypes <= 1 ? 0 : log2(nTypes);

  const normSport = maxSportEntropy === 0 ? 0 : sportEntropy / maxSportEntropy;
  const normType = maxTypeEntropy === 0 ? 0 : pickTypeEntropy / maxTypeEntropy;

  return normSport * normType;
}

// ─── Legacy aliases (for backward compatibility) ─────────────────────────────

/** @deprecated Use shannonEntropy */
export const entropy = shannonEntropy;

/** @deprecated Use relativeEntropy */
export const klDivergence = relativeEntropy;

/** @deprecated Use jensenShannonDivergence */
export const jsDivergence = jensenShannonDivergence;

/** @deprecated Use selfInformation */
export const surprisal = selfInformation;

/** Normalize an array of non-negative numbers to sum to 1. */
export function normalize(probs: readonly number[]): number[] {
  const sum = probs.reduce((a, b) => a + b, 0);
  if (sum === 0) {
    const n = probs.length;
    return n === 0 ? [] : (Array(n).fill(1 / n) as number[]);
  }
  return probs.map((p) => p / sum);
}

/** Maximum possible entropy for n outcomes: log2(n). */
export function maxEntropy(n: number): number {
  if (n <= 1) return 0;
  return log2(n);
}

/** Perplexity: 2^(-mean(log2(p_i))) for a sequence of probabilities. */
export function perplexity(probs: readonly number[]): number {
  if (probs.length === 0) return 1;
  if (probs.some((p) => p <= 0)) return Infinity;
  const avgLogProb = probs.reduce((acc, p) => acc + safeLog2(p), 0) / probs.length;
  return Math.pow(2, -avgLogProb);
}

/** Brier score: mean squared error between predicted probs and binary outcomes. */
export function brier(predicted: readonly number[], outcomes: readonly (0 | 1)[]): number {
  if (predicted.length !== outcomes.length) {
    throw new Error(
      `brier: arrays must be same length (got ${predicted.length} and ${outcomes.length})`,
    );
  }
  if (predicted.length === 0) return 0;
  const sse = predicted.reduce((acc, p, i) => {
    const diff = p - (outcomes[i] ?? 0);
    return acc + diff * diff;
  }, 0);
  return sse / predicted.length;
}

/** Log loss using natural log: -(1/n) * sum(o*ln(p) + (1-o)*ln(1-p)) */
export function logLoss(predicted: readonly number[], outcomes: readonly (0 | 1)[]): number {
  if (predicted.length !== outcomes.length) {
    throw new Error(
      `logLoss: arrays must be same length (got ${predicted.length} and ${outcomes.length})`,
    );
  }
  if (predicted.length === 0) return 0;
  const EPS_CLIP = 1e-15;
  const sum = predicted.reduce((acc, p, i) => {
    const clipped = Math.max(EPS_CLIP, Math.min(1 - EPS_CLIP, p));
    const o = outcomes[i] ?? 0;
    return acc + o * Math.log(clipped) + (1 - o) * Math.log(1 - clipped);
  }, 0);
  return -sum / predicted.length;
}

/** Expected Calibration Error (ECE). */
export function calibrationError(
  predicted: readonly number[],
  outcomes: readonly (0 | 1)[],
  bins = 10,
): number {
  if (predicted.length !== outcomes.length) {
    throw new Error(
      `calibrationError: arrays must be same length (got ${predicted.length} and ${outcomes.length})`,
    );
  }
  if (predicted.length === 0) return 0;
  const n = predicted.length;
  const binPreds: number[][] = Array.from({ length: bins }, () => []);
  const binOutcomes: number[][] = Array.from({ length: bins }, () => []);
  for (let i = 0; i < n; i++) {
    const p = predicted[i]!;
    const o = outcomes[i]!;
    const binIdx = Math.min(bins - 1, Math.floor(p * bins));
    binPreds[binIdx]!.push(p);
    binOutcomes[binIdx]!.push(o);
  }
  let ece = 0;
  for (let b = 0; b < bins; b++) {
    const count = binPreds[b]!.length;
    if (count === 0) continue;
    const meanPred = binPreds[b]!.reduce((a, v) => a + v, 0) / count;
    const meanOutcome = binOutcomes[b]!.reduce((a, v) => a + v, 0) / count;
    ece += Math.abs(meanPred - meanOutcome) * (count / n);
  }
  return ece;
}

/** Normalized mutual information: NMI = 2 × MI / (H(X) + H(Y)) */
export function normalizedMutualInformation(joint: readonly (readonly number[])[]): number {
  if (joint.length === 0) return 0;
  const cols = joint[0]!.length;
  const margX = joint.map((row) => row.reduce((a, b) => a + b, 0));
  const margY = Array.from({ length: cols }, (_, j) =>
    joint.reduce((acc, row) => acc + (row[j] ?? 0), 0),
  );
  const hx = shannonEntropy(margX);
  const hy = shannonEntropy(margY);
  const denom = hx + hy;
  if (denom === 0) return 0;
  const mi = mutualInformation(joint.map((row) => Array.from(row)));
  if (mi <= 0) return 0;
  return (2 * mi) / denom;
}

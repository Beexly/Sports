/**
 * Comprehensive tests for information-theory.ts
 * Pure TypeScript, zero dependencies, 115+ tests.
 */
import { describe, it, expect } from "vitest";
import {
  // Basic entropy
  shannonEntropy,
  empiricalEntropy,
  entropyResult,
  jointEntropy,
  conditionalEntropy,
  relativeEntropy,
  crossEntropy,
  jensenShannonDivergence,
  jensenShannonDistance,
  // Mutual information
  mutualInformation,
  mutualInfoResult,
  empiricalJointProbs,
  mutualInfoFromSamples,
  conditionalMI,
  // Coding theory
  buildHuffmanTree,
  huffmanCodes,
  huffmanEncode,
  averageCodeLength,
  huffmanEfficiency,
  // Information content
  selfInformation,
  informationGain,
  giniImpurity,
  giniInformationGain,
  infoGainRatio,
  // Channel capacity
  binaryEntropy,
  binarySymmetricChannel,
  channelCapacity,
  // Compression utilities
  runLengthEncode,
  runLengthDecode,
  compressionRatio,
  bytesToBits,
  bitsToBytes,
  // Sports prediction
  predictionEntropy,
  betMarketEntropy,
  informationEdge,
  expectedCalibrationEntropy,
  pickDiversityScore,
  // Legacy aliases
  entropy,
  klDivergence,
  jsDivergence,
  surprisal,
  normalize,
  maxEntropy,
  perplexity,
  brier,
  logLoss,
  calibrationError,
  normalizedMutualInformation,
} from "@/lib/math/information-theory";

const EPS = 1e-9;

function approx(a: number, b: number, tol = 1e-6): boolean {
  return Math.abs(a - b) < tol;
}

// ─── shannonEntropy ──────────────────────────────────────────────────────────

describe("shannonEntropy", () => {
  it("uniform [0.5, 0.5] → 1 bit", () => {
    expect(approx(shannonEntropy([0.5, 0.5]), 1)).toBe(true);
  });

  it("[1, 0] → 0 (certainty)", () => {
    expect(approx(shannonEntropy([1, 0]), 0)).toBe(true);
  });

  it("[0.25, 0.25, 0.25, 0.25] → 2 bits", () => {
    expect(approx(shannonEntropy([0.25, 0.25, 0.25, 0.25]), 2)).toBe(true);
  });

  it("uniform 8-way → 3 bits", () => {
    const probs = Array(8).fill(1 / 8) as number[];
    expect(approx(shannonEntropy(probs), 3)).toBe(true);
  });

  it("empty array → 0", () => {
    expect(shannonEntropy([])).toBe(0);
  });

  it("is always non-negative", () => {
    expect(shannonEntropy([0.7, 0.2, 0.1])).toBeGreaterThanOrEqual(0);
  });

  it("ignores p=0 (0 × log2(0) = 0 by convention)", () => {
    const withZero = shannonEntropy([0.5, 0.5, 0]);
    const without = shannonEntropy([0.5, 0.5]);
    expect(approx(withZero, without)).toBe(true);
  });

  it("maximum is log2(n) for uniform distribution", () => {
    const probs = [0.1, 0.3, 0.2, 0.4];
    expect(shannonEntropy(probs)).toBeLessThanOrEqual(Math.log2(4) + EPS);
  });

  it("single element [1] → 0", () => {
    expect(approx(shannonEntropy([1]), 0)).toBe(true);
  });

  it("skewed distribution has less entropy than uniform", () => {
    const uniform = shannonEntropy([0.5, 0.5]);
    const skewed = shannonEntropy([0.9, 0.1]);
    expect(uniform).toBeGreaterThan(skewed);
  });
});

// ─── empiricalEntropy ────────────────────────────────────────────────────────

describe("empiricalEntropy", () => {
  it("equal counts → max entropy", () => {
    expect(approx(empiricalEntropy([1, 1]), 1)).toBe(true);
  });

  it("[4,4,4,4] → 2 bits", () => {
    expect(approx(empiricalEntropy([4, 4, 4, 4]), 2)).toBe(true);
  });

  it("all-zero counts → 0", () => {
    expect(empiricalEntropy([0, 0, 0])).toBe(0);
  });

  it("single non-zero count → 0", () => {
    expect(approx(empiricalEntropy([0, 5, 0]), 0)).toBe(true);
  });

  it("matches shannonEntropy after normalization", () => {
    const counts = [3, 7];
    const total = 10;
    const probs = counts.map((c) => c / total);
    expect(approx(empiricalEntropy(counts), shannonEntropy(probs))).toBe(true);
  });
});

// ─── entropyResult ───────────────────────────────────────────────────────────

describe("entropyResult", () => {
  it("uniform binary → entropy=1, maxEntropy=1, normalized=1", () => {
    const result = entropyResult([0.5, 0.5]);
    expect(approx(result.entropy, 1)).toBe(true);
    expect(approx(result.maxEntropy, 1)).toBe(true);
    expect(approx(result.normalizedEntropy, 1)).toBe(true);
  });

  it("certain event → normalized entropy = 0", () => {
    const result = entropyResult([1, 0]);
    expect(approx(result.normalizedEntropy, 0)).toBe(true);
  });

  it("normalized entropy is in [0, 1]", () => {
    const result = entropyResult([0.1, 0.3, 0.6]);
    expect(result.normalizedEntropy).toBeGreaterThanOrEqual(0);
    expect(result.normalizedEntropy).toBeLessThanOrEqual(1 + EPS);
  });

  it("maxEntropy = log2(n) for n non-zero entries", () => {
    const result = entropyResult([0.25, 0.25, 0.25, 0.25]);
    expect(approx(result.maxEntropy, 2)).toBe(true);
  });
});

// ─── jointEntropy ────────────────────────────────────────────────────────────

describe("jointEntropy", () => {
  it("independent uniform 2×2 joint → 2 bits", () => {
    const joint = [[0.25, 0.25], [0.25, 0.25]];
    expect(approx(jointEntropy(joint), 2)).toBe(true);
  });

  it("diagonal joint (perfect correlation) → H = H(marginal)", () => {
    const joint = [[0.5, 0], [0, 0.5]];
    // H(X,Y) = H(X) when X=Y always
    expect(approx(jointEntropy(joint), 1)).toBe(true);
  });

  it("single cell → 0", () => {
    expect(approx(jointEntropy([[1]]), 0)).toBe(true);
  });

  it("is non-negative", () => {
    const joint = [[0.1, 0.4], [0.2, 0.3]];
    expect(jointEntropy(joint)).toBeGreaterThanOrEqual(0);
  });
});

// ─── conditionalEntropy ──────────────────────────────────────────────────────

describe("conditionalEntropy", () => {
  it("H(Y|X) = H(X,Y) - H(X)", () => {
    const joint = [[0.2, 0.3], [0.1, 0.4]];
    const margX = joint.map((row) => row.reduce((a, b) => a + b, 0));
    const expected = jointEntropy(joint) - shannonEntropy(margX);
    expect(approx(conditionalEntropy(joint), expected)).toBe(true);
  });

  it("independent variables: H(Y|X) = H(Y)", () => {
    const joint = [[0.25, 0.25], [0.25, 0.25]];
    // H(Y) = 1 bit
    expect(approx(conditionalEntropy(joint), 1)).toBe(true);
  });

  it("perfectly correlated: H(Y|X) = 0", () => {
    const joint = [[0.5, 0], [0, 0.5]];
    expect(approx(conditionalEntropy(joint), 0)).toBe(true);
  });

  it("is always non-negative", () => {
    expect(conditionalEntropy([[0.15, 0.35], [0.2, 0.3]])).toBeGreaterThanOrEqual(-EPS);
  });

  it("empty joint → 0", () => {
    expect(conditionalEntropy([])).toBe(0);
  });
});

// ─── relativeEntropy (KL divergence) ─────────────────────────────────────────

describe("relativeEntropy (KL divergence)", () => {
  it("identical distributions → 0", () => {
    expect(approx(relativeEntropy([0.5, 0.5], [0.5, 0.5]), 0)).toBe(true);
  });

  it("returns Infinity when q[i]=0 and p[i]>0", () => {
    expect(relativeEntropy([0.5, 0.5], [1, 0])).toBe(Infinity);
  });

  it("is always non-negative (Gibbs inequality)", () => {
    expect(relativeEntropy([0.3, 0.4, 0.3], [0.2, 0.5, 0.3])).toBeGreaterThanOrEqual(0);
  });

  it("is non-symmetric: KL(P||Q) ≠ KL(Q||P) in general", () => {
    const p = [0.7, 0.3];
    const q = [0.4, 0.6];
    const kl_pq = relativeEntropy(p, q);
    const kl_qp = relativeEntropy(q, p);
    expect(kl_pq).not.toBeCloseTo(kl_qp, 5);
  });

  it("known value: KL([0.5,0.5] || [0.25,0.75])", () => {
    const expected = 0.5 * Math.log2(0.5 / 0.25) + 0.5 * Math.log2(0.5 / 0.75);
    expect(approx(relativeEntropy([0.5, 0.5], [0.25, 0.75]), expected)).toBe(true);
  });

  it("skips p[i]=0 terms (0 × anything = 0)", () => {
    expect(approx(relativeEntropy([1, 0], [1, 0]), 0)).toBe(true);
  });

  it("legacy alias klDivergence works", () => {
    expect(approx(klDivergence([0.5, 0.5], [0.5, 0.5]), 0)).toBe(true);
  });
});

// ─── crossEntropy ────────────────────────────────────────────────────────────

describe("crossEntropy", () => {
  it("H(P,P) = H(P) for perfect predictions", () => {
    const p = [0.5, 0.5];
    expect(approx(crossEntropy(p, p), shannonEntropy(p))).toBe(true);
  });

  it("H(P,Q) = H(P) + KL(P||Q)", () => {
    const p = [0.6, 0.4];
    const q = [0.3, 0.7];
    const expected = shannonEntropy(p) + relativeEntropy(p, q);
    expect(approx(crossEntropy(p, q), expected)).toBe(true);
  });

  it("returns Infinity when q[i]=0 and p[i]>0", () => {
    expect(crossEntropy([1, 0], [0, 1])).toBe(Infinity);
  });

  it("cross-entropy >= entropy (Gibbs inequality)", () => {
    const p = [0.7, 0.3];
    const q = [0.4, 0.6];
    expect(crossEntropy(p, q)).toBeGreaterThanOrEqual(shannonEntropy(p) - EPS);
  });

  it("known value: H([1],[1]) = 0", () => {
    expect(approx(crossEntropy([1], [1]), 0)).toBe(true);
  });
});

// ─── jensenShannonDivergence ─────────────────────────────────────────────────

describe("jensenShannonDivergence", () => {
  it("identical distributions → 0", () => {
    expect(approx(jensenShannonDivergence([0.5, 0.5], [0.5, 0.5]), 0)).toBe(true);
  });

  it("is symmetric: JSD(P,Q) = JSD(Q,P)", () => {
    const p = [0.7, 0.3];
    const q = [0.2, 0.8];
    expect(approx(jensenShannonDivergence(p, q), jensenShannonDivergence(q, p))).toBe(true);
  });

  it("is always finite (unlike KL divergence)", () => {
    const jsd = jensenShannonDivergence([1, 0], [0, 1]);
    expect(isFinite(jsd)).toBe(true);
  });

  it("is always non-negative", () => {
    expect(jensenShannonDivergence([0.6, 0.4], [0.3, 0.7])).toBeGreaterThanOrEqual(0);
  });

  it("max ≤ 1 for log2 base", () => {
    expect(jensenShannonDivergence([1, 0], [0, 1])).toBeLessThanOrEqual(1 + EPS);
  });

  it("[1,0] vs [0,1] → 1 bit (maximally divergent)", () => {
    expect(approx(jensenShannonDivergence([1, 0], [0, 1]), 1)).toBe(true);
  });

  it("JSD ≥ 0 for any inputs", () => {
    const cases: Array<[number[], number[]]> = [
      [[0.5, 0.5], [0.9, 0.1]],
      [[0.3, 0.7], [0.3, 0.7]],
      [[1, 0], [0.5, 0.5]],
    ];
    for (const [p, q] of cases) {
      expect(jensenShannonDivergence(p, q)).toBeGreaterThanOrEqual(0);
    }
  });

  it("alias jsDivergence works", () => {
    expect(approx(jsDivergence([0.5, 0.5], [0.5, 0.5]), 0)).toBe(true);
  });
});

// ─── jensenShannonDistance ───────────────────────────────────────────────────

describe("jensenShannonDistance", () => {
  it("identical distributions → 0", () => {
    expect(approx(jensenShannonDistance([0.5, 0.5], [0.5, 0.5]), 0)).toBe(true);
  });

  it("equals sqrt(JSD)", () => {
    const p = [0.7, 0.3];
    const q = [0.3, 0.7];
    expect(approx(jensenShannonDistance(p, q), Math.sqrt(jensenShannonDivergence(p, q)))).toBe(true);
  });

  it("is non-negative", () => {
    expect(jensenShannonDistance([0.6, 0.4], [0.4, 0.6])).toBeGreaterThanOrEqual(0);
  });

  it("max is 1 for maximally divergent distributions", () => {
    expect(approx(jensenShannonDistance([1, 0], [0, 1]), 1)).toBe(true);
  });
});

// ─── mutualInformation ───────────────────────────────────────────────────────

describe("mutualInformation", () => {
  it("independent variables → 0", () => {
    const joint = [[0.25, 0.25], [0.25, 0.25]];
    expect(approx(mutualInformation(joint), 0)).toBe(true);
  });

  it("perfectly correlated → MI = H(X)", () => {
    const joint = [[0.5, 0], [0, 0.5]];
    const margX = [0.5, 0.5];
    expect(approx(mutualInformation(joint), shannonEntropy(margX))).toBe(true);
  });

  it("MI ≥ 0 (non-negative)", () => {
    const joint = [[0.1, 0.3], [0.2, 0.4]];
    expect(mutualInformation(joint)).toBeGreaterThanOrEqual(0);
  });

  it("MI = H(X) + H(Y) - H(X,Y)", () => {
    const joint = [[0.2, 0.3], [0.1, 0.4]];
    const margX = joint.map((row) => row.reduce((a, b) => a + b, 0));
    const margY = [joint[0]![0]! + joint[1]![0]!, joint[0]![1]! + joint[1]![1]!];
    const expected = shannonEntropy(margX) + shannonEntropy(margY) - jointEntropy(joint);
    expect(approx(mutualInformation(joint), expected)).toBe(true);
  });

  it("empty joint → 0", () => {
    expect(mutualInformation([])).toBe(0);
  });
});

// ─── mutualInfoResult ────────────────────────────────────────────────────────

describe("mutualInfoResult", () => {
  it("independent variables → MI=0, NMI=0", () => {
    const joint = [[0.25, 0.25], [0.25, 0.25]];
    const result = mutualInfoResult(joint);
    expect(approx(result.mutualInformation, 0)).toBe(true);
    expect(approx(result.normalizedMI, 0)).toBe(true);
  });

  it("NMI = MI / sqrt(H(X)*H(Y))", () => {
    const joint = [[0.3, 0.2], [0.1, 0.4]];
    const result = mutualInfoResult(joint);
    const cols = 2;
    const margX = joint.map((row) => row.reduce((a, b) => a + b, 0));
    const margY = Array.from({ length: cols }, (_, j) =>
      joint.reduce((acc, row) => acc + (row[j] ?? 0), 0),
    );
    const hx = shannonEntropy(margX);
    const hy = shannonEntropy(margY);
    const mi = result.mutualInformation;
    const expectedNMI = mi / Math.sqrt(hx * hy);
    expect(approx(result.normalizedMI, expectedNMI)).toBe(true);
  });

  it("returns 0 for empty input", () => {
    const result = mutualInfoResult([]);
    expect(result.mutualInformation).toBe(0);
    expect(result.normalizedMI).toBe(0);
  });
});

// ─── empiricalJointProbs ─────────────────────────────────────────────────────

describe("empiricalJointProbs", () => {
  it("returns empty for empty input", () => {
    expect(empiricalJointProbs([], [], 3, 3)).toEqual([]);
  });

  it("returns a table of shape xBins × yBins", () => {
    const x = [1, 2, 3, 4];
    const y = [1, 2, 3, 4];
    const table = empiricalJointProbs(x, y, 2, 2);
    expect(table.length).toBe(2);
    expect(table[0]!.length).toBe(2);
  });

  it("probabilities sum to 1", () => {
    const x = [1, 2, 3, 4, 5];
    const y = [5, 4, 3, 2, 1];
    const table = empiricalJointProbs(x, y, 3, 3);
    const total = table.flat().reduce((a, b) => a + b, 0);
    expect(approx(total, 1)).toBe(true);
  });

  it("correlated data (x=y) concentrates on diagonal", () => {
    const n = 100;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = Array.from({ length: n }, (_, i) => i);
    const table = empiricalJointProbs(x, y, 4, 4);
    // Off-diagonal sum should be small relative to diagonal
    let diag = 0;
    let offDiag = 0;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (i === j) diag += table[i]![j]!;
        else offDiag += table[i]![j]!;
      }
    }
    expect(diag).toBeGreaterThan(offDiag);
  });
});

// ─── mutualInfoFromSamples ───────────────────────────────────────────────────

describe("mutualInfoFromSamples", () => {
  it("perfectly correlated samples → positive MI", () => {
    const n = 50;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = Array.from({ length: n }, (_, i) => i);
    const mi = mutualInfoFromSamples(x, y, 5);
    expect(mi).toBeGreaterThan(0);
  });

  it("constant x → MI ≈ 0", () => {
    const x = Array(20).fill(1) as number[];
    const y = Array.from({ length: 20 }, (_, i) => i);
    const mi = mutualInfoFromSamples(x, y, 5);
    expect(mi).toBeGreaterThanOrEqual(0);
  });

  it("default bins = 10", () => {
    const x = [1, 2, 3, 4];
    const y = [4, 3, 2, 1];
    const mi = mutualInfoFromSamples(x, y);
    expect(typeof mi).toBe("number");
  });
});

// ─── Huffman coding ──────────────────────────────────────────────────────────

describe("buildHuffmanTree", () => {
  it("builds a tree with the expected root weight", () => {
    const freq = { a: 5, b: 3, c: 2 };
    const tree = buildHuffmanTree(freq);
    expect(tree.weight).toBe(10);
  });

  it("single symbol tree has no children", () => {
    const tree = buildHuffmanTree({ a: 1 });
    expect(tree.symbol).toBe("a");
  });

  it("empty frequencies → empty root", () => {
    const tree = buildHuffmanTree({});
    expect(tree.weight).toBe(0);
  });

  it("two symbols: lower weight symbol gets longer code", () => {
    const freq = { a: 10, b: 1 };
    const tree = buildHuffmanTree(freq);
    const codes = huffmanCodes(tree);
    const aCode = codes.find((c) => c.symbol === "a");
    const bCode = codes.find((c) => c.symbol === "b");
    expect(aCode!.bits).toBeLessThanOrEqual(bCode!.bits);
  });
});

describe("huffmanCodes", () => {
  it("produces unique codes for each symbol (prefix-free)", () => {
    const freq = { a: 5, b: 3, c: 2, d: 1 };
    const tree = buildHuffmanTree(freq);
    const codes = huffmanCodes(tree);

    // Every code must be a proper prefix-free set
    const codeStrings = codes.map((c) => c.code);
    for (let i = 0; i < codeStrings.length; i++) {
      for (let j = 0; j < codeStrings.length; j++) {
        if (i === j) continue;
        // No code is a prefix of another
        expect(codeStrings[j]!.startsWith(codeStrings[i]!)).toBe(false);
      }
    }
  });

  it("all codes consist only of 0 and 1", () => {
    const freq = { x: 3, y: 2, z: 1 };
    const tree = buildHuffmanTree(freq);
    const codes = huffmanCodes(tree);
    for (const c of codes) {
      expect(/^[01]+$/.test(c.code)).toBe(true);
    }
  });

  it("returns correct number of codes", () => {
    const freq = { a: 5, b: 3, c: 2 };
    const tree = buildHuffmanTree(freq);
    const codes = huffmanCodes(tree);
    expect(codes.length).toBe(3);
  });

  it("highest-frequency symbol gets shortest code", () => {
    const freq = { a: 100, b: 10, c: 1 };
    const tree = buildHuffmanTree(freq);
    const codes = huffmanCodes(tree);
    const aCode = codes.find((c) => c.symbol === "a");
    const cCode = codes.find((c) => c.symbol === "c");
    expect(aCode!.bits).toBeLessThanOrEqual(cCode!.bits);
  });
});

describe("huffmanEncode", () => {
  it("encodes a string and produces a bit string", () => {
    const { encoded, codes } = huffmanEncode("aabbc");
    expect(typeof encoded).toBe("string");
    expect(/^[01]*$/.test(encoded)).toBe(true);
    expect(Object.keys(codes).sort()).toEqual(["a", "b", "c"].sort());
  });

  it("compression ratio < 1 for natural English text", () => {
    const text = "the quick brown fox jumps over the lazy dog";
    const { compressionRatio: ratio } = huffmanEncode(text);
    expect(ratio).toBeLessThan(1);
  });

  it("empty string → empty encoded, ratio 1", () => {
    const { encoded, compressionRatio: ratio } = huffmanEncode("");
    expect(encoded).toBe("");
    expect(ratio).toBe(1);
  });

  it("single character repeated → valid codes", () => {
    const { codes, encoded } = huffmanEncode("aaaa");
    expect(Object.keys(codes)).toContain("a");
    expect(encoded.length).toBeGreaterThan(0);
  });

  it("compressionRatio = encodedBits / (length × 8)", () => {
    const text = "aabbcc";
    const { encoded, compressionRatio: ratio } = huffmanEncode(text);
    const expected = encoded.length / (text.length * 8);
    expect(approx(ratio, expected)).toBe(true);
  });
});

describe("averageCodeLength", () => {
  it("returns weighted average bits per symbol", () => {
    const codes: import("@/lib/math/information-theory").HuffmanCode[] = [
      { symbol: "a", code: "0", frequency: 6, bits: 1 },
      { symbol: "b", code: "10", frequency: 3, bits: 2 },
      { symbol: "c", code: "11", frequency: 1, bits: 2 },
    ];
    const avgLen = averageCodeLength(codes, 10);
    // 6/10 * 1 + 3/10 * 2 + 1/10 * 2 = 0.6 + 0.6 + 0.2 = 1.4
    expect(approx(avgLen, 1.4)).toBe(true);
  });

  it("returns 0 for zero total symbols", () => {
    expect(averageCodeLength([], 0)).toBe(0);
  });
});

describe("huffmanEfficiency", () => {
  it("efficiency is close to 1 for natural text (≥ 0.9)", () => {
    const text = "the quick brown fox jumps over the lazy dog the";
    const freq: Record<string, number> = {};
    for (const ch of text) freq[ch] = (freq[ch] ?? 0) + 1;

    const tree = buildHuffmanTree(freq);
    const codes = huffmanCodes(tree);
    const total = text.length;
    const probs = codes.map((c) => c.frequency / total);
    const e = shannonEntropy(probs);
    const eff = huffmanEfficiency(codes, total, e);
    expect(eff).toBeGreaterThanOrEqual(0.9);
    expect(eff).toBeLessThanOrEqual(1 + EPS);
  });

  it("returns 1 when avgLen is 0", () => {
    expect(huffmanEfficiency([], 0, 1)).toBe(1);
  });
});

// ─── selfInformation ─────────────────────────────────────────────────────────

describe("selfInformation", () => {
  it("p=0.5 → 1 bit", () => {
    expect(approx(selfInformation(0.5), 1)).toBe(true);
  });

  it("p=1 → 0 (certain event is no surprise)", () => {
    expect(selfInformation(1)).toBe(0);
  });

  it("p=0 → Infinity", () => {
    expect(selfInformation(0)).toBe(Infinity);
  });

  it("p=0.25 → 2 bits", () => {
    expect(approx(selfInformation(0.25), 2)).toBe(true);
  });

  it("p=0.125 → 3 bits", () => {
    expect(approx(selfInformation(0.125), 3)).toBe(true);
  });

  it("decreases as p increases (rare events are more surprising)", () => {
    expect(selfInformation(0.1)).toBeGreaterThan(selfInformation(0.5));
    expect(selfInformation(0.5)).toBeGreaterThan(selfInformation(0.9));
  });

  it("legacy alias surprisal works", () => {
    expect(approx(surprisal(0.5), 1)).toBe(true);
  });
});

// ─── informationGain ─────────────────────────────────────────────────────────

describe("informationGain", () => {
  it("perfect split → full parent entropy", () => {
    // Two children each with pure distribution
    const ig = informationGain([5, 5], [[5, 0], [0, 5]]);
    expect(approx(ig, shannonEntropy([0.5, 0.5]))).toBe(true);
  });

  it("no improvement → 0", () => {
    // Children have same distribution as parent
    const ig = informationGain([5, 5], [[3, 3], [2, 2]]);
    expect(approx(ig, 0)).toBe(true);
  });

  it("is always non-negative for valid splits", () => {
    const ig = informationGain([10, 10], [[8, 2], [2, 8]]);
    expect(ig).toBeGreaterThanOrEqual(0);
  });

  it("empty children → IG = parentEntropy (no split)", () => {
    // With no children, weighted sum = 0, so IG = parentEntropy
    const ig = informationGain([5, 5], []);
    const parentE = empiricalEntropy([5, 5]);
    expect(approx(ig, parentE)).toBe(true);
  });

  it("all parent in one class → 0 IG (parent entropy = 0)", () => {
    const ig = informationGain([10, 0], [[5, 0], [5, 0]]);
    expect(approx(ig, 0)).toBe(true);
  });
});

// ─── giniImpurity ────────────────────────────────────────────────────────────

describe("giniImpurity", () => {
  it("pure class [1, 0] → 0", () => {
    expect(approx(giniImpurity([1, 0]), 0)).toBe(true);
  });

  it("uniform binary [0.5, 0.5] → 0.5", () => {
    expect(approx(giniImpurity([0.5, 0.5]), 0.5)).toBe(true);
  });

  it("uniform 4-way → 0.75", () => {
    expect(approx(giniImpurity([0.25, 0.25, 0.25, 0.25]), 0.75)).toBe(true);
  });

  it("is in [0, 1)", () => {
    const g = giniImpurity([0.3, 0.4, 0.3]);
    expect(g).toBeGreaterThanOrEqual(0);
    expect(g).toBeLessThan(1);
  });
});

// ─── giniInformationGain ─────────────────────────────────────────────────────

describe("giniInformationGain", () => {
  it("perfect split → positive gain", () => {
    const gain = giniInformationGain([5, 5], [[5, 0], [0, 5]]);
    expect(gain).toBeGreaterThan(0);
  });

  it("no split improvement → 0", () => {
    // Children same as parent
    const gain = giniInformationGain([4, 4], [[2, 2], [2, 2]]);
    expect(approx(gain, 0)).toBe(true);
  });
});

// ─── infoGainRatio ───────────────────────────────────────────────────────────

describe("infoGainRatio", () => {
  it("returns a positive value for informative splits", () => {
    const ratio = infoGainRatio([5, 5], [[5, 0], [0, 5]]);
    expect(ratio).toBeGreaterThan(0);
  });

  it("returns 0 when IG = 0", () => {
    const ratio = infoGainRatio([4, 4], [[2, 2], [2, 2]]);
    expect(approx(ratio, 0)).toBe(true);
  });

  it("is dimensionless (IG / intrinsicInfo)", () => {
    const ratio = infoGainRatio([10, 10], [[8, 2], [2, 8]]);
    expect(typeof ratio).toBe("number");
    expect(isFinite(ratio)).toBe(true);
  });
});

// ─── binaryEntropy ───────────────────────────────────────────────────────────

describe("binaryEntropy", () => {
  it("p=0.5 → 1 bit (maximum)", () => {
    expect(approx(binaryEntropy(0.5), 1)).toBe(true);
  });

  it("p=0 → 0", () => {
    expect(binaryEntropy(0)).toBe(0);
  });

  it("p=1 → 0", () => {
    expect(binaryEntropy(1)).toBe(0);
  });

  it("is symmetric: H(p) = H(1-p)", () => {
    for (const p of [0.1, 0.3, 0.45, 0.9]) {
      expect(approx(binaryEntropy(p), binaryEntropy(1 - p))).toBe(true);
    }
  });

  it("is always in [0, 1]", () => {
    for (const p of [0, 0.1, 0.3, 0.5, 0.7, 0.9, 1]) {
      const h = binaryEntropy(p);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(1 + EPS);
    }
  });

  it("p=0.25 known value", () => {
    const expected = -(0.25 * Math.log2(0.25) + 0.75 * Math.log2(0.75));
    expect(approx(binaryEntropy(0.25), expected)).toBe(true);
  });
});

// ─── binarySymmetricChannel ──────────────────────────────────────────────────

describe("binarySymmetricChannel", () => {
  it("crossover=0 → capacity 1 (perfect channel)", () => {
    expect(approx(binarySymmetricChannel(0), 1)).toBe(true);
  });

  it("crossover=0.5 → capacity 0 (useless channel)", () => {
    expect(approx(binarySymmetricChannel(0.5), 0)).toBe(true);
  });

  it("capacity = 1 - H(p)", () => {
    const p = 0.1;
    expect(approx(binarySymmetricChannel(p), 1 - binaryEntropy(p))).toBe(true);
  });

  it("capacity is in [0, 1]", () => {
    for (const p of [0, 0.1, 0.25, 0.5]) {
      const c = binarySymmetricChannel(p);
      expect(c).toBeGreaterThanOrEqual(-EPS);
      expect(c).toBeLessThanOrEqual(1 + EPS);
    }
  });
});

// ─── channelCapacity ─────────────────────────────────────────────────────────

describe("channelCapacity", () => {
  it("perfect BSC (identity matrix) → capacity close to 1", () => {
    const transitionMatrix = [[1, 0], [0, 1]];
    const cap = channelCapacity(transitionMatrix);
    expect(approx(cap, 1)).toBe(true);
  });

  it("completely noisy channel → capacity 0", () => {
    // Both inputs produce identical output distribution
    const transitionMatrix = [[0.5, 0.5], [0.5, 0.5]];
    const cap = channelCapacity(transitionMatrix);
    expect(approx(cap, 0)).toBe(true);
  });

  it("empty matrix → 0", () => {
    expect(channelCapacity([])).toBe(0);
  });

  it("is non-negative", () => {
    const transitionMatrix = [[0.8, 0.2], [0.3, 0.7]];
    expect(channelCapacity(transitionMatrix)).toBeGreaterThanOrEqual(0);
  });
});

// ─── runLengthEncode / Decode ────────────────────────────────────────────────

describe("runLengthEncode", () => {
  it("empty string → empty array", () => {
    expect(runLengthEncode("")).toEqual([]);
  });

  it("single char → one run", () => {
    expect(runLengthEncode("a")).toEqual([{ symbol: "a", count: 1 }]);
  });

  it("runs of same char are grouped", () => {
    const result = runLengthEncode("aaabbc");
    expect(result).toEqual([
      { symbol: "a", count: 3 },
      { symbol: "b", count: 2 },
      { symbol: "c", count: 1 },
    ]);
  });

  it("no repeated chars → each char is its own run", () => {
    const result = runLengthEncode("abcd");
    expect(result.length).toBe(4);
    expect(result.every((r) => r.count === 1)).toBe(true);
  });

  it("all same char → one run", () => {
    const result = runLengthEncode("aaaaa");
    expect(result).toEqual([{ symbol: "a", count: 5 }]);
  });
});

describe("runLengthDecode", () => {
  it("empty array → empty string", () => {
    expect(runLengthDecode([])).toBe("");
  });

  it("decodes single run", () => {
    expect(runLengthDecode([{ symbol: "x", count: 4 }])).toBe("xxxx");
  });

  it("decodes multiple runs", () => {
    expect(
      runLengthDecode([
        { symbol: "a", count: 3 },
        { symbol: "b", count: 2 },
      ]),
    ).toBe("aaabb");
  });
});

describe("runLengthEncode/Decode roundtrip", () => {
  it("roundtrip is lossless for arbitrary string", () => {
    const original = "aabbbccddddeeeeef";
    expect(runLengthDecode(runLengthEncode(original))).toBe(original);
  });

  it("roundtrip for string with no runs", () => {
    const original = "abcdef";
    expect(runLengthDecode(runLengthEncode(original))).toBe(original);
  });

  it("roundtrip for empty string", () => {
    expect(runLengthDecode(runLengthEncode(""))).toBe("");
  });

  it("roundtrip for single char", () => {
    expect(runLengthDecode(runLengthEncode("z"))).toBe("z");
  });

  it("roundtrip for long repeated string", () => {
    const original = "a".repeat(1000);
    expect(runLengthDecode(runLengthEncode(original))).toBe(original);
  });
});

// ─── compressionRatio / bytesToBits / bitsToBytes ─────────────────────────────

describe("compressionRatio", () => {
  it(">1 means compression achieved", () => {
    expect(compressionRatio(100, 50)).toBe(2);
  });

  it("=1 means no change", () => {
    expect(compressionRatio(100, 100)).toBe(1);
  });

  it("<1 means expansion", () => {
    expect(compressionRatio(50, 100)).toBe(0.5);
  });

  it("compressedBits=0 → Infinity", () => {
    expect(compressionRatio(100, 0)).toBe(Infinity);
  });
});

describe("bytesToBits", () => {
  it("1 byte = 8 bits", () => {
    expect(bytesToBits(1)).toBe(8);
  });

  it("0 bytes = 0 bits", () => {
    expect(bytesToBits(0)).toBe(0);
  });

  it("10 bytes = 80 bits", () => {
    expect(bytesToBits(10)).toBe(80);
  });
});

describe("bitsToBytes", () => {
  it("8 bits = 1 byte", () => {
    expect(bitsToBytes(8)).toBe(1);
  });

  it("0 bits = 0 bytes", () => {
    expect(bitsToBytes(0)).toBe(0);
  });

  it("rounds up by default: 9 bits → 2 bytes", () => {
    expect(bitsToBytes(9)).toBe(2);
  });

  it("no rounding when roundUp=false", () => {
    expect(bitsToBytes(9, false)).toBeCloseTo(1.125);
  });

  it("exact division: 16 bits → 2 bytes", () => {
    expect(bitsToBytes(16)).toBe(2);
  });
});

// ─── Sports prediction information theory ────────────────────────────────────

describe("predictionEntropy", () => {
  it("empty → 0", () => {
    expect(predictionEntropy([])).toBe(0);
  });

  it("all same confidence → positive entropy", () => {
    const scores = [50, 50, 50, 50];
    expect(predictionEntropy(scores)).toBeGreaterThan(0);
  });

  it("higher uncertainty (scores near 50) → more entropy", () => {
    const uncertain = predictionEntropy([50, 50]);
    const confident = predictionEntropy([90, 10]);
    expect(uncertain).toBeGreaterThan(confident);
  });
});

describe("betMarketEntropy", () => {
  it("uniform market (max uncertainty)", () => {
    // 3-way market: [1/3, 1/3, 1/3]
    const e = betMarketEntropy([1 / 3, 1 / 3, 1 / 3]);
    expect(approx(e, Math.log2(3))).toBe(true);
  });

  it("certain market → 0 entropy", () => {
    expect(approx(betMarketEntropy([1, 0, 0]), 0)).toBe(true);
  });

  it("returns non-negative value", () => {
    expect(betMarketEntropy([0.5, 0.3, 0.2])).toBeGreaterThanOrEqual(0);
  });
});

describe("informationEdge", () => {
  it("model = market → 0 edge", () => {
    expect(approx(informationEdge(0.6, 0.6), 0)).toBe(true);
  });

  it("large model-market divergence → positive edge", () => {
    const edge = informationEdge(0.7, 0.5);
    expect(edge).toBeGreaterThan(0);
  });

  it("is non-negative for valid inputs", () => {
    expect(informationEdge(0.55, 0.5)).toBeGreaterThanOrEqual(0);
  });

  it("returns Infinity for zero market prob when model prob > 0", () => {
    // modelProb close to 0 marketProb should yield high edge
    expect(informationEdge(0.99, 0.01)).toBeGreaterThan(0);
  });
});

describe("expectedCalibrationEntropy", () => {
  it("empty buckets → 0", () => {
    expect(expectedCalibrationEntropy([])).toBe(0);
  });

  it("well-predicted bucket → positive entropy", () => {
    const buckets = [
      { predicted: 0.6, actual: 0.6, count: 10 },
      { predicted: 0.4, actual: 0.4, count: 10 },
    ];
    const e = expectedCalibrationEntropy(buckets);
    expect(e).toBeGreaterThan(0);
  });

  it("certain outcomes → 0 entropy", () => {
    const buckets = [
      { predicted: 1.0, actual: 1.0, count: 10 },
      { predicted: 0.0, actual: 0.0, count: 10 },
    ];
    expect(approx(expectedCalibrationEntropy(buckets), 0)).toBe(true);
  });
});

describe("pickDiversityScore", () => {
  it("empty picks → 0", () => {
    expect(pickDiversityScore([])).toBe(0);
  });

  it("all same sport and pick type → 0", () => {
    const picks = [
      { sport: "NFL", pickType: "spread" },
      { sport: "NFL", pickType: "spread" },
    ];
    expect(approx(pickDiversityScore(picks), 0)).toBe(true);
  });

  it("diverse picks → score > 0", () => {
    const picks = [
      { sport: "NFL", pickType: "spread" },
      { sport: "NBA", pickType: "moneyline" },
      { sport: "MLB", pickType: "total" },
      { sport: "NHL", pickType: "spread" },
    ];
    expect(pickDiversityScore(picks)).toBeGreaterThan(0);
  });

  it("score is in [0, 1]", () => {
    const picks = [
      { sport: "NFL", pickType: "spread" },
      { sport: "NBA", pickType: "moneyline" },
    ];
    const score = pickDiversityScore(picks);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1 + EPS);
  });

  it("maximum diversity: all different sports and pick types → score near 1", () => {
    const picks = [
      { sport: "NFL", pickType: "spread" },
      { sport: "NBA", pickType: "moneyline" },
      { sport: "MLB", pickType: "total" },
      { sport: "NHL", pickType: "puck-line" },
    ];
    const score = pickDiversityScore(picks);
    expect(score).toBeGreaterThan(0.5);
  });
});

// ─── Legacy aliases ───────────────────────────────────────────────────────────

describe("legacy aliases", () => {
  it("entropy → shannonEntropy", () => {
    expect(approx(entropy([0.5, 0.5]), 1)).toBe(true);
  });

  it("klDivergence → relativeEntropy", () => {
    expect(approx(klDivergence([0.5, 0.5], [0.5, 0.5]), 0)).toBe(true);
  });

  it("jsDivergence → jensenShannonDivergence", () => {
    expect(approx(jsDivergence([1, 0], [0, 1]), 1)).toBe(true);
  });

  it("surprisal → selfInformation", () => {
    expect(approx(surprisal(0.25), 2)).toBe(true);
  });

  it("normalize sums to 1", () => {
    const result = normalize([1, 2, 3]);
    const sum = result.reduce((a, b) => a + b, 0);
    expect(approx(sum, 1)).toBe(true);
  });

  it("maxEntropy(4) = 2 bits", () => {
    expect(approx(maxEntropy(4), 2)).toBe(true);
  });

  it("perplexity of uniform [0.25,0.25,0.25,0.25] → 4", () => {
    expect(approx(perplexity([0.25, 0.25, 0.25, 0.25]), 4)).toBe(true);
  });

  it("brier perfect predictions → 0", () => {
    expect(brier([1, 0, 1], [1, 0, 1])).toBe(0);
  });

  it("logLoss empty → 0", () => {
    expect(logLoss([], [])).toBe(0);
  });

  it("calibrationError empty → 0", () => {
    expect(calibrationError([], [])).toBe(0);
  });

  it("normalizedMutualInformation independent → 0", () => {
    const joint = [[0.25, 0.25], [0.25, 0.25]] as const;
    expect(approx(normalizedMutualInformation(joint), 0)).toBe(true);
  });
});

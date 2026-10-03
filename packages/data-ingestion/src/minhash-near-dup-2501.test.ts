import { describe, expect, it } from "vitest";
import {
  estimateJaccard,
  findNearDuplicates,
  fnv1a,
  lshCandidateBuckets,
  minHashSignature,
  pairsMissedByExactHash,
  shingle,
} from "./minhash-near-dup-2501.js";

describe("minhash near-dup", () => {
  it("detects near-duplicate documents exact hashing misses", () => {
    const docs = [
      { id: "a", text: "the kansas city chiefs won the game on sunday night football" },
      { id: "b", text: "the kansas city chiefs won the game on sunday night footbal!" },
      { id: "c", text: "completely unrelated recipe for banana bread with walnuts" },
    ];
    const pairs = findNearDuplicates(docs, { k: 5, numHashes: 64, bands: 8, threshold: 0.4 });
    expect(pairs.length).toBeGreaterThan(0);
    const ab = pairs.find((p) => (p.a === "a" && p.b === "b") || (p.a === "b" && p.b === "a"));
    expect(ab).toBeDefined();
    expect(ab?.estimatedJaccard ?? 0).toBeGreaterThan(0.4);
    const missed = pairsMissedByExactHash(docs, pairs);
    expect(missed.length).toBe(pairs.length); // none are exact dups
  });

  it("reports exact duplicates with jaccard 1", () => {
    const docs = [
      { id: "x", text: "identical text here" },
      { id: "y", text: "identical text here" },
    ];
    const sig = minHashSignature(shingle(docs[0]?.text ?? "", 5));
    expect(estimateJaccard(sig, sig)).toBe(1);
    const pairs = findNearDuplicates(docs, { threshold: 0.9 });
    expect(pairs.length).toBe(1);
    expect(pairsMissedByExactHash(docs, pairs).length).toBe(0);
  });

  it("signatures are deterministic across calls", () => {
    const s = shingle("deterministic signature check", 4);
    expect(minHashSignature(s)).toEqual(minHashSignature(s));
    expect(fnv1a("abc")).toBe(fnv1a("abc"));
  });

  it("handles empty input", () => {
    expect(findNearDuplicates([])).toEqual([]);
    expect(lshCandidateBuckets(new Map())).toEqual([]);
    expect(estimateJaccard([], [])).toBe(0);
    expect(shingle("", 5).size).toBe(0);
  });

  it("handles malformed input without crashing", () => {
    const docs = [
      { id: "e1", text: "" },
      { id: "e2", text: "x" },
      { id: "e3", text: "   " },
    ];
    const pairs = findNearDuplicates(docs, { k: 99, numHashes: 16, bands: 4 });
    expect(Array.isArray(pairs)).toBe(true);
    expect(estimateJaccard([1, 2], [1])).toBe(0); // mismatched lengths
    expect(shingle("abc", 0).size).toBe(0);
  });
});

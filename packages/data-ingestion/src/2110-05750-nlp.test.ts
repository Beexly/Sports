/**
 * Tests for ./2110-05750-nlp (arXiv:2110.05750, lane=nlp).
 *
 * ACCEPTANCE GATE: ACCEPTED (ADAPT): clean public dataset + reproduced SOTA + ablations isolating all three
 * contributions. NFL-port gate: the selector's recall on pseudo-labeled NFL sentences must match the
 * paper's ordering (selector + rewrite + MMR rerank beats each ablated variant).
 */
import { describe, expect, it } from "vitest";
import * as mod from "./2110-05750-nlp";

describe("NLP text features (arXiv:2110.05750)", () => {
  it("tokenizes text", () => {
    expect(mod.tokenize("Hello, World! 123")).toEqual(["hello", "world", "123"]);
    expect(mod.tokenize("")).toEqual([]);
    expect(mod.tokenize("don't")).toEqual(["don", "t"]);
  });

  it("scores lexicon sentiment", () => {
    const r = mod.lexiconScore(["great", "day", "bad"], { great: 1, bad: -1 })!;
    expect(r.hits).toBe(2);
    expect(r.score).toBeCloseTo(0, 10);
    const pos = mod.lexiconScore(["great", "great"], { great: 2 })!;
    expect(pos.score).toBeCloseTo(2, 10);
    expect(mod.lexiconScore([], { great: 1 })).toBeNull();
  });

  it("measures keyword overlap", () => {
    expect(mod.keywordOverlap(["a", "b", "c"], ["b", "c", "d"])).toBeCloseTo(0.5, 10);
    expect(mod.keywordOverlap(["a"], ["a"])).toBeCloseTo(1, 10);
    expect(mod.keywordOverlap(["a"], ["b"])).toBeCloseTo(0, 10);
    expect(mod.keywordOverlap([], [])).toBeNull();
  });
});

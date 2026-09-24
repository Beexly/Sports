/**
 * Tests for ./2408-05123-nlp (arXiv:2408.05123, lane=nlp).
 *
 * ACCEPTANCE GATE: ADAPT the evidence-grounding pattern, not the paper's components: KNN+FastDTW on 134 clips, SportsVU
 * dependence, and first-person narration are all rejected for GSE use. ADAPT proceeds if the
 * reproducible test shows comprehension gains without factual errors.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./2408-05123-nlp";

describe("NLP text features (arXiv:2408.05123)", () => {
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

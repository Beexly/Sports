/**
 * Tests for ./2112-13593v5-nlp (arXiv:2112.13593v5, lane=nlp).
 *
 * ACCEPTANCE GATE: Full-model 61.20% accuracy / MCC 0.1193 vs CapTE 59.87% / 0.0976, credibility ablation +1.14pp
 * (60.06% -> 61.20%): ADOPT only if the credibility-weighting ablation reproduces on walk-forward NFL
 * data; do not adopt if it doesn't.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./2112-13593v5-nlp";

describe("NLP text features (arXiv:2112.13593v5)", () => {
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

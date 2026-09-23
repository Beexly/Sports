/**
 * Tests for ./1211-6496-nlp (arXiv:1211.6496, lane=nlp).
 *
 * ACCEPTANCE GATE: ADAPT proceeds if the reproducible test shows extraction F1 >= 0.80 with negation handling and the
 * consensus feature improves a line-plus-consensus model; REJECT the social-consensus signal for any
 * game/week where extraction volume falls below a coverage threshold.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./1211-6496-nlp";

describe("NLP text features (arXiv:1211.6496)", () => {
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

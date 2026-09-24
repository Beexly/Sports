/**
 * Tests for ./2012-04380v1-nlp (arXiv:2012.04380v1, lane=nlp).
 *
 * ACCEPTANCE GATE: Reproduce the paper's Model 4 ~= 63% accuracy and the >=7pp ablation drop when text features are
 * removed; NFL pilot: 1 season of beat-writer previews with the same stacking protocol vs the GSE
 * engine baseline, measuring moneyline accuracy delta and CLV on the subset where the text model
 * disagrees with the market.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./2012-04380v1-nlp";

describe("NLP text features (arXiv:2012.04380v1)", () => {
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

/**
 * Tests for ./2009-00550-nlp (arXiv:2009.00550, lane=nlp).
 *
 * ACCEPTANCE GATE: ADAPT only the recipe -- timestamped per-team social-affinity features inside a walk-forward
 * destination classifier -- if the reproducible test shows >= 2x-random top-3 accuracy on NFL data
 * with strictly pre-tampering-window features. REJECT the paper's numbers outright if timestamped
 * follow data is unobtainable (without edge timestamps the feature is definitionally leaky).
 */
import { describe, expect, it } from "vitest";
import * as mod from "./2009-00550-nlp";

describe("NLP text features (arXiv:2009.00550)", () => {
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

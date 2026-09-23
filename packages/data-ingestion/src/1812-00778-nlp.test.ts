/**
 * Tests for ./1812-00778-nlp (arXiv:1812.00778, lane=nlp).
 *
 * ACCEPTANCE GATE: ADAPT the pipeline taxonomy, the hedging lexicon, and the official-registration veracity protocol;
 * adopt nothing empirical since the paper runs no experiments. ADAPT proceeds if the reproducible test
 * validates the hedging-index hypothesis (rho <= -0.3) and veracity accuracy >= 0.80; REJECT the
 * Twitter-reaction side if reaction-volume data is unavailable or too sparse per rumor (the paper's 2M
 * tweets came from a 2018 API that no longer exists); REJECT any veracity claim on 'talks died
 * quietly' rumors where no official ground truth exists -- mark those unresolved, never refuted.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./1812-00778-nlp";

describe("NLP text features (arXiv:1812.00778)", () => {
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

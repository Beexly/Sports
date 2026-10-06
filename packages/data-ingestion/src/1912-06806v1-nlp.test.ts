/**
 * Tests for ./1912-06806v1-nlp (arXiv:1912.06806v1, lane=nlp).
 *
 * ACCEPTANCE GATE: ADOPT the protocol as GSE's standard sports-text benchmark if inter-annotator agreement (Fleiss
 * kappa) reaches >=0.6 on a 200-item pilot; REJECT the protocol if kappa < 0.4 (task too subjective
 * for sports text).
 */
import { describe, expect, it } from "vitest";
import * as mod from "./1912-06806v1-nlp";

describe("NLP text features (arXiv:1912.06806v1)", () => {
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

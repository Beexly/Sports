/**
 * Tests for ./1205-3212v1-nlp (arXiv:1205.3212v1, lane=nlp).
 *
 * ACCEPTANCE GATE: ADAPT if a 2025-season pilot detects >=90% of official injury-designation news with median latency
 * under 3 minutes and FP rate under 15%; REJECT if FP exceeds 25% or X API costs exceed $200/season
 * for the data lane.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./1205-3212v1-nlp";

describe("NLP text features (arXiv:1205.3212v1)", () => {
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

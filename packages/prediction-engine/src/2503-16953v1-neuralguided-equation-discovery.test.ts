/**
 * Vitest suite for arXiv:2503.16953v1 (Neural-Guided Equation Discovery).
 * Gate: ADOPT grammar-constrained proposals + best-aggregation if GSE-SR valid-program rate rises ≥10pp with no OOD-NMSE regression on the 2024–2025 holdout; REJECT if constraints reduce the diversity of discovered forms (count distinct skeletons — must not drop >20%).
 */
import { describe, it, expect } from "vitest";
import { GRAMMAR_OPS, grammarValid, skeletonOf, bestAggregation, embeddingSimilarity } from "./2503-16953v1-neuralguided-equation-discovery";

describe("2503-16953v1 grammar-constrained SR proposals", () => {
  const vars = ["epa", "wp"];
  it("rejects programs with unknown tokens", () => {
    expect(grammarValid(["+", "epa", "1.5"], vars)).toBe(true);
    expect(grammarValid(["conv", "epa", "1"], vars)).toBe(false);
    expect(grammarValid([], vars)).toBe(false);
  });
  it("best-aggregation keeps one winner per skeleton", () => {
    const cands = [
      { prog: ["+", "epa", "1"], score: 0.8 },
      { prog: ["+", "epa", "2"], score: 0.9 },
      { prog: ["*", "epa", "wp"], score: 0.7 },
      { prog: ["hack", "epa"], score: 0.99 },
    ];
    const best = bestAggregation(cands, vars);
    expect(best.size).toBe(2);
    expect(best.get("+ V C")?.score).toBeCloseTo(0.9, 10);
  });
  it("embedding similarity ranks transfer sources", () => {
    expect(embeddingSimilarity([1, 0], [1, 0])).toBeCloseTo(1, 10);
    expect(embeddingSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 10);
    expect(() => embeddingSimilarity([1], [1, 2])).toThrow();
  });
});

/**
 * Vitest suite for arXiv:2511.07250v2 (MVU-Eval: Towards Multi-Video Understanding Evaluation for Multimodal LLMs).
 * Gate: Adopt an MLLM for any GSE production clip task only if it scores >=70% overall on GSE-MVU AND >=60% on Spatial Understanding and KIR subtasks; REJECT as the evaluator's whole point is that the bar is aspirational.
 */
import { describe, it, expect } from "vitest";
import { prequentialAccuracy, adwinDrift, friedmanRanks, nemenyiCD } from "./2511-07250v2-mvueval-towards-multivideo-understanding-evaluation";

describe("2511-07250v2 streaming benchmark harness", () => {
  it("prequential accuracy counts test-then-train hits", () => {
    expect(prequentialAccuracy([{ correct: true }, { correct: false }])).toBeCloseTo(0.5, 10);
    expect(() => prequentialAccuracy([])).toThrow();
  });
  it("ADWIN fires on a mean shift", () => {
    expect(adwinDrift([0, 0, 0, 0, 1, 1, 1, 1], 0.3)).toBe(true);
    expect(adwinDrift([0, 1, 0, 1, 0, 1, 0, 1], 0.3)).toBe(false);
    expect(adwinDrift([0, 1], 0.1)).toBe(false);
    expect(() => adwinDrift([0, 1, 0, 1], 0)).toThrow();
  });
  it("Friedman ranks the best algorithm lowest", () => {
    const ranks = friedmanRanks([[0.9, 0.7, 0.8], [0.85, 0.75, 0.8]]);
    expect(ranks[0]).toBeLessThan(ranks[1] ?? 0);
    expect(nemenyiCD(3, 10)).toBeGreaterThan(0);
    expect(() => nemenyiCD(1, 10)).toThrow();
  });
});

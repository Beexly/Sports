/**
 * Vitest suite for arXiv:2509.03036 (Knowledge Integration for Physics-informed Symbolic Regression Using Pre-trained Large Language Models).
 * Gate: ADOPT if LLM-term runs achieve >=80% domain-validity on the Pareto front (vs <=50% without) AND validation Brier degrades by <=5% relative AND per-generation wall-clock overhead <2x.
 */
import { describe, it, expect } from "vitest";
import { judgeScore, judgeAugmentedLoss, isDomainValid } from "./2509-03036-knowledge-integration-for-physicsinformed-symbolic";

describe("2509-03036 LLM-judge SR term", () => {
  const good = { boundConsistency: 1, footballRealism: 0.9, simplicity: 0.8 };
  const bad = { boundConsistency: 0.2, footballRealism: 0.3, simplicity: 0.9 };
  it("scores valid equations above invalid ones", () => {
    expect(judgeScore(good)).toBeGreaterThan(judgeScore(bad));
    expect(isDomainValid(good)).toBe(true);
    expect(isDomainValid(bad)).toBe(false);
    expect(() => judgeScore({ ...good, simplicity: 2 })).toThrow();
  });
  it("augmented loss rewards the judge term", () => {
    expect(judgeAugmentedLoss(1.0, good, 0.5)).toBeLessThan(judgeAugmentedLoss(1.0, bad, 0.5));
    expect(judgeAugmentedLoss(1.0, good, 0)).toBeCloseTo(1.0, 12);
    expect(() => judgeAugmentedLoss(1, good, -1)).toThrow();
  });
});

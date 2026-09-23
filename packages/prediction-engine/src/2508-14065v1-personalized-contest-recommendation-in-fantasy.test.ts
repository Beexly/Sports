/**
 * Vitest suite for arXiv:2508.14065v1 (Personalized Contest Recommendation in Fantasy Sports).
 * Gate: ADAPT if the offline test beats the LightGBM baseline by >=5% relative on P/R@5 on the time-ordered test window; REJECT if the deep model can't beat gradient boosting at GSE's data scale.
 */
import { describe, it, expect } from "vitest";
import { towerScore, pairwiseHingeLoss, interactionScore, rankScore, ENABLED } from "./2508-14065v1-personalized-contest-recommendation-in-fantasy";

describe("2508-14065v1 three-tower contest recommendation (disabled)", () => {
  it("scores user-item affinity by dot product", () => {
    expect(towerScore([1, 2], [3, 4])).toBeCloseTo(11, 10);
    expect(() => towerScore([1], [1, 2])).toThrow();
  });
  it("hinge loss is zero when positives outrank negatives by margin", () => {
    expect(pairwiseHingeLoss([0.9, 0.8], [0.2, 0.1], 0.5)).toBeCloseTo(0, 10);
    expect(pairwiseHingeLoss([0.3], [0.8], 0.5)).toBeCloseTo(1.0, 10);
    expect(() => pairwiseHingeLoss([1], [0], -1)).toThrow();
  });
  it("interaction tower adds the pooled elementwise term", () => {
    expect(rankScore([1, 1], [2, 3], [0.5, 0.5])).toBeCloseTo(5 + 2.5, 10);
    expect(() => interactionScore([1], [1, 2], [1])).toThrow();
  });
  it("is disabled pending trained towers and feedback data", () => {
    expect(ENABLED).toBe(false);
  });
});

/**
 * Vitest suite for arXiv:2509.25858v1 (Aging Decline in Basketball Career Trend Prediction Based on Machine Learning and LSTM Model).
 * Gate: Adopt into the prop/DFS projection pipeline if on the 2023-2024 holdout it beats the last-value baseline on MAE for veterans AND archetype assignments are stable across bootstrap re-clustering (Jaccard >=0.7).
 */
import { describe, it, expect } from "vitest";
import { kmeansArchetypes, forecastNextSeason, assignmentJaccard } from "./2509-25858v1-aging-decline-in-basketball-career";

describe("2509-25858v1 archetype-conditioned aging forecaster", () => {
  const careers = [
    [1.0, 0.9, 0.7, 0.4], [1.0, 0.85, 0.65, 0.35], // early-peak
    [0.4, 0.6, 0.8, 0.9], [0.35, 0.55, 0.75, 0.85], // late-bloomer
  ];
  it("separates early-peak from late-bloomer careers", () => {
    const arch = kmeansArchetypes(careers, 2);
    const f0 = forecastNextSeason(arch, [1.0, 0.9, 0.7], 2);
    const f1 = forecastNextSeason(arch, [0.4, 0.6, 0.8], 2);
    expect(f0).toBeLessThan(0.7); // cliff continues
    expect(f1).toBeGreaterThan(0.8); // late-bloomer keeps rising
  });
  it("Jaccard is 1 for identical assignments", () => {
    expect(assignmentJaccard([0, 0, 1, 1], [0, 0, 1, 1])).toBe(1);
    expect(assignmentJaccard([0, 0, 1, 1], [1, 1, 0, 0])).toBe(1); // label-permuted
    expect(() => assignmentJaccard([0], [0, 1])).toThrow();
  });
});

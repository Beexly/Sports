import { describe, expect, it } from "vitest";

import {
  ENABLED,
  probabilityToAmerican,
  simulateJointMarketTape,
} from "./2108-02419v1-joint-market-simulator";

const state = {
  moneyline: [0.54, 0.46],
  spread: [0.57, 0.43],
  total: [0.61, 0.39],
} as const;

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);

describe("2108.02419v1 joint market simulator", () => {
  it("is disabled by default", () => {
    expect(ENABLED).toBe(false);
  });

  it("is deterministic for a fixed seed", () => {
    const first = simulateJointMarketTape(state, { steps: 8, seed: 42 });
    const second = simulateJointMarketTape(state, { steps: 8, seed: 42 });

    expect(first).toEqual(second);
    expect(first).toHaveLength(9);
  });

  it("preserves valid two-way probability and American-odds pairs", () => {
    const points = simulateJointMarketTape(state, { steps: 25, seed: 7 });

    for (const point of points) {
      for (const [probabilities, odds] of [
        [point.moneylineProbabilities, point.moneylineAmerican],
        [point.spreadProbabilities, point.spreadAmerican],
        [point.totalProbabilities, point.totalAmerican],
      ] as const) {
        expect(sum(probabilities)).toBeCloseTo(1, 12);
        probabilities.forEach((probability, index) => {
          expect(probability).toBeGreaterThan(0);
          expect(probability).toBeLessThan(1);
          expect(odds[index]).toBe(probabilityToAmerican(probability));
        });
      }
    }
  });
});

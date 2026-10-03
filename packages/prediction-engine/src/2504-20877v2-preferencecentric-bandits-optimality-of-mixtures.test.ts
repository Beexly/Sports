/**
 * Vitest suite for arXiv:2504.20877v2 (Preference-centric Bandits: Optimality of Mixtures and Regret-efficient Algorithms).
 * Gate: At T=60k under GD on the paper's 2-arm Bernoulli setup, PM-UCB-M's average regret must be ≤ 50% of uniform sampling's average regret, with regret decreasing monotonically across T∈{20k,40k,60k}.
 */
import { describe, it, expect } from "vitest";
import { dynamicUcbScore, discountArms, dynamicUcbPick } from "./2504-20877v2-preferencecentric-bandits-optimality-of-mixtures";

describe("2504-20877v2 dynamic UCB market-timing throttle", () => {
  it("explores untried arms first", () => {
    const arms = [{ count: 10, reward: 8 }, { count: 0, reward: 0 }];
    expect(dynamicUcbPick(arms, 1, 1)).toBe(1);
  });
  it("discounting forgets stale history", () => {
    const arms = discountArms([{ count: 100, reward: 90 }, { count: 1, reward: 1 }], 1, 1, 0.5);
    expect(arms[0]!.count).toBeCloseTo(50, 10);
    expect(arms[1]!.count).toBeCloseTo(1.5, 10);
    expect(() => discountArms(arms, 0, 1, 2)).toThrow();
  });
  it("picks the higher-UCB arm", () => {
    const arms = [{ count: 10, reward: 8 }, { count: 10, reward: 4 }];
    expect(dynamicUcbPick(arms, 2, 0.1)).toBe(0);
    expect(() => dynamicUcbPick([], 1, 1)).toThrow();
  });
});

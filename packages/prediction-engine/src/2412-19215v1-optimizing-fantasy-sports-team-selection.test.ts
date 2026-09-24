/**
 * Vitest suite for arXiv:2412.19215v1 (Optimizing Fantasy Sports Team Selection with Deep Reinforcement Learning).
 * Gate: Accept the adaptation if the PPO agent's mean percentile rank over the 8 held-out NFL slates ≥ the optimizer baseline's mean percentile by ≥ 5 points, with the improvement consistent across ≥ 5 of 8 slates.
 */
import { describe, it, expect } from "vitest";
import { ppoSurrogate, gae, twoHeadObjective, ENABLED } from "./2412-19215v1-optimizing-fantasy-sports-team-selection";

describe("2412-19215v1 two-headed PPO (disabled)", () => {
  it("clipped surrogate is bounded by the clip", () => {
    const steps = [{ ratio: 3, advantage: 1 }];
    expect(ppoSurrogate(steps, 0.2)).toBeCloseTo(1.2, 10);
    expect(ppoSurrogate([{ ratio: 0.5, advantage: -1 }], 0.2)).toBeCloseTo(-0.8, 10);
    expect(() => ppoSurrogate([], 0.2)).toThrow();
  });
  it("GAE reduces to TD error at lambda=0", () => {
    const adv = gae([1, 0], [0.5, 0.5, 0], 1, 0);
    expect(adv[0]).toBeCloseTo(1.0, 10);
    expect(adv[1]).toBeCloseTo(-0.5, 10);
    expect(() => gae([1], [0.5], 1, 0.9)).toThrow();
  });
  it("two-head objective weights cash vs GPP", () => {
    const s = [{ ratio: 1, advantage: 2 }];
    expect(twoHeadObjective(s, s, 0.2, 1, 0)).toBeCloseTo(2, 10);
    expect(twoHeadObjective(s, s, 0.2, 0.5, 0.5)).toBeCloseTo(2, 10);
  });
  it("is disabled pending the trained policy and field simulator", () => {
    expect(ENABLED).toBe(false);
  });
});

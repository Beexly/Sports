import { describe, expect, it } from "vitest";
import {
  expectedSeasonGoals,
  gammaPoissonPosterior,
  jeffreysGoalPrior,
} from "./gamma-poisson-goals.js";

describe("gamma-poisson goals", () => {
  it("updates the Jeffreys prior and projects the posterior mean", () => {
    const prior = jeffreysGoalPrior(10, 20);
    expect(prior.alpha).toBe(10.5);
    expect(prior.beta).toBe(20.5);
    const post = gammaPoissonPosterior(prior, 4, 8);
    expect(post.meanRate).toBeCloseTo(14.5 / 28.5);
    expect(expectedSeasonGoals(post, 4, 10)).toBeCloseTo(4 + (14.5 / 28.5) * 10);
  });

  it("rejects a negative match count", () => {
    expect(() => jeffreysGoalPrior(1, -1)).toThrow(/non-negative/);
  });
});

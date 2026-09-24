/**
 * Tests for ./2606-26497v1-bayesian-update (arXiv:2606.26497v1, lane=bayesian).
 *
 * ACCEPTANCE GATE: ADAPT into a GSE game-state module if the energy-score-trained NN filter matches the particle filter within 5% energy-score on simulated NFL game-state trajectories with N≤100 at inference time.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2606-26497v1-bayesian-update";

describe("2606-26497v1 Learning Probabilistic Filters with Strictly Proper", () => {
  it("beta-binomial update folds in observed successes", () => {
    const p = mod.betaBinomialUpdate(1, 1, 7, 10)!;
    expect(p.alpha).toBe(8);
    expect(p.beta).toBe(4);
    expect(p.mean).toBeCloseTo(8 / 12, 10);
    expect(mod.betaBinomialUpdate(1, 1, 11, 10)).toBeNull();
  });
  it("normal-normal update shrinks toward data and variance", () => {
    const p = mod.normalNormalUpdate(0, 1, 10, 1, 100)!;
    expect(p.mean).toBeCloseTo(9.901, 2);
    expect(p.var).toBeLessThan(1);
    expect(mod.normalNormalUpdate(0, -1, 10, 1, 100)).toBeNull();
  });
  it("credible interval is symmetric at 1.96 sd", () => {
    expect(mod.credibleInterval95(0, 1)).toEqual([-1.96, 1.96]);
    expect(mod.credibleInterval95(0, -1)).toBeNull();
  });
});

/**
 * Tests for ./2507-06122-bayesian-update (arXiv:2507.06122, lane=bayesian).
 *
 * ACCEPTANCE GATE: ADOPT if adding the shiftiness feature improves out-of-sample prediction of next-season YAC/attempt or missed-tackle rate over the current RB/WR feature set by >=0.02 R^2 (or significant at alpha=0.05); REJECT if no stable year-over-year signal.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2507-06122-bayesian-update";

describe("2507-06122 A Bayesian circular mixed-effects model for", () => {
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

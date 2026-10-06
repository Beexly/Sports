/**
 * Tests for ./nonparametric-eb-shrinkage (arXiv:1606.02011v3, lane=win_spread_total).
 *
 * ACCEPTANCE GATE: ADOPT as a GSE shrinkage layer if bivariate NPMLE beats both raw MLE and parametric hierarchical
 * Bayes on the 2016-2024 first-half->second-half test with relative MSE <= 0.95 of the parametric-
 * HB baseline in at least two of the three target families (QB efficiency, skill-player
 * efficiency, team offense).
 */

import { describe, expect, it } from "vitest";
import * as mod from "./nonparametric-eb-shrinkage";

describe("nonparametric EB shrinkage (arXiv:1606.02011v3)", () => {
  it("shrinks toward the grand mean", () => {
    const s = mod.jamesSteinShrink([0.5, 0.1, -0.2, 0.3, 0.0], [0.1, 0.1, 0.1, 0.1, 0.1])!;
    const m = (0.5 + 0.1 - 0.2 + 0.3 + 0.0) / 5;
    expect(Math.abs(s[0]! - m)).toBeLessThan(Math.abs(0.5 - m));
  });
  it("null on degenerate input", () => {
    expect(mod.jamesSteinShrink([1, 2], [0.1, 0.1])).toBeNull();
    expect(mod.jamesSteinShrink([1, 2, 3], [0.1, 0])).toBeNull();
  });
  it("posteriorMeanShrink weights by precision", () => {
    expect(mod.posteriorMeanShrink(1, 0.001, 1)).toBeCloseTo(1, 3);
    expect(mod.posteriorMeanShrink(1, 10, 0.0001)).toBeCloseTo(0, 3);
    expect(mod.posteriorMeanShrink(1, 0, 1)).toBeNull();
  });
  it("bivariate shrink keeps pairs aligned", () => {
    const out = mod.bivariateShrink([0.5, 0.1, -0.2], [0.3, 0.2, 0.4], [0.1, 0.1, 0.1], [0.05, 0.05, 0.05])!;
    expect(out).toHaveLength(3);
    expect(out[0]!.mean).not.toBeNaN();
  });
  it("relativeMSE <= 1 when shrinkage helps", () => {
    const truth = [0.1, 0.1, 0.1, 0.1, 0.1];
    const raw = [0.9, -0.5, 0.4, 0.2, -0.1];
    const shrunk = mod.jamesSteinShrink(raw, [0.3, 0.3, 0.3, 0.3, 0.3])!;
    expect(mod.relativeMSE(shrunk, raw, truth)!).toBeLessThan(1);
  });
});

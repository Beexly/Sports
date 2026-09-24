/**
 * Tests for ./regression-model-uncertainty (arXiv:2108.02140v1, lane=calibration).
 *
 * ACCEPTANCE GATE: Adopt if: Robust-LSE reduces mean |beta-hat - 1| by >= 20% relative to OLS at K=4 with T~=1000
 * injected games, AND the recovered (sigma-hat-underbar, sigma-hat-bar) bracket the injected
 * (3,10) bounds within +-1.5 points.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./regression-model-uncertainty";

describe("regression model uncertainty (arXiv:2108.02140v1)", () => {
  const fits = [
    { modelId: "m1", bic: 100, features: ["a", "b"], r2: 0.8 },
    { modelId: "m2", bic: 102, features: ["a"], r2: 0.75 },
    { modelId: "m3", bic: 110, features: ["c"], r2: 0.5 },
  ];
  it("weights favor lowest BIC and normalize", () => {
    const w = mod.bmaWeights(fits)!;
    expect(w.reduce((s, x) => s + x.weight, 0)).toBeCloseTo(1, 10);
    expect(w[0]!.weight).toBeGreaterThan(w[1]!.weight);
    expect(mod.bmaWeights([])).toBeNull();
  });
  it("inclusion probabilities", () => {
    const w = mod.bmaWeights(fits)!;
    const pip = mod.inclusionProbs(fits, w)!;
    expect(pip["a"]).toBeCloseTo(w[0]!.weight + w[1]!.weight, 10);
    expect(pip["b"]).toBeCloseTo(w[0]!.weight, 10);
  });
  it("BMA coefficient", () => {
    const wf = fits.map((f, i) => ({ ...f, coefs: { a: i + 1 } }));
    const w = mod.bmaWeights(fits)!;
    const c = mod.bmaCoefficient(wf, w, "a")!;
    expect(c).toBeGreaterThan(1);
    expect(c).toBeLessThan(3);
    expect(mod.bmaCoefficient(wf, w, "zzz")).toBe(0);
  });
  it("model uncertainty entropy", () => {
    const w = mod.bmaWeights(fits)!;
    const h = mod.modelUncertainty(w)!;
    expect(h).toBeGreaterThan(0);
    expect(h).toBeLessThan(Math.log(3));
    expect(mod.modelUncertainty([])).toBeNull();
  });
});

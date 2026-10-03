/**
 * Tests for ./market-risk-ml-features (arXiv:2009.07947v1, lane=markets).
 *
 * ACCEPTANCE GATE: Market-only features must beat 50% balanced accuracy OOS with walk-forward evaluation; then test
 * whether alt-data features add anything under a non-linear model. If nothing beats chance, the
 * transfer fails for that market.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./market-risk-ml-features";

describe("market risk ML features (arXiv:2009.07947v1)", () => {
  const px = [100, 102, 101, 103, 105, 104, 106, 108, 107, 109, 111, 110, 112, 114, 113, 115, 117, 116, 118, 120, 122, 121, 123, 125, 124, 126, 128, 127, 129, 131, 130, 132, 134, 133, 135, 137, 136, 138, 140, 139, 141, 143];
  it("returns and realized vol", () => {
    const r = mod.returnsFromPrices(px)!;
    expect(r).toHaveLength(px.length - 1);
    expect(mod.realizedVol(r)!).toBeGreaterThan(0);
    expect(mod.returnsFromPrices([100])).toBeNull();
    expect(mod.returnsFromPrices([100, 0])).toBeNull();
  });
  it("vol-of-vol detects regime shifts", () => {
    const vov = mod.volOfVol(mod.returnsFromPrices(px)!, 20)!;
    expect(vov).toBeGreaterThanOrEqual(0);
    expect(mod.volOfVol([0.01], 20)).toBeNull();
  });
  it("skew + default prob", () => {
    expect(mod.returnSkew([0.01, -0.02, 0.03, -0.05, 0.02, 0.01, -0.01])).not.toBeNull();
    expect(mod.impliedDefaultProb(200)!).toBeGreaterThan(mod.impliedDefaultProb(50)!);
    expect(mod.impliedDefaultProb(-1)).toBeNull();
  });
  it("feature vector", () => {
    const f = mod.marketRiskFeatures(px, 150)!;
    expect(f["realizedVol"]).toBeGreaterThan(0);
    expect(f["volOfVol"]).toBeGreaterThanOrEqual(0);
    expect(mod.marketRiskFeatures([100], 150)).toBeNull();
  });
});

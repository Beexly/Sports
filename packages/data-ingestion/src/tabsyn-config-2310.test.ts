import { describe, expect, it } from "vitest";
import {
  quantileTransform, inverseNormalCdf, columnDensityError, tabsynGatePasses,
  TABSYN_DEFAULT_CONFIG, GSE_TABSYN_ENABLED,
} from "./tabsyn-config-2310.js";

describe("tabsyn config", () => {
  it("tokenizer uses d=4 per column including team", () => {
    expect(TABSYN_DEFAULT_CONFIG.tokenDim).toBe(4);
    expect(TABSYN_DEFAULT_CONFIG.categoricalColumns).toContain("team");
  });
  it("quantile transform is monotone and centered", () => {
    const t = quantileTransform([10, 20, 30, 40, 50]);
    const diffs = t.slice(1).map((v, i) => v - (t[i] ?? v));
    expect(diffs.every((d) => d > 0)).toBe(true);
    expect(t.reduce((a, b) => a + b, 0) / t.length).toBeCloseTo(0, 1);
  });
  it("inverseNormalCdf inverts the median and tails", () => {
    expect(inverseNormalCdf(0.5)).toBeCloseTo(0, 6);
    expect(inverseNormalCdf(0.975)).toBeCloseTo(1.96, 2);
  });
  it("column density error is 0 on identical samples", () => {
    const xs = [1, 2, 3, 4, 5];
    expect(columnDensityError(xs, xs)).toBeCloseTo(0, 10);
    expect(columnDensityError(xs, [])).toBe(1);
  });
  it("gate requires <= 50% of TabDDPM error", () => {
    expect(tabsynGatePasses(0.04, 0.1)).toBe(true);
    expect(tabsynGatePasses(0.06, 0.1)).toBe(false);
  });
  it("stays off until the density gate clears", () => {
    expect(GSE_TABSYN_ENABLED).toBe(false);
  });
  it("handles empty input", () => {
    expect(quantileTransform([])).toEqual([]);
  });
  it("handles edge inputs", () => {
    // single value maps to the median of the standard normal
    expect(quantileTransform([42])).toHaveLength(1);
    expect(quantileTransform([42])[0]).toBeCloseTo(0, 10);
    // constant values: ranks tie-break by order, still finite
    const c = quantileTransform([5, 5, 5]);
    expect(c.every(Number.isFinite)).toBe(true);
    // gate with zero baseline never passes
    expect(tabsynGatePasses(0, 0)).toBe(false);
  });
});


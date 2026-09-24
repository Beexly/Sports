import { describe, expect, it } from "vitest";
import { expectedUtility, bpdsWeights, bmaWeights, GSE_BPDS_WEIGHTING_ENABLED } from "./decision-utility-weighting-2406.js";

describe("decision utility weighting", () => {
  it("bpds weights sum to 1 and favor higher utility", () => {
    const w = bpdsWeights([0.5, 0.1, -0.2]);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(w[0] ?? Number.NaN).toBeGreaterThan(w[1] ?? Number.NaN);
    expect(w[1] ?? Number.NaN).toBeGreaterThan(w[2] ?? Number.NaN);
  });
  it("tau=0 gives uniform weights", () => {
    expect(bpdsWeights([0.9, 0.1], 0)).toEqual([0.5, 0.5]);
  });
  it("bma weights match bpds with tau=1", () => {
    expect(bmaWeights([0.5, 0.1])).toEqual(bpdsWeights([0.5, 0.1], 1));
  });
  it("expected utility is 0 on empty densities or zero stakes", () => {
    expect(expectedUtility({ model: "m", probs: [] }, { spread: 1, total: 1, moneyline: 1 }, [])).toBe(0);
    expect(expectedUtility({ model: "m", probs: [0.5, 0.5] }, { spread: 0, total: 0, moneyline: 0 }, [0.1, -0.1])).toBe(0);
  });
  it("stays off until the ROI gate clears", () => {
    expect(GSE_BPDS_WEIGHTING_ENABLED).toBe(false);
  });
});


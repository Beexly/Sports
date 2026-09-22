/**
 * Tests for ./melo-spread-cdf (arXiv:1802.00527v1, lane=markets).
 *
 * ACCEPTANCE GATE: ADAPT confirmed if the melo spread CDF's log score on 2024 NFL is within 0.01 of GSE's current
 * margin model AND the ordered-logit-smoothed version beats raw melo on tail calibration (extreme-
 * spread buckets).
 */

import { describe, expect, it } from "vitest";
import * as mod from "./melo-spread-cdf";

describe("melo spread CDF (arXiv:1802.00527v1)", () => {
  const margins = [-10, -3, 0, 3, 7, 10, 14];
  const grid = [-14, -7, 0, 7, 14];
  it("empirical CDF monotone", () => {
    const cdf = mod.empiricalSpreadCDF(margins, grid)!;
    for (let i = 1; i < cdf.length; i++) expect(cdf[i]!.p).toBeGreaterThanOrEqual(cdf[i - 1]!.p);
    expect(cdf[cdf.length - 1]!.p).toBe(1);
  });
  it("PAV enforces monotonicity", () => {
    expect(mod.pavIsotonic([0.5, 0.3, 0.8, 0.6])).toEqual([0.4, 0.4, 0.7, 0.7]);
    expect(mod.pavIsotonic([])).toBeNull();
  });
  it("smoothed CDF valid", () => {
    const sm = mod.smoothedSpreadCDF(margins, grid)!;
    expect(sm.every((e) => e.p >= 0 && e.p <= 1)).toBe(true);
  });
  it("cover prob from CDF", () => {
    const sm = mod.smoothedSpreadCDF(margins, grid)!;
    const p = mod.coverProbFromCDF(sm, -7)!;
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
    expect(mod.coverProbFromCDF([], -7)).toBeNull();
  });
  it("log score finite", () => {
    const sm = mod.smoothedSpreadCDF(margins, grid)!;
    const ll = mod.spreadLogScore(sm, [3, -3])!;
    expect(Number.isFinite(ll)).toBe(true);
    expect(mod.spreadLogScore(sm, [])).toBeNull();
  });
});

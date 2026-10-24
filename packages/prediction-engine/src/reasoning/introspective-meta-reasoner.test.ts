import { describe, expect, it } from "vitest";
import {
  TOOMRE_TL,
  falsifiabilityFloorHolds,
  gaussianCollapseWeight,
  multiScaleRefinementHolds,
  teagContraction,
  toomreTorsion,
} from "./introspective-meta-reasoner.js";

describe("TEAG scalars", () => {
  it("contracts by tropical max", () => {
    expect(teagContraction(0.2, 0.7)).toBe(0.7);
    expect(teagContraction(0.9, 0.1)).toBe(0.9);
  });

  it("holds the falsifiability floor only when N_k >= 1 - I_k", () => {
    expect(falsifiabilityFloorHolds(0.4, 0.7)).toBe(true);
    expect(falsifiabilityFloorHolds(0.2, 0.7)).toBe(false);
  });

  it("collapses toward 0 as W grows and is 1 at W = 0", () => {
    expect(gaussianCollapseWeight(0, 1)).toBeCloseTo(1, 8);
    expect(gaussianCollapseWeight(1, 1)).toBeCloseTo(Math.exp(-1), 8);
    expect(Number.isNaN(gaussianCollapseWeight(1, 0))).toBe(true);
  });

  it("compares Toomre tau to the stated TL and refuses p = 0", () => {
    expect(toomreTorsion(0.2, 1)?.aboveTl).toBe(true);
    expect(toomreTorsion(0.1, 1)?.tau).toBeCloseTo(0.1, 8);
    expect(toomreTorsion(0.1, 1)!.tau > TOOMRE_TL).toBe(false);
    expect(toomreTorsion(1, 0)).toBeNull();
  });

  it("requires non-increasing non-negative residuals across grids", () => {
    expect(
      multiScaleRefinementHolds([
        { label: "32", residual: 0.2 },
        { label: "64", residual: 0.1 },
        { label: "128", residual: 0.05 },
      ]),
    ).toBe(true);
    expect(
      multiScaleRefinementHolds([
        { label: "32", residual: 0.05 },
        { label: "64", residual: 0.2 },
      ]),
    ).toBe(false);
  });
});

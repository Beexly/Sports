/**
 * Tests for ./dl-feature-selection (arXiv:2111.09695v1, lane=markets).
 *
 * ACCEPTANCE GATE: ADAPT (weak) confirmed iff under strict walk-forward, Elo-based features match or beat Four-
 * Factors features on AUC (difference >= -0.005 tolerated given the paper's pooled-CV inflation);
 * if Four Factors win walk-forward, the paper's finding is a CV artifact — keep the audit harness.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./dl-feature-selection";

describe("DL feature selection (arXiv:2111.09695v1)", () => {
  const X = [
    [1, 0, 5],
    [2, 0, 5],
    [3, 1, 5],
    [4, 1, 5],
  ];
  const score = (M: readonly number[][]): number | null => {
    let s = 0;
    for (const row of M) s += (row[0] ?? 0) * (row[1] ?? 0);
    return s;
  };
  it("permutation importance finds the signal column", () => {
    const imp0 = mod.permutationImportance(X, score, 0)!;
    const imp2 = mod.permutationImportance(X, score, 2)!;
    expect(Math.abs(imp0)).toBeGreaterThan(Math.abs(imp2));
    expect(mod.permutationImportance(X, score, 9)).toBeNull();
    expect(mod.permutationImportance([], score, 0)).toBeNull();
  });
  it("rankFeatures orders", () => {
    const r = mod.rankFeatures(X, score, ["a", "b", "c"])!;
    expect(r[0]!.feature).toBe("a");
    expect(mod.rankFeatures(X, score, ["a"])).toBeNull();
  });
  it("gradient attribution", () => {
    const g = mod.gradientAttribution([1, 2], (x) => (x[0] ?? 0) * 3 + (x[1] ?? 0))!;
    expect(g[0]).toBeCloseTo(3, 1);
    expect(g[1]).toBeCloseTo(2, 1);
    expect(mod.gradientAttribution([], (x) => 1)).toBeNull();
  });
  it("selectFeatures keeps top frac", () => {
    const r = [{ feature: "a", importance: 3 }, { feature: "b", importance: 2 }, { feature: "c", importance: 1 }];
    expect(mod.selectFeatures(r, 0.5)).toEqual(["a"]);
    expect(mod.selectFeatures([], 0.5)).toEqual([]);
  });
});

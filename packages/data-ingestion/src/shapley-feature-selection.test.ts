/**
 * Tests for ./shapley-feature-selection (arXiv:2304.14774v3, lane=auto_feature_eng).
 *
 * ACCEPTANCE GATE: Adopt SHAPEffects pruning iff on the 2024 and 2025 held-out test seasons it reduces MAE vs the
 * full-feature baseline by >= 0.15 points AND beats Boruta/Lasso on at least one of the two
 * seasons, with the elimination list stable (>=50% overlap) across the two runs; reject if it
 * merely matches SOTA selectors, eliminates >40% of features, or the dropped-feature sign check
 * fails.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./shapley-feature-selection";

describe("Shapley feature selection (arXiv:2304.14774v3)", () => {
  const v = (s: ReadonlySet<string>): number | null => (s.has("a") ? 2 : 0) + (s.has("b") ? 1 : 0);
  it("shapley recovers contributions", () => {
    const phi = mod.shapleyValues(["a", "b", "c"], v, 400, 7)!;
    expect(phi["a"]).toBeCloseTo(2, 0);
    expect(phi["b"]).toBeCloseTo(1, 0);
    expect(phi["c"]).toBeCloseTo(0, 0);
    expect(mod.shapleyValues([], v)).toBeNull();
  });
  it("shift-robust takes the min", () => {
    const r = mod.shiftRobustShapley([{ a: 2, b: 1 }, { a: 0.5, b: 1.2 }])!;
    expect(r["a"]).toBeCloseTo(0.5, 10);
    expect(r["b"]).toBeCloseTo(1, 10);
    expect(mod.shiftRobustShapley([])).toBeNull();
  });
  it("selectTopK", () => {
    expect(mod.selectTopK({ a: 2, b: 1, c: 0.5 }, 2)).toEqual(["a", "b"]);
    expect(mod.selectTopK({ a: 1 }, 0)).toEqual([]);
  });
});

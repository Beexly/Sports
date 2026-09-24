/**
 * Tests for ./2508-14667-feature-construction (arXiv:2508.14667, lane=auto_feature_eng).
 *
 * ACCEPTANCE GATE: ADAPT if >=0.003 held-out NFL log-loss improvement on the 2025 test games vs the no-LLM-feature baseline, with no post-kickoff leakage (AST scan shows zero negative shifts; all aggregations causal), and >=60% of selected features passing human review.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2508-14667-feature-construction";

describe("2508-14667 ELATE: Evolutionary Language model for Automated", () => {
  it("lag matrix aligns trailing values", () => {
    expect(mod.lagFeatures([1, 2, 3, 4, 5], [1, 2])).toEqual([[2, 1], [3, 2], [4, 3]]);
    expect(mod.lagFeatures([1, 2], [1, 2])).toBeNull();
    expect(mod.lagFeatures([1, 2, 3], [0])).toBeNull();
  });
  it("rolling stats compute trailing mean/sd", () => {
    const r = mod.rollingStats([1, 2, 3, 4], 2)!;
    expect(r.length).toBe(3);
    expect(r[0]!.mean).toBeCloseTo(1.5, 10);
    expect(r[0]!.sd).toBeCloseTo(0.5, 10);
    expect(mod.rollingStats([1], 2)).toBeNull();
  });
  it("interaction terms multiply element-wise", () => {
    expect(mod.interactionTerms([1, 2, 3], [4, 5, 6])).toEqual([4, 10, 18]);
    expect(mod.interactionTerms([1], [1, 2])).toBeNull();
  });
});

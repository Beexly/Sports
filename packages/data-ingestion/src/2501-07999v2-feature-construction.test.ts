/**
 * Tests for ./2501-07999v2-feature-construction (arXiv:2501.07999v2, lane=auto_feature_eng).
 *
 * ACCEPTANCE GATE: Adopt the window→tsfresh→IF shock detector iff on the 2024–2025 odds-trajectory test it achieves AUC ≥ 0.70 on steam/shock windows AND beats raw-window IF with Wilcoxon p < 0.05, with per-window inference cost < 5 s.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2501-07999v2-feature-construction";

describe("2501-07999v2 Unsupervised Feature Construction for Anomaly Detection", () => {
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

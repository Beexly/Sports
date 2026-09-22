/**
 * Tests for ./frans-ts-features (arXiv:2209.07018v1, lane=auto_feature_eng).
 *
 * ACCEPTANCE GATE: Adopt FRANS embeddings iff the meta-learner with FRANS features beats the handcrafted-feature
 * meta-learner by >= 0.004 log-loss on 2024-2025 walk-forward AND the leakage audit passes (zero
 * windows crossing the prediction boundary) AND per-team-season embedding stability holds (within-
 * season cosine distance < 0.5x between-season distance); reject if the win is sub-noise or
 * embeddings collapse.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./frans-ts-features";

describe("FRANS time-series features (arXiv:2209.07018v1)", () => {
  const x = [1, 3, 2, 4, 3, 5, 4, 6, 5, 7];
  it("full vector", () => {
    const f = mod.fransFeatures(x)!;
    expect(f.mean).toBeCloseTo(4, 10);
    expect(f.ac1).toBeGreaterThan(0);
    expect(f.nCrossings).toBeGreaterThan(0);
    expect(f.entropy).toBeGreaterThan(0);
    expect(mod.fransFeatures([1, 1, 1, 1])).toBeNull();
    expect(mod.fransFeatures([1, 2])).toBeNull();
  });
  it("ac1 of alternating series negative", () => {
    expect(mod.ac1([1, -1, 1, -1, 1, -1])!).toBeLessThan(0);
    expect(mod.ac1([5, 5, 5])).toBeNull();
  });
  it("hist entropy", () => {
    expect(mod.histEntropy([1, 2, 3, 4], 2)).toBeCloseTo(Math.log(2), 10);
    expect(mod.histEntropy([1, 1, 1], 4)).toBe(0);
    expect(mod.histEntropy([], 4)).toBeNull();
  });
});

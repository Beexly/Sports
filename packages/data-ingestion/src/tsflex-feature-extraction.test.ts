/**
 * Tests for ./tsflex-feature-extraction (arXiv:2111.12429v2, lane=auto_feature_eng).
 *
 * ACCEPTANCE GATE: Adopt iff the reproducibility test passes all three criteria: exact numerical match (1e-9) with
 * hand-rolled features, >=2x speedup on the full 32-team rebuild, correct gap handling — AND the
 * pinned version's API supports multi-window registration, serialization, multiprocessing without
 * workarounds.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./tsflex-feature-extraction";

describe("tsflex feature extraction (arXiv:2111.12429v2)", () => {
  const spec = { window: 3, stride: 2, ops: ["mean", "max", "slope"] as const };
  it("windowed extraction", () => {
    const rows = mod.extractWindowed([1, 2, 3, 4, 5, 6], spec)!;
    expect(rows).toHaveLength(2);
    expect(rows[0]!.mean).toBeCloseTo(2, 10);
    expect(rows[1]!.max).toBe(5);
    expect(mod.extractWindowed([], spec)).toBeNull();
  });
  it("ops", () => {
    expect(mod.applyOp([1, 2, 3], "mean")).toBeCloseTo(2, 10);
    expect(mod.applyOp([1, 2, 3], "slope")).toBeCloseTo(1, 10);
    expect(mod.applyOp([5], "slope")).toBe(0);
    expect(mod.applyOp([], "mean")).toBeNull();
    expect(mod.applyOp([3, 1, 2], "range")).toBe(2);
  });
  it("feature names", () => {
    expect(mod.featureNames(spec, "epa")).toEqual(["epa_w3_mean", "epa_w3_max", "epa_w3_slope"]);
    expect(mod.featureNames({ window: 0, stride: 1, ops: [] }, "x")).toBeNull();
  });
  it("isWindowSpec rejects malformed", () => {
    expect(mod.isWindowSpec({ window: 3, stride: 1, ops: ["nope"] })).toBe(false);
  });
});

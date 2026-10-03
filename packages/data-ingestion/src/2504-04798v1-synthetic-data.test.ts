/**
 * Tests for ./2504-04798v1-synthetic-data (arXiv:2504.04798v1, lane=synthetic_data).
 *
 * ACCEPTANCE GATE: ADOPT TabRep (Flow variant) as the fast-sampling backbone if: (a) log-loss gain ≥0.003 on held-out 2024, AND (b) Elo-ordered beats lexicographic on pair-correlation fidelity by ≥10% relative, AND (c) OOI-cast index-0 bias ≤ 25% relative overrepresentation vs uniform.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2504-04798v1-synthetic-data";

describe("2504-04798v1 TabRep: Roots-of-Unity Categorical Encoding for Unified", () => {
  it("mulberry32 is deterministic per seed", () => {
    const r1 = mod.mulberry32(42);
    const r2 = mod.mulberry32(42);
    expect(r1()).toBe(r2());
    expect(r1()).toBe(r2());
    expect(mod.mulberry32(42)()).not.toBe(mod.mulberry32(43)());
  });
  it("gaussian samples center near zero", () => {
    const rng = mod.mulberry32(7);
    let s = 0;
    const n = 2000;
    for (let i = 0; i < n; i++) s += mod.gaussianSample(rng);
    const m = s / n;
    expect(m).toBeGreaterThan(-0.1);
    expect(m).toBeLessThan(0.1);
  });
  it("synthetic rows follow the column specs", () => {
    const rng = mod.mulberry32(1);
    const row = mod.synthTabularRow(rng, [{ mean: 100, sd: 0 }, { mean: 0, sd: 1 }])!;
    expect(row[0]).toBeCloseTo(100, 10);
    expect(typeof row[1]).toBe("number");
    expect(mod.synthTabularRow(rng, [])).toBeNull();
  });
  it("k-anonymity check enforces group sizes", () => {
    const rows = [["a", "x"], ["a", "x"], ["b", "y"], ["b", "y"]];
    expect(mod.kAnonymityHolds(rows, [0], 2)).toBe(true);
    expect(mod.kAnonymityHolds(rows, [0], 3)).toBe(false);
    expect(mod.kAnonymityHolds(rows, [0, 1], 2)).toBe(true);
  });
});

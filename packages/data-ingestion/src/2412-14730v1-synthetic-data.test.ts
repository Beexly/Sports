/**
 * Tests for ./2412-14730v1-synthetic-data (arXiv:2412.14730v1, lane=synthetic_data).
 *
 * ACCEPTANCE GATE: ADOPT the five-category framework (+ TSTR) as the lane's mandatory acceptance rubric if: (a) the harness reproduces the paper's qualitative ranking on a finance-adjacent sanity dataset (FinDiff ≥ TVAE ≥ CTGAN on fidelity), AND (b) every lane generator can be scored end-to-end; graph experiment target: NetSimile ≤19 while holding column fidelity ≥0.90.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2412-14730v1-synthetic-data";

describe("2412-14730v1 Generative AI for Banks: Benchmarks and", () => {
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

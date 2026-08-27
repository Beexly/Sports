import { describe, it, expect } from "vitest";
import {
  fitHierarchicalBetaShrinkage,
  shrinkCellsTowardGlobal,
  type CellBetaFit,
} from "../hierarchical-calibration.js";

describe("shrinkCellsTowardGlobal", () => {
  it("computes the exact hand-verified shrinkage formula for a single cell", () => {
    const cellFits: CellBetaFit[] = [{ cell: "x", a: 2.0, b: -1.0, n: 10 }];
    const shrunk = shrinkCellsTowardGlobal(cellFits, 1.0, 0.0, 25);
    // a: (10*2.0 + 25*1.0) / (10+25) = 45/35 — full precision, unrounded
    expect(shrunk[0]!.a).toBeCloseTo(45 / 35, 10);
    // b: (10*-1.0 + 25*0.0) / 35 = -10/35
    expect(shrunk[0]!.b).toBeCloseTo(-10 / 35, 10);
    expect(shrunk[0]!.rawA).toBe(2.0);
    expect(shrunk[0]!.rawB).toBe(-1.0);
    expect(shrunk[0]!.n).toBe(10);
  });

  it("a cell with n=0 is shrunk entirely to the global", () => {
    const shrunk = shrinkCellsTowardGlobal([{ cell: "empty", a: 5, b: 5, n: 0 }], 1.2, -0.4, 25);
    expect(shrunk[0]!.a).toBeCloseTo(1.2, 10);
    expect(shrunk[0]!.b).toBeCloseTo(-0.4, 10);
  });

  it("a cell with n much greater than strength is barely shrunk", () => {
    const shrunk = shrinkCellsTowardGlobal([{ cell: "huge", a: 3.0, b: 0, n: 1_000_000 }], 1.0, 0, 25);
    expect(shrunk[0]!.a).toBeCloseTo(3.0, 4);
  });
});

describe("fitHierarchicalBetaShrinkage", () => {
  it("returns the identity global and no cells on empty input", () => {
    const result = fitHierarchicalBetaShrinkage([]);
    expect(result.globalA).toBe(1);
    expect(result.globalB).toBe(0);
    expect(result.cells).toEqual([]);
    expect(result.converged).toBe(true);
    expect(result.iterations).toBe(0);
  });

  it("a single cell is unaffected by shrinkage (the global starts exactly at its own value)", () => {
    const result = fitHierarchicalBetaShrinkage([{ cell: "solo", a: 1.7, b: 0.3, n: 50 }], 25);
    expect(result.cells[0]!.a).toBeCloseTo(1.7, 8);
    expect(result.cells[0]!.b).toBeCloseTo(0.3, 8);
    expect(result.converged).toBe(true);
  });

  it("converges to a self-consistent fixed point: re-shrinking with the converged global reproduces the same global", () => {
    const cellFits: CellBetaFit[] = [
      { cell: "thin", a: 2.0, b: 0.5, n: 10 },
      { cell: "thick", a: 1.0, b: -0.2, n: 100 },
      { cell: "mid", a: 1.5, b: 0.1, n: 40 },
    ];
    const result = fitHierarchicalBetaShrinkage(cellFits, 25);
    expect(result.converged).toBe(true);

    const reShrunk = shrinkCellsTowardGlobal(cellFits, result.globalA, result.globalB, 25);
    const totalN = reShrunk.reduce((s, c) => s + c.n, 0);
    const reGlobalA = reShrunk.reduce((s, c) => s + c.a * c.n, 0) / totalN;
    const reGlobalB = reShrunk.reduce((s, c) => s + c.b * c.n, 0) / totalN;
    // result.globalA/B are rounded to 6dp for reporting; re-deriving through
    // unrounded arithmetic starting from that rounded input reproduces it to
    // within the rounding error itself (~1e-6), not tighter.
    expect(reGlobalA).toBeCloseTo(result.globalA, 6);
    expect(reGlobalB).toBeCloseTo(result.globalB, 6);
  });

  it("a thin cell shrinks proportionally more toward the global than a thick cell with the same raw value", () => {
    const cellFits: CellBetaFit[] = [
      { cell: "thin", a: 3.0, b: 0, n: 5 },
      { cell: "thick", a: 3.0, b: 0, n: 500 }, // same raw a, vastly more evidence
      { cell: "anchor", a: 1.0, b: 0, n: 500 }, // pulls the global toward 1
    ];
    const result = fitHierarchicalBetaShrinkage(cellFits, 25);
    const thin = result.cells.find((c) => c.cell === "thin")!;
    const thick = result.cells.find((c) => c.cell === "thick")!;
    expect(Math.abs(thin.a - 3.0)).toBeGreaterThan(Math.abs(thick.a - 3.0));
  });

  it("preserves raw (pre-shrinkage) values alongside the shrunk ones, for audit", () => {
    const result = fitHierarchicalBetaShrinkage([{ cell: "x", a: 2.5, b: 0.9, n: 5 }], 25);
    expect(result.cells[0]!.rawA).toBe(2.5);
    expect(result.cells[0]!.rawB).toBe(0.9);
  });

  it("reports converged=false when maxIterations is exhausted before the tolerance is met", () => {
    const cellFits: CellBetaFit[] = [
      { cell: "a", a: 5.0, b: 2.0, n: 10 },
      { cell: "b", a: 0.5, b: -2.0, n: 500 },
    ];
    const result = fitHierarchicalBetaShrinkage(cellFits, 25, 1, 1e-15);
    expect(result.iterations).toBe(1);
    expect(result.converged).toBe(false);
    // Still returns well-formed, finite output even when capped.
    expect(Number.isFinite(result.globalA)).toBe(true);
    expect(result.cells).toHaveLength(2);
  });

  it("throws on a non-positive or non-finite strength", () => {
    expect(() => fitHierarchicalBetaShrinkage([{ cell: "x", a: 1, b: 0, n: 10 }], 0)).toThrow(RangeError);
    expect(() => fitHierarchicalBetaShrinkage([{ cell: "x", a: 1, b: 0, n: 10 }], -5)).toThrow(RangeError);
    expect(() => fitHierarchicalBetaShrinkage([{ cell: "x", a: 1, b: 0, n: 10 }], NaN)).toThrow(RangeError);
  });

  it("is deterministic across repeated runs", () => {
    const cellFits: CellBetaFit[] = [
      { cell: "a", a: 2.1, b: 0.4, n: 30 },
      { cell: "b", a: 0.8, b: -0.6, n: 12 },
    ];
    const r1 = fitHierarchicalBetaShrinkage(cellFits, 25);
    const r2 = fitHierarchicalBetaShrinkage(cellFits, 25);
    expect(r1).toEqual(r2);
  });
});

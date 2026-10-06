import { describe, it, expect } from "vitest";
import {
  pava,
  nearIsotonicFit,
  bicScore,
  enirPath,
  evalBreakpoint,
  bicWeights,
  holdoutWeights,
  enirCalibrate,
} from "@/lib/calibration/enir";

// ============================================================
// arXiv 1511.05191v1 — ENIR ensemble. Additive only.
// ============================================================

function isNonDecreasing(xs: readonly number[]): boolean {
  for (let i = 1; i < xs.length; i++) if (xs[i]! < xs[i - 1]!) return false;
  return true;
}

describe("ENIR — 1511.05191v1", () => {
  it("nearIsotonicFit at lambda 0 equals PAVA (exact isotonic)", () => {
    const y = [0, 1, 0, 1, 1, 0, 1];
    expect(nearIsotonicFit(y, 0)).toEqual(pava(y));
  });

  it("nearIsotonicFit output is always non-decreasing (merge-never-splits)", () => {
    const y = [1, 0, 1, 0, 0, 1, 1, 0];
    for (const lam of [0, 1, 5, 50]) {
      expect(isNonDecreasing(nearIsotonicFit(y, lam))).toBe(true);
    }
  });

  it("nearIsotonicFit flattens to the mean at large lambda", () => {
    const y = [0, 1, 0, 1, 1, 1, 0];
    const mean = y.reduce((a, b) => a + b, 0) / y.length;
    const fit = nearIsotonicFit(y, 1e9);
    for (const f of fit) expect(f).toBeCloseTo(mean, 8);
  });

  it("nearIsotonicFit handles empty input", () => {
    expect(nearIsotonicFit([], 1)).toEqual([]);
    expect(pava([])).toEqual([]);
  });

  it("bicScore penalizes extra blocks", () => {
    const y = [0, 0, 1, 1];
    const fit = [0, 0, 1, 1];
    expect(bicScore(y, fit, 4)).toBeGreaterThan(bicScore(y, fit, 2));
  });

  it("enirPath returns one breakpoint per lambda with sane bins", () => {
    const probs = [0.1, 0.3, 0.5, 0.7, 0.9];
    const outcomes = [0, 0, 1, 1, 1];
    const bps = enirPath(probs, outcomes, [0, 2, 10]);
    expect(bps.length).toBe(3);
    for (const bp of bps) {
      expect(bp.values.length + 1).toBe(bp.edges.length);
      expect(bp.edges[0]).toBe(0);
      expect(bp.edges[bp.edges.length - 1]).toBe(1);
      expect(isNonDecreasing(bp.values)).toBe(true);
    }
  });

  it("enirPath handles empty input", () => {
    expect(enirPath([], [], [1])).toEqual([]);
    expect(enirPath([0.5], [1], [])).toEqual([]);
  });

  it("evalBreakpoint maps through bin edges", () => {
    const bp = { lambda: 0, edges: [0, 0.5, 1], values: [0.2, 0.8], bic: 1 };
    expect(evalBreakpoint(bp, 0.1)).toBeCloseTo(0.2, 10);
    expect(evalBreakpoint(bp, 0.9)).toBeCloseTo(0.8, 10);
  });

  it("bicWeights and holdoutWeights are normalized and favor better models", () => {
    const mk = (bic: number) => ({ lambda: 0, edges: [0, 1], values: [0.5], bic });
    const w = bicWeights([mk(10), mk(2), mk(6)]);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(w[1]).toBeGreaterThan(w[0]);
    const hw = holdoutWeights(
      [mk(10), mk(2)],
      [0.2, 0.8],
      [0, 1],
    );
    expect(hw.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  it("enirCalibrate blends breakpoints and passes through on empty", () => {
    const bp = { lambda: 0, edges: [0, 1], values: [0.6], bic: 1 };
    expect(enirCalibrate(0.3, [bp], [1])).toBeCloseTo(0.6, 10);
    expect(enirCalibrate(0.3, [], [])).toBeCloseTo(0.3, 10);
  });
});

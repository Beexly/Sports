import { describe, it, expect } from "vitest";
import {
  isRocCurve,
  lowerConvexHull,
  curvesCross,
  tangentSlopeAt,
  bestModelPerCoverage,
  interpolatedScore,
  type IsRocPoint,
} from "@/lib/calibration/interval-score-roc";

// ============================================================
// arXiv 2607.28178 — interval-score ROC. Additive only.
// ============================================================

const pt = (coverage: number, score: number, alpha = 0.1): IsRocPoint => ({
  coverage,
  score,
  alpha,
});

describe("interval-score ROC — 2607.28178", () => {
  it("isRocCurve traces coverage vs score across alphas", () => {
    const iv = [
      { lo: 40, hi: 50 },
      { lo: 42, hi: 52 },
      { lo: 38, hi: 55 },
    ];
    const curve = isRocCurve(iv, [45, 60, 50], [0.2, 0.1, 0.05]);
    expect(curve.length).toBe(3);
    // Sorted by coverage ascending.
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i]!.coverage).toBeGreaterThanOrEqual(curve[i - 1]!.coverage);
    }
    // Tighter alpha -> higher score (2/alpha penalty on the miss at 60).
    expect(curve[0]!.score).toBeLessThan(curve[curve.length - 1]!.score);
  });

  it("lowerConvexHull drops dominated points", () => {
    const hull = lowerConvexHull([
      pt(0.5, 10),
      pt(0.7, 6),
      pt(0.7, 8), // dominated
      pt(0.9, 9),
    ]);
    expect(hull.length).toBe(3);
    expect(hull.some((p) => p.score === 8)).toBe(false);
  });

  it("curvesCross detects flipped ordering", () => {
    const a = [pt(0.5, 5), pt(0.9, 10)];
    const b = [pt(0.5, 8), pt(0.9, 7)];
    expect(curvesCross(a, b)).toBe(true);
    const c = [pt(0.5, 4), pt(0.9, 6)];
    expect(curvesCross(a, c)).toBe(false);
    expect(curvesCross([], b)).toBe(false);
  });

  it("tangentSlopeAt interpolates the hull slope", () => {
    const hull = [pt(0.5, 10), pt(0.9, 6)];
    expect(tangentSlopeAt(hull, 0.7)).toBeCloseTo(-10, 10);
    expect(tangentSlopeAt([pt(0.5, 10)], 0.7)).toBeNaN();
  });

  it("interpolatedScore is linear on the hull", () => {
    const hull = [pt(0.5, 10), pt(0.9, 6)];
    expect(interpolatedScore(hull, 0.7)).toBeCloseTo(8, 10);
    expect(interpolatedScore(hull, 0.2)).toBe(10);
    expect(interpolatedScore([], 0.7)).toBeNaN();
  });

  it("bestModelPerCoverage assigns the winning model per level", () => {
    const hulls = {
      gauss: [pt(0.5, 10), pt(0.9, 6)],
      cqr: [pt(0.5, 9), pt(0.9, 7)],
    };
    const best = bestModelPerCoverage(hulls, [0.6, 0.85]);
    expect(best[0.6]).toBe("cqr"); // 8.5 vs 9.0
    expect(best[0.85]).toBe("gauss"); // 7.25 vs 6.5
  });
});

import { describe, it, expect } from "vitest";
import {
  coverageThreshold,
  selectPicks,
  horizonThresholds,
  selectiveRoi,
  coverageDeviation,
} from "@/lib/calibration/bounded-abstention";

// ============================================================
// arXiv 2602.04714 — bounded abstention. Additive only.
// ============================================================

describe("bounded abstention — 2602.04714", () => {
  it("coverageThreshold hits the target fraction", () => {
    const edges = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const t = coverageThreshold(edges, 0.3);
    const posted = edges.filter((e) => e >= t).length;
    expect(posted / edges.length).toBeCloseTo(0.3, 10);
  });

  it("coverageThreshold is +Infinity on empty input", () => {
    expect(coverageThreshold([], 0.3)).toBe(Number.POSITIVE_INFINITY);
  });

  it("selectPicks posts at/above the threshold", () => {
    const cands = [
      { id: "a", edge: 0.1 },
      { id: "b", edge: 0.5 },
      { id: "c", edge: 0.3 },
    ];
    const posted = selectPicks(cands, 0.3);
    expect(posted.map((p) => p.id).sort()).toEqual(["b", "c"]);
  });

  it("horizonThresholds splits the budget per horizon", () => {
    const ts = horizonThresholds(
      [
        [1, 2, 3, 4],
        [10, 20, 30, 40],
      ],
      [0.5, 0.25],
    );
    expect(ts.length).toBe(2);
    expect(ts[0]).toBeLessThan(ts[1]!);
  });

  it("selectiveRoi averages realized profit of posted picks", () => {
    const posted = [
      { id: "a", edge: 0.5 },
      { id: "b", edge: 0.4 },
    ];
    expect(selectiveRoi(posted, { a: 2, b: -1 })).toBeCloseTo(0.5, 10);
    expect(selectiveRoi([], {})).toBe(0);
  });

  it("coverageDeviation measures the gate's 0.05 check", () => {
    expect(coverageDeviation(3, 10, 0.3)).toBeCloseTo(0, 10);
    expect(coverageDeviation(5, 10, 0.3)).toBeCloseTo(0.2, 10);
    expect(coverageDeviation(0, 0, 0.3)).toBeNaN();
  });
});

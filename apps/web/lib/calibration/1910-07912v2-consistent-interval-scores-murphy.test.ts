import { describe, expect, it } from "vitest";

import {
  dominanceCount,
  elementaryQuantileScore,
  intervalScore,
  meetsDisplacementGate,
  murphyCurve,
} from "@/lib/calibration/1910-07912v2-consistent-interval-scores-murphy";

describe("consistent interval scores + Murphy diagrams", () => {
  it("interval score penalizes misses proportionally to 2/alpha", () => {
    expect(intervalScore(40, 50, 45, 0.1)).toBe(10); // width only
    expect(intervalScore(40, 50, 55, 0.1)).toBe(10 + 20 * 5);
    expect(intervalScore(40, 50, 35, 0.1)).toBe(10 + 20 * 5);
  });

  it("elementary score is minimized at the true quantile", () => {
    // y=0 always: the 0.5-quantile q=0 should beat q=5 at every grid point.
    const grid = [-2, -1, 0, 1, 2, 3];
    const sTrue = grid.map((t) => elementaryQuantileScore(0, 0, t, 0.5));
    const sOff = grid.map((t) => elementaryQuantileScore(5, 0, t, 0.5));
    const tot = (s: number[]) => s.reduce((a, b) => a + b, 0);
    expect(tot(sTrue)).toBeLessThanOrEqual(tot(sOff));
  });

  it("dominanceCount counts grid points at-or-below", () => {
    expect(dominanceCount([1, 2, 3], [1, 3, 2])).toBe(2);
  });

  it("displacement gate requires >=95/100 grid points", () => {
    const grid = Array.from({ length: 100 }, (_, i) => 20 + i * 0.5);
    const ys = grid.map((g) => g); // outcomes track the grid
    // Challenger: tight intervals centered on truth. Incumbent: shifted up.
    const challenger = ys.map((y) => ({ l: y - 2, u: y + 2 }));
    const incumbent = ys.map((y) => ({ l: y + 1, u: y + 5 }));
    const { count, displaces } = meetsDisplacementGate(
      challenger,
      incumbent,
      ys,
      0.1,
      grid,
    );
    expect(count).toBeGreaterThanOrEqual(95);
    expect(displaces).toBe(true);
    // Identical intervals: 100/100 at-or-below (ties count).
    const tie = meetsDisplacementGate(challenger, challenger, ys, 0.1, grid);
    expect(tie.count).toBe(100);
  });

  it("murphyCurve returns one value per grid point", () => {
    const curve = murphyCurve([{ l: 40, u: 50 }], [45], 0.1, [42, 48]);
    expect(curve.length).toBe(2);
    expect(curve.every(Number.isFinite)).toBe(true);
  });
});

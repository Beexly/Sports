import { describe, it, expect } from "vitest";
import {
  empiricalQuantile,
  tailReachSpread,
  diversitySelect,
  type CalibrationGame,
} from "@/lib/calibration/diversity-calibration-selector";

// ============================================================
// arXiv 2608.21591 — diversity calibration selector. Additive.
// ============================================================

const g = (id: string, scores: number[]): CalibrationGame => ({ id, scores });

describe("diversity calibration selector — 2608.21591", () => {
  it("empiricalQuantile interpolates", () => {
    expect(empiricalQuantile([1, 2, 3, 4], 0.5)).toBeCloseTo(2.5, 10);
    expect(empiricalQuantile([], 0.5)).toBeNaN();
  });

  it("tailReachSpread is 0 for constant scores", () => {
    expect(tailReachSpread([3, 3, 3, 3])).toBe(0);
    expect(tailReachSpread([])).toBe(0);
  });

  it("tailReachSpread measures p95-p5", () => {
    const s = Array.from({ length: 100 }, (_, i) => i);
    expect(tailReachSpread(s)).toBeCloseTo(
      empiricalQuantile(s, 0.95) - empiricalQuantile(s, 0.05),
      10,
    );
  });

  it("diversitySelect picks the extreme games first", () => {
    const games = [
      g("narrow", [4.9, 5.0, 5.1]),
      g("wide", [0, 5, 10]),
      g("outer", [-2, 7]),
    ];
    const sel = diversitySelect(games, 2);
    expect(sel.length).toBe(2);
    expect(sel[0]!.id).toBe("wide"); // widest seed
    expect(sel[1]!.id).toBe("outer"); // extends the pooled tails
    const pooled = sel.flatMap((x) => x.scores);
    expect(tailReachSpread(pooled)).toBeGreaterThanOrEqual(
      tailReachSpread([0, 5, 10]),
    );
  });

  it("diversitySelect stops early when no game adds spread", () => {
    const games = [
      g("narrow", [4.9, 5.0, 5.1]),
      g("wide", [0, 5, 10]),
      g("mid", [4, 5, 6]),
    ];
    const sel = diversitySelect(games, 2);
    // Neither narrow nor mid extends wide's pooled tails: stops at the seed.
    expect(sel.length).toBe(1);
    expect(sel[0]!.id).toBe("wide");
  });

  it("diversitySelect handles degenerate input", () => {
    expect(diversitySelect([], 3)).toEqual([]);
    expect(diversitySelect([g("a", [1])], 0)).toEqual([]);
    const all = diversitySelect([g("a", [1]), g("b", [2])], 5);
    expect(all.length).toBe(2);
  });
});

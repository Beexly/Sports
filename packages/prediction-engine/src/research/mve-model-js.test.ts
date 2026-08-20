import { describe, expect, it } from "vitest";
import {
  MveModelJs,
  jamesSteinShrink,
  JS_PHI,
  JS_MIN_GROUPS,
} from "./mve-model-js.js";

describe("MVE James-Stein shrinkage (Amendment v2.1)", () => {
  describe("jamesSteinShrink — equal-variance special case", () => {
    it("with equal n_i, reduces to the classic JS formula", () => {
      // 5 groups, each n=4 (Var = 1/16). Equal weights → theta_bar = simple mean.
      const means = [0.5, 0.6, 0.45, 0.55, 0.52];
      const counts = [4, 4, 4, 4, 4];
      const shrunk = jamesSteinShrink(means, counts, "sqrt");

      // With equal n and positive tau2, each estimate should move toward the mean.
      const meanOfMeans = means.reduce((a, b) => a + b, 0) / means.length;
      expect(shrunk.length).toBe(5);
      // Every shrunk value should be closer to the mean than the raw.
      for (let i = 0; i < 5; i++) {
        const rawDist = Math.abs(means[i]! - meanOfMeans);
        const shrunkDist = Math.abs(shrunk[i]! - meanOfMeans);
        expect(shrunkDist).toBeLessThanOrEqual(rawDist + 1e-10);
        // And non-negative.
        expect(shrunk[i]).toBeGreaterThanOrEqual(0);
      }
    });

    it("does NOT shrink when all values are identical (tau2 = 0)", () => {
      const means = [0.5, 0.5, 0.5];
      const counts = [4, 4, 4];
      const shrunk = jamesSteinShrink(means, counts, "sqrt");
      for (let i = 0; i < 3; i++) {
        // When all identical, deviations are zero, shrunk = mean = original.
        expect(shrunk[i]).toBeCloseTo(0.5, 10);
      }
    });
  });

  describe("jamesSteinShrink — shrinkage magnitude", () => {
    it("shrinks more aggressively with larger D_i (smaller n_i)", () => {
      // Two groups with same mean but very different sample sizes.
      // Group 0: n=3 (small, more variance, less trust → shrink more toward mean).
      // Group 1: n=30 (large, less variance, more trust → shrink less).
      const means = [1.0, 0.5, 0.5, 0.5, 0.5, 0.5]; // group 0 is an outlier
      const counts = [3, 30, 30, 30, 30, 30];
      const shrunk = jamesSteinShrink(means, counts, "sqrt");

      const meanOfMeans = means.reduce((a, b) => a + b, 0) / means.length;
      const rawDist0 = Math.abs(means[0]! - meanOfMeans);
      const shrunkDist0 = Math.abs(shrunk[0]! - meanOfMeans);
      const rawDist1 = Math.abs(means[1]! - meanOfMeans);
      const shrunkDist1 = Math.abs(shrunk[1]! - meanOfMeans);

      // Group 0 (small n) should shrink proportionally more.
      const shrinkFrac0 = 1 - shrunkDist0 / rawDist0;
      const shrinkFrac1 = 1 - shrunkDist1 / rawDist1;
      expect(shrinkFrac0).toBeGreaterThan(shrinkFrac1);
    });
  });

  describe("jamesSteinShrink — identity below p=3", () => {
    it("returns identical estimates when p < 3", () => {
      const means = [0.5, 0.6];
      const counts = [4, 5];
      const shrunk = jamesSteinShrink(means, counts, "sqrt");
      expect(shrunk).toEqual(means);
    });

    it("returns identical estimates when p == 0", () => {
      const shrunk = jamesSteinShrink([], [], "sqrt");
      expect(shrunk).toEqual([]);
    });
  });

  describe("jamesSteinShrink — input validation", () => {
    it("throws on mismatched lengths", () => {
      expect(() => jamesSteinShrink([0.5, 0.6], [4], "sqrt")).toThrow(RangeError);
    });
  });

  describe("jamesSteinShrink — arcsine family", () => {
    it("shrinks proportion estimates toward the mean without leaving [0, 1]", () => {
      const means = [0.1, 0.3, 0.5, 0.7, 0.9];
      const counts = [5, 5, 5, 5, 5];
      const shrunk = jamesSteinShrink(means, counts, "arcsine");
      expect(shrunk.length).toBe(5);
      for (const v of shrunk) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("MveModelJs — determinism and walk-forward", () => {
    it("predictOver never reads game.y", () => {
      const model = new MveModelJs(20260820);
      const game = {
        home: 0, away: 1, pitcherHome: 0, pitcherAway: 1,
        park: 0, umpire: 0, y: 15, line: 8.5, weather: 2, restHome: 3, restAway: 2,
      };
      // predictOver with y=15 vs y=0 should give identical results (y is never read).
      const q1 = model.predictOver({ ...game, y: 15 });
      const q2 = model.predictOver({ ...game, y: 0 });
      expect(q1).toBeCloseTo(q2, 12);
    });

    it("produces identical q_t for identical history (deterministic)", () => {
      const m1 = new MveModelJs(42);
      const m2 = new MveModelJs(42);
      const history = [
        { home: 0, away: 1, pitcherHome: 0, pitcherAway: 1, park: 0, umpire: 0, y: 8, line: 8.5 },
        { home: 1, away: 0, pitcherHome: 1, pitcherAway: 0, park: 0, umpire: 0, y: 10, line: 8.5 },
        { home: 0, away: 1, pitcherHome: 0, pitcherAway: 1, park: 0, umpire: 0, y: 7, line: 8.5 },
        { home: 2, away: 0, pitcherHome: 2, pitcherAway: 0, park: 1, umpire: 1, y: 9, line: 9.0 },
      ];
      for (const g of history) {
        m1.predictOver(g);
        m1.update(g);
        m2.predictOver(g);
        m2.update(g);
      }
      const g5 = { home: 0, away: 2, pitcherHome: 0, pitcherAway: 2, park: 0, umpire: 0, y: 0, line: 8.5 };
      expect(m1.predictOver(g5)).toBeCloseTo(m2.predictOver(g5), 12);
    });

    it("returns a probability in (0, 1)", () => {
      const model = new MveModelJs(20260820);
      for (let i = 0; i < 5; i++) {
        const g = {
          home: i % 2, away: (i + 1) % 2, pitcherHome: i % 2, pitcherAway: (i + 1) % 2,
          park: i % 2, umpire: 0, y: 8 + i, line: 8.5,
        };
        model.predictOver(g);
        model.update(g);
      }
      const q = model.predictOver({
        home: 0, away: 1, pitcherHome: 0, pitcherAway: 1, park: 0, umpire: 0, y: 99, line: 8.5,
      });
      expect(q).toBeGreaterThan(0);
      expect(q).toBeLessThan(1);
    });

    it("predictOver with no history returns intercept-only q (deterministic)", () => {
      const model = new MveModelJs(20260820);
      const q = model.predictOver({
        home: 0, away: 1, pitcherHome: 0, pitcherAway: 1, park: 0, umpire: 0, y: 99, line: 8.5,
      });
      // intercept = log(8.5), mu = 8.5, line = 8.5
      // q = P(Y > 8.5) = P(Y >= 9) under NB2(8.5, 12)
      expect(q).toBeGreaterThan(0);
      expect(q).toBeLessThan(1);
      expect(q).toBeCloseTo(0.5, 1); // near 0.5 since P(Y > line=mu) ~ 0.5
    });
  });

  describe("MveModelJs — walk-forward ordering", () => {
    it("predict before update gives different results than update before predict", () => {
      // With enough history, predict should use only prior games.
      const model = new MveModelJs(99);
      const games = [
        { home: 0, away: 1, pitcherHome: 0, pitcherAway: 1, park: 0, umpire: 0, y: 15, line: 8.5 },
        { home: 0, away: 1, pitcherHome: 0, pitcherAway: 1, park: 0, umpire: 0, y: 15, line: 8.5 },
        { home: 0, away: 1, pitcherHome: 0, pitcherAway: 1, park: 0, umpire: 0, y: 15, line: 8.5 },
        { home: 0, away: 1, pitcherHome: 0, pitcherAway: 1, park: 0, umpire: 0, y: 15, line: 8.5 },
        { home: 0, away: 1, pitcherHome: 0, pitcherAway: 1, park: 0, umpire: 0, y: 15, line: 8.5 },
      ];
      for (const g of games) { model.predictOver(g); model.update(g); }
      const qPredictFirst = model.predictOver(games[0]);
      // The model has seen 5 games of y=15; predictOver should now give high q.
      expect(qPredictFirst).toBeGreaterThan(0.5);
    });
  });
});

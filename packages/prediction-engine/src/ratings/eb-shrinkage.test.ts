import { describe, expect, it } from "vitest";
import {
  shrinkRatings,
  shrinkRatingsMatrix,
  shrinkageUncertainty,
} from "./eb-shrinkage";

describe("eb-shrinkage", () => {
  it("diagonal form matches the closed-form formula", () => {
    const mle: Record<string, number> = { A: 8, B: -4, C: 2 };
    const information: Record<string, number> = { A: 0.5, B: 0.1, C: 0.25 };
    const { shrunk, factors, target } = shrinkRatings({
      mle,
      information,
      totalGames: 100,
      strength: 0.5,
      target: 0,
    });
    expect(target).toBe(0);
    for (const t of ["A", "B", "C"]) {
      const r = 1 / (1 + 0.5 * 100 * (information[t] ?? 0));
      expect(factors[t]).toBeCloseTo(r, 12);
      expect(shrunk[t]).toBeCloseTo((1 - r) * (mle[t] ?? 0), 10);
    }
    // Less information -> more shrinkage.
    expect(factors["B"]).toBeGreaterThan(factors["A"] ?? 0);
    expect(Math.abs(shrunk["B"] ?? 0)).toBeLessThan(Math.abs(mle["B"] ?? 0));
  });

  it("shrinks toward the MLE mean by default and preserves order", () => {
    const mle: Record<string, number> = { A: 6, B: 3, C: -3 };
    const { shrunk, target } = shrinkRatings({
      mle,
      information: { A: 0.2, B: 0.2, C: 0.2 },
      totalGames: 50,
    });
    expect(target).toBeCloseTo(2, 10);
    const vals = ["A", "B", "C"].map((t) => shrunk[t] ?? 0);
    expect(vals[0] ?? 0).toBeGreaterThan(vals[1] ?? 0);
    expect(vals[1] ?? 0).toBeGreaterThan(vals[2] ?? 0);
    for (const t of ["A", "B", "C"]) {
      expect(Math.abs((shrunk[t] ?? 0) - target)).toBeLessThan(
        Math.abs((mle[t] ?? 0) - target),
      );
    }
  });

  it("matrix form agrees with the diagonal form on diagonal Fisher", () => {
    const mle: Record<string, number> = { A: 5, B: -3, C: 1 };
    const information: Record<string, number> = { A: 0.4, B: 0.2, C: 0.3 };
    const fisher: Record<string, Record<string, number>> = {};
    for (const t of Object.keys(mle)) {
      fisher[t] = { [t]: information[t] ?? 0 };
    }
    const diag = shrinkRatings({ mle, information, totalGames: 80, strength: 2 });
    const mat = shrinkRatingsMatrix(mle, fisher, 80, 2, diag.target);
    for (const t of Object.keys(mle)) {
      expect(mat.shrunk[t]).toBeCloseTo(diag.shrunk[t] ?? 0, 8);
    }
  });

  it("shrunk ratings have lower MSE than MLE on sparse simulated data", () => {
    // True ratings ~ N(0, 4); MLE observed with noise inversely proportional
    // to information. Shrinkage should win on average MSE.
    let wins = 0;
    const trials = 60;
    for (let s = 0; s < trials; s++) {
      let seed = 1000 + s;
      const rand = (): number => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };
      const teams = ["A", "B", "C", "D", "E", "F"];
      const truth: Record<string, number> = {};
      const mle: Record<string, number> = {};
      const information: Record<string, number> = {};
      for (const t of teams) {
        truth[t] = (rand() * 2 - 1) * 6;
        const info = 0.02 + rand() * 0.1; // sparse: little data
        information[t] = info;
        const se = 5 / Math.sqrt(info * 50);
        mle[t] = truth[t] + (rand() * 2 - 1) * se;
      }
      const { shrunk } = shrinkRatings({ mle, information, totalGames: 50, strength: 1 });
      const mse = (r: Record<string, number>): number =>
        teams.reduce((a, t) => a + ((r[t] ?? 0) - (truth[t] ?? 0)) ** 2, 0) / teams.length;
      if (mse(shrunk) < mse(mle)) wins++;
    }
    expect(wins).toBeGreaterThan(trials * 0.55);
  });

  it("uncertainty diagnostic flags low-information teams", () => {
    const { factors } = shrinkRatings({
      mle: { A: 5, B: 5 },
      information: { A: 1, B: 0.01 },
      totalGames: 100,
    });
    const u = shrinkageUncertainty({ shrunk: {}, factors, target: 0 });
    expect(u["B"]).toBeGreaterThan(u["A"] ?? 0);
  });

  it("empty input throws", () => {
    expect(() => shrinkRatings({ mle: {}, information: {}, totalGames: 10 })).toThrow();
    expect(() => shrinkRatingsMatrix({}, {}, 10)).toThrow();
  });
});

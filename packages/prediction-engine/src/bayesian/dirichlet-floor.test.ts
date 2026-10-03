import { describe, expect, it } from "vitest";
import {
  brierScore,
  dirichletPredictive,
  fitPoolingWeight,
  opinionPool,
  updateCounts,
} from "./dirichlet-floor";
import type { AtsOutcome } from "./dirichlet-floor";

const zeros = (): Record<AtsOutcome, number> => ({ cover: 0, push: 0, nocover: 0 });

describe("dirichlet-floor", () => {
  it("dirichletPredictive is uniform with no data, concentrates with data", () => {
    const u = dirichletPredictive(zeros());
    expect(u.cover).toBeCloseTo(1 / 3, 12);
    let c = zeros();
    for (let i = 0; i < 9; i++) c = updateCounts(c, "cover");
    const p = dirichletPredictive(c);
    expect(p.cover).toBeCloseTo(10 / 12, 12);
    expect(p.cover! + p.push! + p.nocover!).toBeCloseTo(1, 12);
    expect(() => dirichletPredictive({ cover: -1, push: 0, nocover: 0 })).toThrow();
  });

  it("opinionPool mirrors the away distribution", () => {
    const home = { cover: 0.6, push: 0.05, nocover: 0.35 };
    const away = { cover: 0.5, push: 0.05, nocover: 0.45 };
    const pool = opinionPool(home, away, 0.5);
    // away cover (0.5) mirrors to home nocover
    expect(pool.nocover).toBeCloseTo(0.5 * 0.35 + 0.5 * 0.5, 12);
    expect(pool.cover! + pool.push! + pool.nocover!).toBeCloseTo(1, 12);
    expect(() => opinionPool(home, away, 1.5)).toThrow();
  });

  it("fitPoolingWeight recovers the better-informed side", () => {
    // Home distributions are sharp and correct; away are noise.
    let s = 5;
    const rng = (): number => {
      s = (1664525 * s + 1013904223) >>> 0;
      return s / 4294967296;
    };
    const games = Array.from({ length: 300 }, () => {
      const outcome: AtsOutcome = rng() < 0.55 ? "cover" : "nocover";
      return {
        homeDist:
          outcome === "cover"
            ? { cover: 0.8, push: 0.05, nocover: 0.15 }
            : { cover: 0.15, push: 0.05, nocover: 0.8 },
        awayDist: { cover: 0.45, push: 0.1, nocover: 0.45 },
        outcome,
      };
    });
    const { w } = fitPoolingWeight(games);
    expect(w).toBeGreaterThan(0.7);
    expect(() => fitPoolingWeight([])).toThrow();
  });

  it("brierScore is 0 for a perfect forecast", () => {
    expect(brierScore({ cover: 1, push: 0, nocover: 0 }, "cover")).toBe(0);
    expect(brierScore({ cover: 1, push: 0, nocover: 0 }, "nocover")).toBe(2);
  });
});

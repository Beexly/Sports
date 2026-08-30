import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PARLAY_MRI_PRICED,
  PARLAY_MRI_SCOPE,
  bivariatePoissonPmf,
  buildScoreGrid,
  evaluateParlay,
  lambdasFromAttackDefense,
  poissonPmf,
} from "../parlay/correlationAdjuster.js";

const ATOL = 1e-9;

type GoldenSet = {
  id: string;
  lam1: number;
  lam2: number;
  lam3: number;
  maxGoals: number;
  normalize: boolean;
  grid: Array<Array<number | null>>;
};

const golden = JSON.parse(
  readFileSync(join(__dirname, "fixtures", "bivariate-poisson.golden.json"), "utf8"),
) as { sets: GoldenSet[] };

describe("bivariate Poisson golden fixtures (penaltyblog 1.12.0)", () => {
  for (const set of golden.sets) {
    it(`${set.id} unnormalized 4×4 grid matches compiled Cython at atol 1e-9`, () => {
      const grid = buildScoreGrid(set.lam1, set.lam2, set.lam3, set.maxGoals, set.normalize);
      for (let x = 0; x <= set.maxGoals; x++) {
        for (let y = 0; y <= set.maxGoals; y++) {
          const expected = set.grid[x]?.[y];
          if (expected == null) continue;
          const got = grid[x]?.[y] ?? NaN;
          expect(Math.abs(got - expected)).toBeLessThan(ATOL);
        }
      }
    });
  }

  it("set1 P(0,0) equals P(0,1) because λ2 is exactly 1 (not a transposition bug)", () => {
    const p00 = bivariatePoissonPmf(0, 0, 1.5, 1.0, 0.3);
    const p01 = bivariatePoissonPmf(0, 1, 1.5, 1.0, 0.3);
    expect(Math.abs(p00 - p01)).toBeLessThan(ATOL);
  });

  it("set2 (λ2 ≠ 1) catches a λ1/λ2 transposition: P(1,0)/P(0,1) = λ1/λ2", () => {
    const lam1 = 1.7;
    const lam2 = 1.2;
    const lam3 = 0.25;
    const p10 = bivariatePoissonPmf(1, 0, lam1, lam2, lam3);
    const p01 = bivariatePoissonPmf(0, 1, lam1, lam2, lam3);
    expect(p10).not.toBeCloseTo(p01, 9);
    expect(Math.abs(p10 / p01 - lam1 / lam2)).toBeLessThan(ATOL);
    const swapped = bivariatePoissonPmf(1, 0, lam2, lam1, lam3);
    expect(Math.abs(swapped - p01)).toBeLessThan(ATOL);
  });

  it("λ3 → 0 collapses to the independent product", () => {
    const lam1 = 1.4;
    const lam2 = 0.9;
    const pJoint = bivariatePoissonPmf(2, 1, lam1, lam2, 0);
    const pIndep = poissonPmf(2, lam1) * poissonPmf(1, lam2);
    expect(Math.abs(pJoint - pIndep)).toBeLessThan(ATOL);
  });
});

describe("evaluateParlay (same-match, priced:false)", () => {
  it("exposes naive product-of-marginals vs correlated joint and never prices", () => {
    const result = evaluateParlay(
      [{ kind: "home_win" }, { kind: "over", line: 2.5 }],
      1.5,
      1.0,
      0.3,
      12,
    );
    expect(result.priced).toBe(false);
    expect(result.priced).toBe(PARLAY_MRI_PRICED);
    expect(result.scope).toBe(PARLAY_MRI_SCOPE);
    expect(result.naiveSurvivability).toBeGreaterThan(0);
    expect(result.correlatedSurvivability).toBeGreaterThan(0);
    expect(result.naiveSurvivability).toBeLessThan(1);
    expect(result.correlatedSurvivability).toBeLessThan(1);
    // Positive λ3 (shared scoring) makes home-win ∩ over more likely than independence.
    expect(result.correlatedSurvivability).toBeGreaterThan(result.naiveSurvivability);
  });

  it("λ3 = 0 still diverges for overlapping same-match legs (scoreline dependence)", () => {
    // Independent Poisson scores ≠ independent legs: P(home win ∩ over) is not
    // P(home win)×P(over). λ3 only adds extra shared-component correlation.
    const result = evaluateParlay(
      [{ kind: "home_win" }, { kind: "over", line: 2.5 }],
      1.5,
      1.0,
      0,
      12,
    );
    expect(result.correlatedSurvivability).not.toBeCloseTo(result.naiveSurvivability, 4);
  });

  it("lambdasFromAttackDefense uses the Dixon-Coles-style layout plus correlationLog", () => {
    const { lam1, lam2, lam3 } = lambdasFromAttackDefense({
      homeAdvantage: 0,
      homeAttack: 0,
      awayDefense: 0,
      awayAttack: 0,
      homeDefense: 0,
      correlationLog: Math.log(0.3),
    });
    expect(lam1).toBeCloseTo(1, 12);
    expect(lam2).toBeCloseTo(1, 12);
    expect(lam3).toBeCloseTo(0.3, 12);
  });
});

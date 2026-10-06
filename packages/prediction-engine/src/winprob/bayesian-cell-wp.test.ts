/**
 * Bayesian cell win probability — tests (arXiv 2207.13747v1).
 *
 * ACCEPTANCE GATE: the posterior shrinks small cells toward the
 * empirical-Bayes prior and converges to the empirical rate in large
 * cells; unseen cells fall back to the global prior mean; the blend
 * weight grows with elapsed time; the fitted blend beats the raw
 * pregame anchor on Brier with a sane calibration slope; degenerate
 * inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  blendedWp,
  fitBlend,
  fitCellEstimator,
  headToHead,
  type CellKey,
} from "./bayesian-cell-wp";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cell = (tau: number, omega: number): CellKey => ({ tau, omega });

describe("fitCellEstimator", () => {
  it("shrinks small cells to the prior, trusts large cells", () => {
    const est = fitCellEstimator(
      [
        { cell: cell(0, 0), counts: { wins: 0, games: 2 }, priorMean: 0.6 },
        { cell: cell(1, 1), counts: { wins: 900, games: 1000 }, priorMean: 0.6 },
      ],
      20,
    );
    // Small cell: posterior near the prior mean.
    expect(est.posterior(cell(0, 0))).toBeCloseTo((0.6 * 20 + 0) / 22, 12);
    // Large cell: posterior near the empirical rate.
    expect(est.posterior(cell(1, 1))).toBeCloseTo((12 + 900) / 1020, 6);
    // Unseen cell: falls back toward the global prior mean.
    const unseen = est.posterior(cell(9, 9));
    expect(unseen).toBeGreaterThan(0.4);
    expect(unseen).toBeLessThan(0.9);
    expect(est.effectiveN(cell(1, 1))).toBe(1020);
    expect(() => fitCellEstimator([], 0)).toThrow();
  });
});

describe("blendedWp + fitBlend", () => {
  it("blends pregame and cell with time/score weight", () => {
    const est = fitCellEstimator(
      [{ cell: cell(3, 2), counts: { wins: 80, games: 100 }, priorMean: 0.5 }],
      20,
    );
    const fit = { a: 0, b: 0.8, c: 0.02 };
    const early = blendedWp(0.6, cell(3, 2), 3, 0.05, est, fit);
    const late = blendedWp(0.6, cell(3, 2), 3, 0.95, est, fit);
    // Cell posterior ~= (10+80)/120 = 0.75: late leans on it, early on pregame.
    expect(early).toBeLessThan(late);
    expect(late).toBeGreaterThan(0.65);
    expect(() => blendedWp(0, cell(3, 2), 3, 0.5, est, fit)).toThrow();
    expect(() => blendedWp(0.6, cell(3, 2), 3, 2, est, fit)).toThrow();
  });

  it("fitBlend beats the raw pregame anchor on Brier", () => {
    const rand = mulberry32(211);
    const cells = [
      { cell: cell(0, 0), counts: { wins: 450, games: 1000 }, priorMean: 0.5 },
      { cell: cell(3, 2), counts: { wins: 800, games: 1000 }, priorMean: 0.5 },
    ];
    const est = fitCellEstimator(cells, 20);
    const rows = [];
    for (let i = 0; i < 600; i++) {
      const late = rand() < 0.5;
      const c = late ? cell(3, 2) : cell(0, 0);
      const pTrue = late ? 0.78 : 0.46;
      rows.push({
        pregame: 0.55,
        cell: c,
        scoreDiff: late ? 10 : 0,
        elapsedFrac: late ? 0.9 : 0.1,
        won: rand() < pTrue ? 1 : 0,
        refWp: 0.55,
      });
    }
    const fit = fitBlend(rows, est);
    expect(fit.b).toBeGreaterThan(0);
    const { winRate, calibrationSlope } = headToHead(rows, est, fit);
    expect(winRate).toBeGreaterThan(0.5);
    expect(calibrationSlope).toBeGreaterThan(0.5);
    expect(() => fitBlend([], est)).toThrow();
    expect(() => headToHead([], est, fit)).toThrow();
  });
});

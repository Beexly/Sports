import { describe, expect, it } from "vitest";
import {
  expectedScore, updateElo, regressToMean, meanLogLoss, tuneK,
  FIXED_RECIPE, K_GRID, GSE_TUNED_ELO_ENABLED,
} from "./tuned-elo-2403.js";

describe("tuned elo", () => {
  it("expected score is 0.5 for equal ratings, HFA shifts it", () => {
    expect(expectedScore(1500, 1500, false, 0)).toBeCloseTo(0.5, 10);
    expect(expectedScore(1500, 1500, true, 65)).toBeGreaterThan(0.5);
  });
  it("winner gains, loser loses, symmetric", () => {
    const [a, b] = updateElo(1500, 1500, 1, false, FIXED_RECIPE);
    expect(a).toBeGreaterThan(1500);
    expect(b).toBeLessThan(1500);
    expect(a + b).toBeCloseTo(3000, 8);
  });
  it("regression-to-mean pulls toward 1500", () => {
    const r = regressToMean({ KC: 1700 }, { k: 25, hfa: 65, regression: 0.5 });
    expect(r.KC).toBeCloseTo(1600, 10);
  });
  it("tuneK picks a grid value minimizing log-loss", () => {
    const games = [
      { a: "KC", b: "BUF", aHome: true, aWon: true },
      { a: "KC", b: "BUF", aHome: false, aWon: false },
    ];
    const t = tuneK(games, { KC: 1600, BUF: 1500 }, 65, 0.25);
    expect(K_GRID).toContain(t.k);
    expect(Number.isFinite(t.logLoss)).toBe(true);
  });
  it("meanLogLoss is 0 on empty games", () => {
    expect(meanLogLoss([], {}, FIXED_RECIPE)).toBe(0);
  });
  it("stays off until the log-loss gate clears", () => {
    expect(GSE_TUNED_ELO_ENABLED).toBe(false);
  });
});


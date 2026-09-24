import { describe, expect, it } from "vitest";
import {
  updateDuel, marginToRankWeight, winProb,
  OPENSKILL_DEFAULT_MU, OPENSKILL_DEFAULT_SIGMA, GSE_OPENSKILL_ENABLED,
} from "./openskill-ratings-2401.js";

const R = () => ({ mu: OPENSKILL_DEFAULT_MU, sigma: OPENSKILL_DEFAULT_SIGMA });

describe("openskill ratings", () => {
  it("winner gains mu, loser loses mu", () => {
    const [a, b] = updateDuel(R(), R(), 1);
    expect(a.mu).toBeGreaterThan(OPENSKILL_DEFAULT_MU);
    expect(b.mu).toBeLessThan(OPENSKILL_DEFAULT_MU);
  });
  it("uncertainty shrinks after an observed game", () => {
    const [a] = updateDuel(R(), R(), 1);
    expect(a.sigma).toBeLessThan(OPENSKILL_DEFAULT_SIGMA);
  });
  it("is antisymmetric under team swap", () => {
    const [aWin] = updateDuel(R(), R(), 1); // A wins
    const [aLose] = updateDuel(R(), R(), 2); // A loses
    // winner's gain mirrors the loser's loss around the prior mean
    expect(aWin.mu).toBeCloseTo(2 * OPENSKILL_DEFAULT_MU - aLose.mu, 8);
  });
  it("winProb is 0.5 for identical ratings", () => {
    // normal-CDF approximation accuracy is ~1e-7, so precision 6
    expect(winProb(R(), R())).toBeCloseTo(0.5, 6);
  });
  it("margin weight is monotone in |margin| and capped", () => {
    expect(marginToRankWeight(28)).toBe(1);
    expect(marginToRankWeight(100)).toBe(1);
    expect(marginToRankWeight(0)).toBe(0.5);
    expect(marginToRankWeight(14)).toBeGreaterThan(marginToRankWeight(7));
  });
  it("stays off until the walk-forward gate clears", () => {
    expect(GSE_OPENSKILL_ENABLED).toBe(false);
  });
  it("handles edge inputs", () => {
    // extreme rating gap saturates the win probability
    const strong = { mu: OPENSKILL_DEFAULT_MU + 50, sigma: OPENSKILL_DEFAULT_SIGMA };
    expect(winProb(strong, R())).toBeGreaterThan(0.99);
    expect(winProb(R(), strong)).toBeLessThan(0.01);
    // negative margins mirror positive ones (magnitude only)
    expect(marginToRankWeight(-14)).toBeCloseTo(marginToRankWeight(14), 10);
    expect(marginToRankWeight(-100)).toBe(1);
    // zero uncertainty gap still finite
    const [a] = updateDuel({ mu: 25, sigma: 0.001 }, { mu: 25, sigma: 0.001 }, 1);
    expect(Number.isFinite(a.mu)).toBe(true);
    expect(Number.isFinite(a.sigma)).toBe(true);
  });
});


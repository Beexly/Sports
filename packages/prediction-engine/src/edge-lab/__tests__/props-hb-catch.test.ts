import { describe, expect, it } from "vitest";
import { posteriorRate } from "../props-hb.js";
import {
  betaBinomialProbOver,
  fitCatchPrior,
  posteriorCatch,
  probOverReceptions,
  scoreReceptionsOver,
} from "../props-hb-catch.js";

describe("fitCatchPrior / posteriorCatch", () => {
  it("fits a Beta whose mean is the pooled catch rate and skips needing calendar games", () => {
    const prior = fitCatchPrior([
      { targets: 12, receptions: 11 },
      { targets: 12, receptions: 3 },
      { targets: 10, receptions: 9 },
      { targets: 10, receptions: 2 },
      { targets: 8, receptions: 7 },
      { targets: 8, receptions: 1 },
    ]);
    expect(prior).not.toBeNull();
    expect(prior!.alpha / (prior!.alpha + prior!.beta)).toBeCloseTo(33 / 60, 8);
  });

  it("rejects 0-target rows — they are not a 0% catcher", () => {
    expect(() => fitCatchPrior([{ targets: 0, receptions: 0 }])).toThrow(RangeError);
  });

  it("leaves the prior unchanged at targets=0", () => {
    const post = posteriorCatch({ alpha: 8, beta: 4 }, 0, 0);
    expect(post.alpha).toBe(8);
    expect(post.beta).toBe(4);
  });
});

describe("betaBinomialProbOver", () => {
  it("is 0 when n=0 and line>=0, 1 when line<0", () => {
    const post = { alpha: 6, beta: 4, mean: 0.6 };
    expect(betaBinomialProbOver(post, 0.5, 0)).toBe(0);
    expect(betaBinomialProbOver(post, -0.1, 0)).toBe(1);
  });

  it("is 0 when the line is at or above n (cannot catch more than targets)", () => {
    const post = { alpha: 9, beta: 3, mean: 0.75 };
    expect(betaBinomialProbOver(post, 4.5, 4)).toBe(0);
  });

  it("rises with n at a fixed line", () => {
    const post = { alpha: 8, beta: 4, mean: 2 / 3 };
    const small = betaBinomialProbOver(post, 4.5, 6);
    const large = betaBinomialProbOver(post, 4.5, 12);
    expect(large).toBeGreaterThan(small);
  });
});

describe("probOverReceptions — ZIP hurdle is P(T=0)", () => {
  it("is near 0 when the target posterior is concentrated at 0", () => {
    const catchPost = posteriorCatch({ alpha: 20, beta: 10 }, 0, 0);
    const targetPost = posteriorRate({ alpha: 0.1, beta: 20 }, 0, 10);
    expect(probOverReceptions(catchPost, targetPost, 4.5)).toBeLessThan(0.05);
  });

  it("exceeds the n=mean-targets slice when target mass sits above the line", () => {
    const catchPost = { alpha: 30, beta: 10, mean: 0.75 };
    const targetPost = posteriorRate({ alpha: 80, beta: 10 }, 80, 10);
    const mixed = probOverReceptions(catchPost, targetPost, 4.5);
    const atMean = betaBinomialProbOver(catchPost, 4.5, 8);
    expect(mixed).toBeGreaterThan(0.5);
    expect(Math.abs(mixed - atMean)).toBeLessThan(0.25);
  });

  it("scoreReceptionsOver uses all target games including zeros", () => {
    const catchPrior = fitCatchPrior([
      { targets: 12, receptions: 11 },
      { targets: 12, receptions: 3 },
      { targets: 10, receptions: 9 },
      { targets: 10, receptions: 2 },
    ]);
    expect(catchPrior).not.toBeNull();
    const p = scoreReceptionsOver({
      catchPrior: catchPrior!,
      targetPrior: { alpha: 6, beta: 2 },
      catchHistory: [
        { targets: 8, receptions: 5 },
        { targets: 8, receptions: 6 },
      ],
      targetGames: 4,
      targetTotal: 16,
      line: 3.5,
    });
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });
});

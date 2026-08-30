import { describe, expect, it } from "vitest";
import { probOver, type GammaPosterior } from "../props-hb.js";
import {
  RUSH_ATTEMPTS_HB_METHOD_TAG,
  fitRushAttemptsPrior,
  posteriorRushAttempts,
  probOverRushAttempts,
} from "../props-hb-rush-attempts.js";

/** A realistic RB usage cohort: (games, attempts). Zero-attempt games are valid. */
function rbCohort() {
  return [
    { games: 8, attempts: 112 },
    { games: 10, attempts: 150 },
    { games: 6, attempts: 48 },
    { games: 12, attempts: 192 },
    { games: 4, attempts: 0 }, // healthy scratch played but never handed ball — valid 0
    { games: 9, attempts: 135 },
    { games: 7, attempts: 84 },
    { games: 11, attempts: 165 },
  ];
}

describe("RUSH_ATTEMPTS_HB_METHOD_TAG", () => {
  it("is the expected method tag", () => {
    expect(RUSH_ATTEMPTS_HB_METHOD_TAG).toBe("props_hb_rush_attempts_v1");
  });
});

describe("fitRushAttemptsPrior", () => {
  it("fits a attempts-per-game prior and includes 0-attempt games as valid", () => {
    const prior = fitRushAttemptsPrior(rbCohort());
    expect(prior).not.toBeNull();
    // attempts-per-game for RBs ~12-18.
    const mean = prior!.alpha / prior!.beta;
    expect(mean).toBeGreaterThan(8);
    expect(mean).toBeLessThan(22);
  });

  it("refuses games=0 samples — denominator collapse", () => {
    expect(() => fitRushAttemptsPrior([{ games: 0, attempts: 0 }])).toThrow(RangeError);
  });

  it("accepts zero-attempt games — they are real 0 observations, not undefined rate", () => {
    const withZero = fitRushAttemptsPrior([
      { games: 3, attempts: 0 },
      { games: 5, attempts: 50 },
      { games: 4, attempts: 60 },
    ]);
    const withoutZero = fitRushAttemptsPrior([
      { games: 5, attempts: 50 },
      { games: 4, attempts: 60 },
    ]);
    expect(withZero).not.toBeNull();
    expect(withoutZero).not.toBeNull();
    // Including zero-attempt games must push the mean attempts-per-game DOWN.
    expect(withZero!.alpha / withZero!.beta).toBeLessThan(withoutZero!.alpha / withoutZero!.beta);
  });

  it("rejects negative attempts", () => {
    expect(() => fitRushAttemptsPrior([{ games: 3, attempts: -5 }])).toThrow(RangeError);
  });

  it("returns null for empty cohort", () => {
    expect(fitRushAttemptsPrior([])).toBeNull();
  });
});

describe("posteriorRushAttempts", () => {
  it("returns the prior when the player has 0 games (full shrinkage)", () => {
    const prior = fitRushAttemptsPrior(rbCohort())!;
    const post = posteriorRushAttempts(prior, { games: 0, attempts: 0 });
    expect(post.alpha).toBeCloseTo(prior.alpha, 12);
    expect(post.beta).toBeCloseTo(prior.beta, 12);
  });

  it("shrinks the raw rate toward the prior mean", () => {
    const prior = fitRushAttemptsPrior(rbCohort())!;
    const priorMean = prior.alpha / prior.beta;
    // Player with a very high raw rate (18 att/g) should be shrunk down.
    const post = posteriorRushAttempts(prior, { games: 2, attempts: 36 });
    expect(post.mean).toBeLessThan(18);
    expect(post.mean).toBeGreaterThan(priorMean);
  });
});

describe("probOverRushAttempts", () => {
  it("returns 1 for a negative line (count always exceeds negative)", () => {
    const prior = fitRushAttemptsPrior(rbCohort())!;
    const post = posteriorRushAttempts(prior, { games: 8, attempts: 120 });
    expect(probOverRushAttempts(post, -1, 1)).toBe(1);
  });

  it("matches probOver from props-hb (NB posterior-predictive survival)", () => {
    const prior = fitRushAttemptsPrior(rbCohort())!;
    const post = posteriorRushAttempts(prior, { games: 8, attempts: 120 });
    expect(probOverRushAttempts(post, 14.5)).toBeCloseTo(probOver(post, 14.5, 1), 15);
  });

  it("delegates to multi-game windows correctly", () => {
    const prior = fitRushAttemptsPrior(rbCohort())!;
    const post = posteriorRushAttempts(prior, { games: 8, attempts: 120 });
    const single = probOverRushAttempts(post, 29.5, 1);
    const twoGame = probOverRushAttempts(post, 29.5, 2);
    // Over 2 games the mean doubles, so P(>29.5) should be higher.
    expect(twoGame).toBeGreaterThan(single);
    expect(twoGame).toBeLessThan(1);
  });

  it("is deterministic and idempotent across calls", () => {
    const prior = fitRushAttemptsPrior(rbCohort())!;
    const post = posteriorRushAttempts(prior, { games: 8, attempts: 120 });
    const a = probOverRushAttempts(post, 14.5);
    const b = probOverRushAttempts(post, 14.5);
    expect(a).toBe(b);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(1);
  });

  it("throws on invalid posterior alpha/beta", () => {
    const badPost: GammaPosterior = { alpha: 0, beta: 10, mean: 0 };
    expect(() => probOverRushAttempts(badPost, 14.5)).toThrow(RangeError);
  });
});

import { describe, expect, it } from "vitest";
import { posteriorRate } from "../props-hb.js";
import {
  RUSH_TD_HB_METHOD_TAG,
  fitRushTdPerAttemptPrior,
  pooledRushTdPerAttempt,
  posteriorRushTdPerAttempt,
  probRushTd,
  probRushTdGivenAttempts,
  rushTdProbZero,
  rushTdProbZeroPoisson,
} from "../props-hb-rush-td.js";

/** Goal-line vultures vs between-the-20s grinders — extra-Poisson so EB is identified. */
const MIXED: { rushAtt: number; rushTds: number }[] = [
  { rushAtt: 12, rushTds: 5 },
  { rushAtt: 10, rushTds: 4 },
  { rushAtt: 14, rushTds: 6 },
  { rushAtt: 90, rushTds: 1 },
  { rushAtt: 80, rushTds: 0 },
  { rushAtt: 100, rushTds: 1 },
  { rushAtt: 11, rushTds: 4 },
  { rushAtt: 85, rushTds: 0 },
];

describe("fitRushTdPerAttemptPrior / posteriorRushTdPerAttempt", () => {
  it("fits a rush-TD-per-attempt prior and refuses 0-attempt rows as talent", () => {
    const prior = fitRushTdPerAttemptPrior(MIXED);
    expect(prior).not.toBeNull();
    expect(prior!.alpha / prior!.beta).toBeGreaterThan(0);
    expect(RUSH_TD_HB_METHOD_TAG).toBe("props_hb_rush_td_v1");
    expect(() => fitRushTdPerAttemptPrior([{ rushAtt: 0, rushTds: 0 }])).toThrow(RangeError);
  });
});

describe("rushTdProbZero / probRushTdGivenAttempts", () => {
  it("is 1 at zero attempts — ZIP hurdle, not a 0% scorer", () => {
    const prior = fitRushTdPerAttemptPrior(MIXED)!;
    const post = posteriorRushTdPerAttempt(prior, MIXED[0]!);
    expect(rushTdProbZero(post, 0)).toBe(1);
    expect(probRushTdGivenAttempts(post, 0)).toBe(0);
  });

  it("rises with attempts at a fixed rush-TD-per-attempt posterior", () => {
    const prior = fitRushTdPerAttemptPrior(MIXED)!;
    const post = posteriorRushTdPerAttempt(prior, MIXED[0]!);
    const few = probRushTdGivenAttempts(post, 4);
    const many = probRushTdGivenAttempts(post, 18);
    expect(many).toBeGreaterThan(few);
    expect(many).toBeGreaterThan(0.05);
    expect(many).toBeLessThan(1);
  });

  it("matches the closed form 1 − (β/(β+n))^α", () => {
    const post = posteriorRate({ alpha: 2, beta: 20 }, 0, 0);
    const n = 10;
    const expected = 1 - (20 / 30) ** 2;
    expect(probRushTdGivenAttempts(post, n)).toBeCloseTo(expected, 12);
  });

  it("Poisson fallback is exp(-m n) and does not invent φ", () => {
    const even = [
      { rushAtt: 20, rushTds: 2 },
      { rushAtt: 20, rushTds: 2 },
      { rushAtt: 20, rushTds: 2 },
      { rushAtt: 20, rushTds: 2 },
    ];
    expect(fitRushTdPerAttemptPrior(even)).toBeNull();
    const m = pooledRushTdPerAttempt(even);
    expect(m).toBeCloseTo(0.1, 12);
    expect(rushTdProbZeroPoisson(m!, 0)).toBe(1);
    expect(rushTdProbZeroPoisson(m!, 10)).toBeCloseTo(Math.exp(-1), 12);
  });
});

describe("probRushTd — mix over A", () => {
  it("is near 0 when next-game attempts are concentrated at 0", () => {
    const prior = fitRushTdPerAttemptPrior(MIXED)!;
    const tdPost = posteriorRushTdPerAttempt(prior, MIXED[0]!);
    const attPost = posteriorRate({ alpha: 0.1, beta: 20 }, 0, 10);
    expect(probRushTd(tdPost, attPost)).toBeLessThan(0.05);
  });

  it("exceeds the k=0 slice once attempts have mass", () => {
    const prior = fitRushTdPerAttemptPrior(MIXED)!;
    const tdPost = posteriorRushTdPerAttempt(prior, MIXED[0]!);
    const attPost = posteriorRate({ alpha: 80, beta: 8 }, 160, 8);
    const mixed = probRushTd(tdPost, attPost);
    expect(mixed).toBeGreaterThan(probRushTdGivenAttempts(tdPost, 0));
    expect(mixed).toBeGreaterThan(0.05);
    expect(mixed).toBeLessThan(1);
  });
});

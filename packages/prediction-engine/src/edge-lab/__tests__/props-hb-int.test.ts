import { describe, expect, it } from "vitest";
import { posteriorRate } from "../props-hb.js";
import {
  INT_HB_METHOD_TAG,
  fitIntPerAttemptPrior,
  intProbZero,
  intProbZeroPoisson,
  pooledIntPerAttempt,
  posteriorIntPerAttempt,
  probInt,
  probIntGivenAttempts,
} from "../props-hb-int.js";

/** Gunslingers vs care-takers — extra-Poisson so EB is identified. */
const MIXED: { attempts: number; ints: number }[] = [
  { attempts: 38, ints: 4 },
  { attempts: 32, ints: 3 },
  { attempts: 41, ints: 5 },
  { attempts: 35, ints: 0 },
  { attempts: 29, ints: 0 },
  { attempts: 44, ints: 1 },
  { attempts: 36, ints: 4 },
  { attempts: 31, ints: 0 },
];

describe("fitIntPerAttemptPrior / posteriorIntPerAttempt", () => {
  it("fits an INT-per-attempt prior and refuses 0-attempt rows as talent", () => {
    const prior = fitIntPerAttemptPrior(MIXED);
    expect(prior).not.toBeNull();
    expect(prior!.alpha / prior!.beta).toBeGreaterThan(0);
    expect(INT_HB_METHOD_TAG).toBe("props_hb_int_v1");
    expect(() => fitIntPerAttemptPrior([{ attempts: 0, ints: 0 }])).toThrow(RangeError);
  });
});

describe("intProbZero / probIntGivenAttempts", () => {
  it("is 1 at zero attempts — ZIP hurdle, not a 0% INT passer", () => {
    const prior = fitIntPerAttemptPrior(MIXED)!;
    const post = posteriorIntPerAttempt(prior, MIXED[0]!);
    expect(intProbZero(post, 0)).toBe(1);
    expect(probIntGivenAttempts(post, 0)).toBe(0);
  });

  it("rises with attempts at a fixed INT-per-attempt posterior", () => {
    const prior = fitIntPerAttemptPrior(MIXED)!;
    const post = posteriorIntPerAttempt(prior, MIXED[0]!);
    const few = probIntGivenAttempts(post, 8);
    const many = probIntGivenAttempts(post, 40);
    expect(many).toBeGreaterThan(few);
    expect(many).toBeGreaterThan(0.05);
    expect(many).toBeLessThan(1);
  });

  it("matches the closed form 1 − (β/(β+n))^α", () => {
    const post = posteriorRate({ alpha: 2, beta: 80 }, 0, 0);
    const n = 40;
    const expected = 1 - (80 / 120) ** 2;
    expect(probIntGivenAttempts(post, n)).toBeCloseTo(expected, 12);
  });

  it("Poisson fallback is exp(-m n) and does not invent φ", () => {
    const even = [
      { attempts: 40, ints: 1 },
      { attempts: 40, ints: 1 },
      { attempts: 40, ints: 1 },
      { attempts: 40, ints: 1 },
    ];
    expect(fitIntPerAttemptPrior(even)).toBeNull();
    const m = pooledIntPerAttempt(even);
    expect(m).toBeCloseTo(0.025, 12);
    expect(intProbZeroPoisson(m!, 0)).toBe(1);
    expect(intProbZeroPoisson(m!, 40)).toBeCloseTo(Math.exp(-1), 12);
  });
});

describe("probInt — mix over T", () => {
  it("is near 0 when next-game attempts are concentrated at 0", () => {
    const prior = fitIntPerAttemptPrior(MIXED)!;
    const intPost = posteriorIntPerAttempt(prior, MIXED[0]!);
    const attemptPost = posteriorRate({ alpha: 0.1, beta: 20 }, 0, 10);
    expect(probInt(intPost, attemptPost)).toBeLessThan(0.05);
  });

  it("exceeds the k=0 slice once attempts have mass", () => {
    const prior = fitIntPerAttemptPrior(MIXED)!;
    const intPost = posteriorIntPerAttempt(prior, MIXED[0]!);
    const attemptPost = posteriorRate({ alpha: 80, beta: 4 }, 320, 8);
    const mixed = probInt(intPost, attemptPost);
    expect(mixed).toBeGreaterThan(probIntGivenAttempts(intPost, 0));
    expect(mixed).toBeGreaterThan(0.05);
    expect(mixed).toBeLessThan(1);
  });
});

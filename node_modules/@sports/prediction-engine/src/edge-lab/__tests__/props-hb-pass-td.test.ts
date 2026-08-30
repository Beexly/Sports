import { describe, expect, it } from "vitest";
import { posteriorRate } from "../props-hb.js";
import {
  PASS_TD_HB_METHOD_TAG,
  fitPassTdPerAttemptPrior,
  passTdProbZero,
  passTdProbZeroPoisson,
  pooledPassTdPerAttempt,
  posteriorPassTdPerAttempt,
  probPassTd,
  probPassTdGivenAttempts,
} from "../props-hb-pass-td.js";

const MIXED: { attempts: number; passTds: number }[] = [
  { attempts: 38, passTds: 4 },
  { attempts: 32, passTds: 3 },
  { attempts: 41, passTds: 5 },
  { attempts: 35, passTds: 0 },
  { attempts: 29, passTds: 0 },
  { attempts: 44, passTds: 1 },
  { attempts: 36, passTds: 4 },
  { attempts: 31, passTds: 0 },
];

describe("fitPassTdPerAttemptPrior", () => {
  it("fits a pass-TD-per-attempt prior and refuses 0-attempt rows", () => {
    const prior = fitPassTdPerAttemptPrior(MIXED);
    expect(prior).not.toBeNull();
    expect(PASS_TD_HB_METHOD_TAG).toBe("props_hb_pass_td_v1");
    expect(() => fitPassTdPerAttemptPrior([{ attempts: 0, passTds: 0 }])).toThrow(RangeError);
  });
});

describe("passTdProbZero / Poisson fallback", () => {
  it("ZIP hurdle at attempts=0", () => {
    const prior = fitPassTdPerAttemptPrior(MIXED)!;
    const post = posteriorPassTdPerAttempt(prior, MIXED[0]!);
    expect(passTdProbZero(post, 0)).toBe(1);
    expect(probPassTdGivenAttempts(post, 0)).toBe(0);
    expect(probPassTdGivenAttempts(post, 40)).toBeGreaterThan(probPassTdGivenAttempts(post, 8));
  });

  it("matches 1 − (β/(β+n))^α", () => {
    const post = posteriorRate({ alpha: 2, beta: 40 }, 0, 0);
    expect(probPassTdGivenAttempts(post, 20)).toBeCloseTo(1 - (40 / 60) ** 2, 12);
  });

  it("Poisson fallback does not invent φ", () => {
    const even = [
      { attempts: 40, passTds: 2 },
      { attempts: 40, passTds: 2 },
      { attempts: 40, passTds: 2 },
      { attempts: 40, passTds: 2 },
    ];
    expect(fitPassTdPerAttemptPrior(even)).toBeNull();
    const m = pooledPassTdPerAttempt(even);
    expect(m).toBeCloseTo(0.05, 12);
    expect(passTdProbZeroPoisson(m!, 20)).toBeCloseTo(Math.exp(-1), 12);
  });
});

describe("probPassTd mix", () => {
  it("is near 0 when attempts concentrate at 0", () => {
    const prior = fitPassTdPerAttemptPrior(MIXED)!;
    const tdPost = posteriorPassTdPerAttempt(prior, MIXED[0]!);
    const attemptPost = posteriorRate({ alpha: 0.1, beta: 20 }, 0, 10);
    expect(probPassTd(tdPost, attemptPost)).toBeLessThan(0.05);
  });

  it("exceeds the k=0 slice once attempts have mass", () => {
    const prior = fitPassTdPerAttemptPrior(MIXED)!;
    const tdPost = posteriorPassTdPerAttempt(prior, MIXED[0]!);
    const attemptPost = posteriorRate({ alpha: 80, beta: 4 }, 320, 8);
    const mixed = probPassTd(tdPost, attemptPost);
    expect(mixed).toBeGreaterThan(0.05);
    expect(mixed).toBeLessThan(1);
  });
});

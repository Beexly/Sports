import { describe, expect, it } from "vitest";
import { posteriorRate } from "../props-hb.js";
import {
  ATD_HB_METHOD_TAG,
  fitTdPerTouchPrior,
  pooledTdPerTouch,
  posteriorTdPerTouch,
  probAnytimeTd,
  probAnytimeTdGivenTouches,
  tdProbZero,
  tdProbZeroPoisson,
} from "../props-hb-atd.js";

/** Goal-line vultures vs possession WRs — extra-Poisson so EB is identified. */
const MIXED: { touches: number; tds: number }[] = [
  { touches: 12, tds: 8 },
  { touches: 10, tds: 6 },
  { touches: 15, tds: 7 },
  { touches: 80, tds: 0 },
  { touches: 70, tds: 1 },
  { touches: 90, tds: 0 },
  { touches: 11, tds: 5 },
  { touches: 85, tds: 1 },
];

describe("fitTdPerTouchPrior / posteriorTdPerTouch", () => {
  it("fits a TD-per-touch prior and refuses 0-touch rows as talent", () => {
    const prior = fitTdPerTouchPrior(MIXED);
    expect(prior).not.toBeNull();
    expect(prior!.alpha / prior!.beta).toBeGreaterThan(0);
    expect(ATD_HB_METHOD_TAG).toBe("props_hb_atd_v1");
    expect(() => fitTdPerTouchPrior([{ touches: 0, tds: 0 }])).toThrow(RangeError);
  });
});

describe("tdProbZero / probAnytimeTdGivenTouches", () => {
  it("is 1 at zero touches — ZIP hurdle, not a 0% scorer", () => {
    const prior = fitTdPerTouchPrior(MIXED)!;
    const post = posteriorTdPerTouch(prior, MIXED[0]!);
    expect(tdProbZero(post, 0)).toBe(1);
    expect(probAnytimeTdGivenTouches(post, 0)).toBe(0);
  });

  it("rises with touches at a fixed TD-per-touch posterior", () => {
    const prior = fitTdPerTouchPrior(MIXED)!;
    const post = posteriorTdPerTouch(prior, MIXED[0]!);
    const few = probAnytimeTdGivenTouches(post, 4);
    const many = probAnytimeTdGivenTouches(post, 20);
    expect(many).toBeGreaterThan(few);
    expect(many).toBeGreaterThan(0.05);
    expect(many).toBeLessThan(1);
  });

  it("matches the closed form 1 − (β/(β+n))^α", () => {
    const post = posteriorRate({ alpha: 2, beta: 20 }, 0, 0);
    const n = 10;
    const expected = 1 - (20 / 30) ** 2;
    expect(probAnytimeTdGivenTouches(post, n)).toBeCloseTo(expected, 12);
  });

  it("Poisson fallback is exp(-m n) and does not invent φ", () => {
    const even = [
      { touches: 20, tds: 2 },
      { touches: 20, tds: 2 },
      { touches: 20, tds: 2 },
      { touches: 20, tds: 2 },
    ];
    expect(fitTdPerTouchPrior(even)).toBeNull();
    const m = pooledTdPerTouch(even);
    expect(m).toBeCloseTo(0.1, 12);
    expect(tdProbZeroPoisson(m!, 0)).toBe(1);
    expect(tdProbZeroPoisson(m!, 10)).toBeCloseTo(Math.exp(-1), 12);
  });
});

describe("probAnytimeTd — mix over T", () => {
  it("is near 0 when next-game touches are concentrated at 0", () => {
    const prior = fitTdPerTouchPrior(MIXED)!;
    const tdPost = posteriorTdPerTouch(prior, MIXED[0]!);
    const touchPost = posteriorRate({ alpha: 0.1, beta: 20 }, 0, 10);
    expect(probAnytimeTd(tdPost, touchPost)).toBeLessThan(0.05);
  });

  it("exceeds the k=0 slice once touches have mass", () => {
    const prior = fitTdPerTouchPrior(MIXED)!;
    const tdPost = posteriorTdPerTouch(prior, MIXED[0]!);
    const touchPost = posteriorRate({ alpha: 80, beta: 8 }, 160, 8);
    const mixed = probAnytimeTd(tdPost, touchPost);
    expect(mixed).toBeGreaterThan(probAnytimeTdGivenTouches(tdPost, 0));
    expect(mixed).toBeGreaterThan(0.05);
    expect(mixed).toBeLessThan(1);
  });
});

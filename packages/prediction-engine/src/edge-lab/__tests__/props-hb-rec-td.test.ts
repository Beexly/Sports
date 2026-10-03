import { describe, expect, it } from "vitest";
import { posteriorRate } from "../props-hb.js";
import {
  REC_TD_HB_METHOD_TAG,
  fitRecTdPerTargetPrior,
  pooledRecTdPerTarget,
  posteriorRecTdPerTarget,
  probRecTd,
  probRecTdGivenTargets,
  recTdProbZero,
  recTdProbZeroPoisson,
} from "../props-hb-rec-td.js";

/** Red-zone WRs vs possession slots — extra-Poisson so EB is identified. */
const MIXED: { targets: number; recTds: number }[] = [
  { targets: 10, recTds: 4 },
  { targets: 8, recTds: 3 },
  { targets: 12, recTds: 5 },
  { targets: 90, recTds: 1 },
  { targets: 80, recTds: 0 },
  { targets: 100, recTds: 1 },
  { targets: 9, recTds: 4 },
  { targets: 85, recTds: 0 },
];

describe("fitRecTdPerTargetPrior / posteriorRecTdPerTarget", () => {
  it("fits a rec-TD-per-target prior and refuses 0-target rows as talent", () => {
    const prior = fitRecTdPerTargetPrior(MIXED);
    expect(prior).not.toBeNull();
    expect(prior!.alpha / prior!.beta).toBeGreaterThan(0);
    expect(REC_TD_HB_METHOD_TAG).toBe("props_hb_rec_td_v1");
    expect(() => fitRecTdPerTargetPrior([{ targets: 0, recTds: 0 }])).toThrow(RangeError);
  });
});

describe("recTdProbZero / probRecTdGivenTargets", () => {
  it("is 1 at zero targets — ZIP hurdle, not a 0% scorer", () => {
    const prior = fitRecTdPerTargetPrior(MIXED)!;
    const post = posteriorRecTdPerTarget(prior, MIXED[0]!);
    expect(recTdProbZero(post, 0)).toBe(1);
    expect(probRecTdGivenTargets(post, 0)).toBe(0);
  });

  it("rises with targets at a fixed rec-TD-per-target posterior", () => {
    const prior = fitRecTdPerTargetPrior(MIXED)!;
    const post = posteriorRecTdPerTarget(prior, MIXED[0]!);
    const few = probRecTdGivenTargets(post, 3);
    const many = probRecTdGivenTargets(post, 14);
    expect(many).toBeGreaterThan(few);
    expect(many).toBeGreaterThan(0.05);
    expect(many).toBeLessThan(1);
  });

  it("matches the closed form 1 − (β/(β+n))^α", () => {
    const post = posteriorRate({ alpha: 2, beta: 20 }, 0, 0);
    const n = 10;
    const expected = 1 - (20 / 30) ** 2;
    expect(probRecTdGivenTargets(post, n)).toBeCloseTo(expected, 12);
  });

  it("Poisson fallback is exp(-m n) and does not invent φ", () => {
    const even = [
      { targets: 20, recTds: 2 },
      { targets: 20, recTds: 2 },
      { targets: 20, recTds: 2 },
      { targets: 20, recTds: 2 },
    ];
    expect(fitRecTdPerTargetPrior(even)).toBeNull();
    const m = pooledRecTdPerTarget(even);
    expect(m).toBeCloseTo(0.1, 12);
    expect(recTdProbZeroPoisson(m!, 0)).toBe(1);
    expect(recTdProbZeroPoisson(m!, 10)).toBeCloseTo(Math.exp(-1), 12);
  });
});

describe("probRecTd — mix over T", () => {
  it("is near 0 when next-game targets are concentrated at 0", () => {
    const prior = fitRecTdPerTargetPrior(MIXED)!;
    const tdPost = posteriorRecTdPerTarget(prior, MIXED[0]!);
    const targetPost = posteriorRate({ alpha: 0.1, beta: 20 }, 0, 10);
    expect(probRecTd(tdPost, targetPost)).toBeLessThan(0.05);
  });

  it("exceeds the k=0 slice once targets have mass", () => {
    const prior = fitRecTdPerTargetPrior(MIXED)!;
    const tdPost = posteriorRecTdPerTarget(prior, MIXED[0]!);
    const targetPost = posteriorRate({ alpha: 80, beta: 8 }, 160, 8);
    const mixed = probRecTd(tdPost, targetPost);
    expect(mixed).toBeGreaterThan(probRecTdGivenTargets(tdPost, 0));
    expect(mixed).toBeGreaterThan(0.05);
    expect(mixed).toBeLessThan(1);
  });
});

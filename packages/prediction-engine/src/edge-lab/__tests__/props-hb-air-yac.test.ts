import { describe, expect, it } from "vitest";
import { posteriorRate } from "../props-hb.js";
import {
  AIR_YAC_METHOD_TAG,
  convolveSurvival,
  fitAirYacPriors,
  nbPredictivePmf,
  posteriorAirYac,
  probOverReceivingYards,
  probOverYardsGivenReceptions,
} from "../props-hb-air-yac.js";

const DEEP_AND_YAC: { receptions: number; airYards: number; yac: number }[] = [
  { receptions: 8, airYards: 80, yac: 16 },
  { receptions: 8, airYards: 72, yac: 24 },
  { receptions: 10, airYards: 100, yac: 20 },
  { receptions: 6, airYards: 12, yac: 48 },
  { receptions: 7, airYards: 14, yac: 56 },
  { receptions: 9, airYards: 18, yac: 54 },
];

describe("fitAirYacPriors / posteriorAirYac", () => {
  it("fits separate air and YAC priors so a screen specialist is not a deep threat", () => {
    const priors = fitAirYacPriors(DEEP_AND_YAC);
    expect(priors).not.toBeNull();
    expect(priors!.air.alpha / priors!.air.beta).toBeGreaterThan(3);
    expect(priors!.yac.alpha / priors!.yac.beta).toBeGreaterThan(2);
    expect(AIR_YAC_METHOD_TAG).toBe("props_hb_air_yac_v1");
  });

  it("rejects 0-reception rows — they are not a 0-yard receiver", () => {
    expect(() =>
      fitAirYacPriors([{ receptions: 0, airYards: 0, yac: 0 }]),
    ).toThrow(RangeError);
  });

  it("rejects negative YAC instead of letting laterals rewrite the count model", () => {
    expect(() =>
      fitAirYacPriors([{ receptions: 4, airYards: 20, yac: -3 }]),
    ).toThrow(RangeError);
  });
});

describe("nbPredictivePmf / convolveSurvival", () => {
  it("pmf sums to ~1 on a well-identified posterior", () => {
    const post = posteriorRate({ alpha: 12, beta: 4 }, 36, 12);
    let mass = 0;
    for (let k = 0; k <= 80; k++) mass += nbPredictivePmf(post, 4, k);
    expect(mass).toBeGreaterThan(0.99);
    expect(mass).toBeLessThanOrEqual(1 + 1e-9);
  });

  it("convolution of two spikes is their sum", () => {
    const a = [0, 0, 1];
    const b = [0, 0, 0, 1];
    expect(convolveSurvival(a, b, 4.5)).toBe(1);
    expect(convolveSurvival(a, b, 5)).toBe(0);
    expect(convolveSurvival(a, b, -0.1)).toBe(1);
  });
});

describe("probOverYardsGivenReceptions", () => {
  it("is 0 when recs=0 and the line is non-negative — ZIP hurdle", () => {
    const priors = fitAirYacPriors(DEEP_AND_YAC)!;
    const posts = posteriorAirYac(priors, DEEP_AND_YAC[0]!);
    expect(probOverYardsGivenReceptions(posts, 0, 0.5)).toBe(0);
    expect(probOverYardsGivenReceptions(posts, 0, -1)).toBe(1);
  });

  it("falls as the line rises at a fixed catch count", () => {
    const priors = fitAirYacPriors(DEEP_AND_YAC)!;
    const posts = posteriorAirYac(priors, DEEP_AND_YAC[0]!);
    const low = probOverYardsGivenReceptions(posts, 8, 24.5);
    const mid = probOverYardsGivenReceptions(posts, 8, 79.5);
    const high = probOverYardsGivenReceptions(posts, 8, 199.5);
    expect(low).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(high);
    expect(low).toBeGreaterThan(0.4);
    expect(high).toBeLessThan(0.05);
  });
});

describe("probOverReceivingYards — mix over T", () => {
  it("is near 0 when next-game receptions are concentrated at 0", () => {
    const priors = fitAirYacPriors(DEEP_AND_YAC)!;
    const posts = posteriorAirYac(priors, DEEP_AND_YAC[0]!);
    const recPost = posteriorRate({ alpha: 0.1, beta: 20 }, 0, 10);
    expect(probOverReceivingYards(posts, recPost, 39.5)).toBeLessThan(0.05);
  });

  it("exceeds the k=0 slice once receptions have mass above zero", () => {
    const priors = fitAirYacPriors(DEEP_AND_YAC)!;
    const posts = posteriorAirYac(priors, DEEP_AND_YAC[0]!);
    const recPost = posteriorRate({ alpha: 80, beta: 10 }, 80, 10);
    const mixed = probOverReceivingYards(posts, recPost, 39.5);
    expect(mixed).toBeGreaterThan(0.2);
    expect(mixed).toBeLessThan(1);
  });
});

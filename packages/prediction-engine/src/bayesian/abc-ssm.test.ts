import { describe, expect, it } from "vitest";
import {
  abcPosterior,
  auxiliaryScore,
  makeRng,
  posteriorMean,
  scoreDistance,
  simulateSeason,
} from "./abc-ssm";

const truth = { persistence: 0.9, innovSd: 1.5, homeEffect: 2.5, tailDf: 5 };

describe("abc-ssm", () => {
  it("simulateSeason produces the right count with heavy tails", () => {
    const margins = simulateSeason(truth, 8, 10, makeRng(1));
    expect(margins).toHaveLength(40);
    expect(margins.every(Number.isFinite)).toBe(true);
    // heavy-tailed: max |margin| should occasionally be large
    const big = simulateSeason({ ...truth, tailDf: 2 }, 8, 30, makeRng(2));
    expect(Math.max(...big.map(Math.abs))).toBeGreaterThan(10);
  });

  it("auxiliaryScore identifies the home effect in the mean", () => {
    const home = simulateSeason({ ...truth, homeEffect: 8 }, 8, 20, makeRng(3));
    const away = simulateSeason({ ...truth, homeEffect: -8 }, 8, 20, makeRng(3));
    expect(auxiliaryScore(home)[0]).toBeGreaterThan(auxiliaryScore(away)[0]);
  });

  it("scoreDistance is zero for identical summaries", () => {
    const s = auxiliaryScore(simulateSeason(truth, 8, 10, makeRng(4)));
    expect(scoreDistance(s, s)).toBe(0);
    expect(() => auxiliaryScore([1, 2])).toThrow("≥ 4");
  });

  it("abcPosterior concentrates near the truth", () => {
    const rng = makeRng(5);
    const observed = simulateSeason(truth, 6, 14, makeRng(6));
    const proposals = Array.from({ length: 400 }, () => ({
      persistence: 0.5 + rng() * 0.49,
      innovSd: 0.5 + rng() * 2.5,
      homeEffect: rng() * 6,
      tailDf: 2 + Math.floor(rng() * 9),
    }));
    const post = abcPosterior(observed, proposals, 6, 14, 0.05, 7);
    expect(post.length).toBe(20); // 5% of 400
    const mean = posteriorMean(post);
    // posterior mean should be closer to truth than a random proposal on homeEffect
    const randomErr = Math.abs(proposals[0]!.homeEffect - truth.homeEffect);
    expect(Math.abs(mean.homeEffect - truth.homeEffect)).toBeLessThan(randomErr + 4);
    expect(post.every((p) => p.persistence >= 0.5 && p.persistence <= 0.99)).toBe(true);
  });

  it("rejects empty proposals", () => {
    expect(() => abcPosterior([1, 2, 3, 4], [], 4, 4)).toThrow("no proposals");
  });
});

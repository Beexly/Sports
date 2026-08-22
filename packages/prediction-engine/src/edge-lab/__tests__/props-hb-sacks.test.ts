import { describe, expect, it } from "vitest";
import { posteriorRate } from "../props-hb.js";
import {
  SACK_HB_METHOD_TAG,
  betaBinomialProbOverSacks,
  fitSackPrior,
  posteriorSack,
  probOverSacks,
  scoreSacksOver,
} from "../props-hb-sacks.js";

describe("fitSackPrior", () => {
  it("fits a Beta on sack rate and refuses 0-dropback rows", () => {
    const prior = fitSackPrior([
      { dropbacks: 40, sacks: 6 },
      { dropbacks: 35, sacks: 1 },
      { dropbacks: 42, sacks: 7 },
      { dropbacks: 30, sacks: 0 },
      { dropbacks: 38, sacks: 5 },
      { dropbacks: 33, sacks: 1 },
    ]);
    expect(prior).not.toBeNull();
    expect(SACK_HB_METHOD_TAG).toBe("props_hb_sacks_v1");
    expect(() => fitSackPrior([{ dropbacks: 0, sacks: 0 }])).toThrow(RangeError);
    expect(() => fitSackPrior([{ dropbacks: 10, sacks: 11 }])).toThrow(RangeError);
  });
});

describe("betaBinomialProbOverSacks", () => {
  it("cannot sack more than dropbacks; ZIP at n=0", () => {
    const post = { alpha: 4, beta: 36, mean: 0.1 };
    expect(betaBinomialProbOverSacks(post, 0.5, 0)).toBe(0);
    expect(betaBinomialProbOverSacks(post, 9.5, 8)).toBe(0);
    expect(betaBinomialProbOverSacks(post, 2.5, 40)).toBeGreaterThan(betaBinomialProbOverSacks(post, 2.5, 20));
  });
});

describe("probOverSacks ZIP", () => {
  it("is near 0 when dropbacks concentrate at 0", () => {
    const sackPost = posteriorSack({ alpha: 4, beta: 36 }, 0, 0);
    const dropbackPost = posteriorRate({ alpha: 0.1, beta: 20 }, 0, 10);
    expect(probOverSacks(sackPost, dropbackPost, 1.5)).toBeLessThan(0.05);
  });

  it("scoreSacksOver is in (0,1) with mass on dropbacks", () => {
    const sackPrior = fitSackPrior([
      { dropbacks: 40, sacks: 6 },
      { dropbacks: 35, sacks: 1 },
      { dropbacks: 42, sacks: 7 },
      { dropbacks: 30, sacks: 0 },
    ]);
    expect(sackPrior).not.toBeNull();
    const p = scoreSacksOver({
      sackPrior: sackPrior!,
      dropbackPrior: { alpha: 40, beta: 2 },
      sackHistory: [
        { dropbacks: 40, sacks: 6 },
        { dropbacks: 35, sacks: 1 },
      ],
      dropbackGames: 6,
      dropbackTotal: 210,
      line: 1.5,
    });
    expect(p).toBeGreaterThan(0.05);
    expect(p).toBeLessThan(1);
  });
});

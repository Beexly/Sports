import { describe, expect, it } from "vitest";
import { posteriorRate } from "../props-hb.js";
import {
  KICKOFF_RETURN_YARDS_METHOD_TAG,
  KickoffReturnSample,
  fitKickoffReturnYardsPrior,
  fitKickoffReturnAttemptsPrior,
  posteriorKickoffReturnYards,
  posteriorKickoffReturnAttempts,
  probOverKickoffReturnYardsGivenReturns,
  probOverKickoffReturnYards,
  probOverKickoffReturnAttempts,
} from "../kickoff-return-yards.js";

// Realistic 2024 kickoff-return season lines (yards, returns).
// Yards-per-return ranges ~14–30 — wide spread gives the position-group
// prior enough between-player dispersion for fitGroupPrior to be non-null.
const RETURNERS: KickoffReturnSample[] = [
  { attempts: 12, yards: 312 },
  { attempts: 8, yards: 168 },
  { attempts: 15, yards: 450 },
  { attempts: 4, yards: 56 },
  { attempts: 10, yards: 280 },
  { attempts: 6, yards: 90 },
  { attempts: 18, yards: 468 },
  { attempts: 3, yards: 90 },
];

describe("fitKickoffReturnYardsPrior", () => {
  it("fits return-yards-per-return rate from (yards, returns) pairs", () => {
    const prior = fitKickoffReturnYardsPrior(RETURNERS);
    expect(prior).not.toBeNull();
    // Yards per return: ~26 ypr in the sample — rate must be in a sane range.
    const rate = prior!.alpha / prior!.beta;
    expect(rate).toBeGreaterThan(10);
    expect(rate).toBeLessThan(60);
    expect(KICKOFF_RETURN_YARDS_METHOD_TAG).toBe("kickoff_return_yards_v1");
  });

  it("refuses 0-return games — exposure 0, not a 0-yard sample", () => {
    expect(() => fitKickoffReturnYardsPrior([{ attempts: 0, yards: 0 }])).toThrow(RangeError);
  });

  it("refuses NaN / non-finite yards", () => {
    expect(() => fitKickoffReturnYardsPrior([{ attempts: 3, yards: NaN }])).toThrow(RangeError);
  });

  it("refuses negative yards", () => {
    expect(() => fitKickoffReturnYardsPrior([{ attempts: 3, yards: -5 }])).toThrow(RangeError);
  });

  it("returns null on empty input", () => {
    expect(fitKickoffReturnYardsPrior([])).toBeNull();
  });
});

describe("fitKickoffReturnAttemptsPrior", () => {
  it("fits returns-per-game rate from (games, returns) pairs", () => {
    const samples = [
      { games: 5, returns: 50 },
      { games: 8, returns: 40 },
      { games: 10, returns: 80 },
      { games: 3, returns: 12 },
    ];
    const prior = fitKickoffReturnAttemptsPrior(samples);
    expect(prior).not.toBeNull();
    const rate = prior!.alpha / prior!.beta;
    expect(rate).toBeGreaterThan(2);
    expect(rate).toBeLessThan(15);
  });

  it("accepts zero-return games (valid 0-rate observation)", () => {
    const prior = fitKickoffReturnAttemptsPrior([
      { games: 1, returns: 0 },
      { games: 1, returns: 5 },
    ]);
    expect(prior).not.toBeNull();
  });

  it("refuses games <= 0", () => {
    expect(() => fitKickoffReturnAttemptsPrior([{ games: 0, returns: 3 }])).toThrow(RangeError);
  });
});

describe("posteriorKickoffReturnYards", () => {
  it("shrinks toward group mean — player with more returns shrinks less", () => {
    const prior = fitKickoffReturnYardsPrior(RETURNERS)!;
    const lowVolume = posteriorKickoffReturnYards(prior, { attempts: 3, yards: 75 });
    const highVolume = posteriorKickoffReturnYards(prior, { attempts: 18, yards: 468 });

    const groupMean = prior.alpha / prior.beta;
    // Low-volume player is pulled more toward the group mean.
    const distLow = Math.abs(lowVolume.mean - groupMean);
    const distHigh = Math.abs(highVolume.mean - groupMean);
    expect(distLow).toBeLessThan(distHigh);
  });
});

describe("posteriorKickoffReturnAttempts", () => {
  it("collapses to prior when games=0 (full shrinkage)", () => {
    const prior = fitKickoffReturnAttemptsPrior([
      { games: 5, returns: 50 },
      { games: 8, returns: 40 },
    ])!;
    const post = posteriorKickoffReturnAttempts(prior, { games: 0, returns: 0 });
    expect(post.alpha).toBe(prior.alpha);
    expect(post.beta).toBe(prior.beta);
  });
});

describe("probOverKickoffReturnYardsGivenReturns", () => {
  it("is 0 when returns=0 and line is non-negative — ZIP hurdle", () => {
    const prior = fitKickoffReturnYardsPrior(RETURNERS)!;
    const post = posteriorKickoffReturnYards(prior, RETURNERS[0]!);
    expect(probOverKickoffReturnYardsGivenReturns(post, 0, 0.5)).toBe(0);
    // Negative line: P(yards > -1) = 1 always (yards is non-negative).
    expect(probOverKickoffReturnYardsGivenReturns(post, 0, -1)).toBe(1);
  });

  it("rises with returns at a fixed line", () => {
    const prior = fitKickoffReturnYardsPrior(RETURNERS)!;
    const post = posteriorKickoffReturnYards(prior, RETURNERS[0]!);
    const few = probOverKickoffReturnYardsGivenReturns(post, 3, 49.5);
    const many = probOverKickoffReturnYardsGivenReturns(post, 12, 49.5);
    expect(many).toBeGreaterThan(few);
  });

  it("approaches 1 at a very low line with many returns", () => {
    const prior = fitKickoffReturnYardsPrior(RETURNERS)!;
    const post = posteriorKickoffReturnYards(prior, RETURNERS[6]!); // 18 ret, 468 yds
    const p = probOverKickoffReturnYardsGivenReturns(post, 18, 10.5);
    expect(p).toBeCloseTo(1, 6);
  });

  it("is near 0 at a very high line with few returns", () => {
    const prior = fitKickoffReturnYardsPrior(RETURNERS)!;
    const post = posteriorKickoffReturnYards(prior, RETURNERS[7]!); // 3 ret, 69 yds
    const p = probOverKickoffReturnYardsGivenReturns(post, 1, 200.5);
    expect(p).toBeLessThan(0.01);
  });

  it("throws on non-finite inputs", () => {
    const prior = fitKickoffReturnYardsPrior(RETURNERS)!;
    const post = posteriorKickoffReturnYards(prior, RETURNERS[0]!);
    expect(() => probOverKickoffReturnYardsGivenReturns(post, NaN, 49.5)).toThrow(RangeError);
    expect(() => probOverKickoffReturnYardsGivenReturns(post, 5, NaN)).toThrow(RangeError);
  });
});

describe("probOverKickoffReturnYards — mix over T", () => {
  it("is near 0 when next-game returns are concentrated at 0", () => {
    const prior = fitKickoffReturnYardsPrior(RETURNERS)!;
    const yardPost = posteriorKickoffReturnYards(prior, RETURNERS[0]!);
    // attPost with very low rate (few returns expected)
    const retPost = posteriorRate({ alpha: 0.1, beta: 20 }, 0, 10);
    expect(probOverKickoffReturnYards(yardPost, retPost, 49.5)).toBeLessThan(0.05);
  });

  it("exceeds the k=0 slice once returns have mass", () => {
    const prior = fitKickoffReturnYardsPrior(RETURNERS)!;
    const yardPost = posteriorKickoffReturnYards(prior, RETURNERS[0]!);
    // Realistic kickoff-returner: ~5 returns per game (mean = 60/13 ≈ 4.6)
    const retPost = posteriorRate({ alpha: 40, beta: 8 }, 20, 5);
    const mixed = probOverKickoffReturnYards(yardPost, retPost, 49.5);
    expect(mixed).toBeGreaterThan(0.2);
    expect(mixed).toBeLessThan(1);
  });

  it("line < 0 returns 1", () => {
    const prior = fitKickoffReturnYardsPrior(RETURNERS)!;
    const yardPost = posteriorKickoffReturnYards(prior, RETURNERS[0]!);
    const retPost = posteriorRate({ alpha: 80, beta: 8 }, 160, 8);
    expect(probOverKickoffReturnYards(yardPost, retPost, -1)).toBe(1);
  });
});

describe("probOverKickoffReturnAttempts", () => {
  it("delegates to probOver on the returns posterior", () => {
    const prior = fitKickoffReturnAttemptsPrior([
      { games: 8, returns: 80 },
      { games: 5, returns: 25 },
      { games: 10, returns: 70 },
    ])!;
    const post = posteriorKickoffReturnAttempts(prior, { games: 8, returns: 80 });
    const p = probOverKickoffReturnAttempts(post, 4.5); // P(returns > 4.5) = P(>=5)
    expect(p).toBeGreaterThan(0.01);
    expect(p).toBeLessThan(0.99);
  });
});

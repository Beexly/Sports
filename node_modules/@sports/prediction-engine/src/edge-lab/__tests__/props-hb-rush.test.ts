import { describe, expect, it } from "vitest";
import { posteriorRate } from "../props-hb.js";
import {
  RUSH_HB_METHOD_TAG,
  fitYardsPerAttemptPrior,
  posteriorYardsPerAttempt,
  probOverRushYards,
  probOverRushYardsGivenAttempts,
} from "../props-hb-rush.js";

const BACKS: { attempts: number; yards: number }[] = [
  { attempts: 18, yards: 86 },
  { attempts: 16, yards: 64 },
  { attempts: 22, yards: 110 },
  { attempts: 8, yards: 22 },
  { attempts: 14, yards: 91 },
  { attempts: 20, yards: 48 },
  { attempts: 12, yards: 73 },
  { attempts: 19, yards: 95 },
];

describe("fitYardsPerAttemptPrior", () => {
  it("fits yards-per-attempt and refuses 0-attempt rows as talent", () => {
    const prior = fitYardsPerAttemptPrior(BACKS);
    expect(prior).not.toBeNull();
    expect(prior!.alpha / prior!.beta).toBeGreaterThan(2);
    expect(RUSH_HB_METHOD_TAG).toBe("props_hb_rush_v1");
    expect(() => fitYardsPerAttemptPrior([{ attempts: 0, yards: 0 }])).toThrow(RangeError);
  });
});

describe("probOverRushYardsGivenAttempts", () => {
  it("is 0 when attempts=0 and the line is non-negative — ZIP hurdle", () => {
    const prior = fitYardsPerAttemptPrior(BACKS)!;
    const post = posteriorYardsPerAttempt(prior, BACKS[0]!);
    expect(probOverRushYardsGivenAttempts(post, 0, 0.5)).toBe(0);
    expect(probOverRushYardsGivenAttempts(post, 0, -1)).toBe(1);
  });

  it("rises with attempts at a fixed line", () => {
    const prior = fitYardsPerAttemptPrior(BACKS)!;
    const post = posteriorYardsPerAttempt(prior, BACKS[0]!);
    const few = probOverRushYardsGivenAttempts(post, 6, 49.5);
    const many = probOverRushYardsGivenAttempts(post, 20, 49.5);
    expect(many).toBeGreaterThan(few);
  });
});

describe("probOverRushYards — mix over T", () => {
  it("is near 0 when next-game attempts are concentrated at 0", () => {
    const prior = fitYardsPerAttemptPrior(BACKS)!;
    const yardPost = posteriorYardsPerAttempt(prior, BACKS[0]!);
    const attPost = posteriorRate({ alpha: 0.1, beta: 20 }, 0, 10);
    expect(probOverRushYards(yardPost, attPost, 49.5)).toBeLessThan(0.05);
  });

  it("exceeds the k=0 slice once attempts have mass", () => {
    const prior = fitYardsPerAttemptPrior(BACKS)!;
    const yardPost = posteriorYardsPerAttempt(prior, BACKS[0]!);
    const attPost = posteriorRate({ alpha: 80, beta: 8 }, 160, 8);
    const mixed = probOverRushYards(yardPost, attPost, 49.5);
    expect(mixed).toBeGreaterThan(0.2);
    expect(mixed).toBeLessThan(1);
  });
});

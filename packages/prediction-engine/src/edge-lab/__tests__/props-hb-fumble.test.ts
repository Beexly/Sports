/**
 * Fumbles model tests (props-hb-fumble).
 *
 * H2 Edge — Fumbles | touches. Beta-Binomial.
 *
 * Tests:
 *  - Method tag.
 *  - fitFumblePrior on realistic fumble rate spread (1-5%).
 *  - Returns null when all touches are 0.
 *  - Excludes zero-touch games.
 *  - fumblePosterior updates alpha/beta correctly.
 *  - 0 touches → posterior unchanged.
 */
import { describe, it, expect } from "vitest";
import {
  FUMBLE_HB_METHOD_TAG,
  fitFumblePrior,
  fumblePosterior,
  probOverFumble,
  type FumbleSample,
} from "../props-hb-fumble.js";

describe("fumble model contract", () => {
  it("method tag is stamped", () => {
    expect(FUMBLE_HB_METHOD_TAG).toBe("props_hb_fumble_v1");
  });

  // Fumble rates: most RBs/WRs ~0.5-1.5%, but ball-security outliers run 3-6%.
  // Spread must exceed sampling noise or fitCatchPrior correctly fails closed.
  const NFL_SAMPLES: FumbleSample[] = [
    { touches: 280, fumbles: 3 },  // 1.07% — RB
    { touches: 310, fumbles: 4 },  // 1.29% — RB
    { touches: 120, fumbles: 1 },  // 0.83% — WR
    { touches: 95, fumbles: 1 },   // 1.05% — WR
    { touches: 85, fumbles: 5 },   // 5.88% — fumble-prone TE
    { touches: 68, fumbles: 4 },   // 5.88% — fumble-prone change-of-pace back
  ];

  it("fitFumblePrior returns beta params on realistic samples", () => {
    const prior = fitFumblePrior(NFL_SAMPLES);
    expect(prior).not.toBeNull();
    expect(prior!.alpha).toBeGreaterThan(0);
    expect(prior!.beta).toBeGreaterThan(0);
  });

  it("fitFumblePrior returns null when all touches are 0", () => {
    expect(fitFumblePrior([{ touches: 0, fumbles: 0 }])).toBeNull();
  });

  it("fitFumblePrior excludes zero-touch games", () => {
    const samples: FumbleSample[] = [
      { touches: 0, fumbles: 0 }, // scratch — excluded
      ...NFL_SAMPLES,
    ];
    expect(fitFumblePrior(samples)).not.toBeNull();
  });

  it("fumblePosterior updates alpha/beta correctly", () => {
    const prior = { alpha: 3, beta: 297 }; // 1% prior
    const post = fumblePosterior(prior, 2, 80); // 2 fumbles, 80 touches
    expect(post.alpha).toBe(5);     // 3 + 2
    expect(post.beta).toBe(297 + 78); // 297 + (80 - 2)
    expect(post.mean).toBeCloseTo(5 / 380, 6); // alpha/(alpha+beta) = 5/(5+375)
  });

  it("fumblePosterior with 0 touches leaves prior unchanged", () => {
    const prior = { alpha: 3, beta: 297 };
    const post = fumblePosterior(prior, 0, 0);
    expect(post.alpha).toBe(3);
    expect(post.beta).toBe(297);
  });

  it("probOverFumble: lower line → higher probability (monotonic)", () => {
    const prior = fitFumblePrior(NFL_SAMPLES)!;
    const post = fumblePosterior(prior, 1, 85);
    const pLow = probOverFumble(post, 0, 50);
    const pHigh = probOverFumble(post, 2, 50);
    expect(pLow).toBeGreaterThan(pHigh);
  });

  it("probOverFumble returns probability in [0, 1]", () => {
    const prior = fitFumblePrior(NFL_SAMPLES)!;
    const post = fumblePosterior(prior, 1, 85);
    const p = probOverFumble(post, 1, 85);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it("probOverFumble: 0 touches → P(FUM > 0) = 0", () => {
    const prior = fitFumblePrior(NFL_SAMPLES)!;
    const post = fumblePosterior(prior, 0, 0);
    expect(probOverFumble(post, 0, 0)).toBe(0);
  });

  it("probOverFumble: negative line → probability 1", () => {
    const prior = fitFumblePrior(NFL_SAMPLES)!;
    const post = fumblePosterior(prior, 2, 100);
    expect(probOverFumble(post, -1, 100)).toBe(1);
  });
});

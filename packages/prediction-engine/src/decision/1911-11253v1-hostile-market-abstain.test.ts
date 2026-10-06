// Tests for decision/1911-11253v1-hostile-market-abstain.ts (vitest).
import { describe, it, expect } from "vitest";
import {
  hostileMarketScore,
  hostileNoBet,
  tuneLambdaToRate,
  hostileGatePasses,
  DEFAULT_NO_BET_WEIGHTS,
} from "./1911-11253v1-hostile-market-abstain.js";

const CALM = {
  lineMoveMagnitude: 0.3,
  hoursToKickoffAtMove: 72,
  reverseLineMove: false,
  newsVolumeAnomaly: 0.2,
  oodScore: 0.1,
};

const HOSTILE = {
  lineMoveMagnitude: 3.5,
  hoursToKickoffAtMove: 1.5,
  reverseLineMove: true,
  newsVolumeAnomaly: 2.8,
  oodScore: 0.85,
};

describe("hostileMarketScore (1911.11253v1)", () => {
  it("scores hostile markets far above calm markets", () => {
    const calm = hostileMarketScore(CALM, DEFAULT_NO_BET_WEIGHTS);
    const hostile = hostileMarketScore(HOSTILE, DEFAULT_NO_BET_WEIGHTS);
    expect(hostile).toBeGreaterThan(calm + 0.3);
    expect(calm).toBeLessThan(0.5);
    expect(hostile).toBeGreaterThan(0.5);
  });
  it("is monotone in line-move magnitude", () => {
    const a = hostileMarketScore({ ...CALM, lineMoveMagnitude: 1 }, DEFAULT_NO_BET_WEIGHTS);
    const b = hostileMarketScore({ ...CALM, lineMoveMagnitude: 3 }, DEFAULT_NO_BET_WEIGHTS);
    expect(b).toBeGreaterThan(a);
  });
  it("late moves score higher than early ones (steam timing)", () => {
    const early = hostileMarketScore({ ...HOSTILE, hoursToKickoffAtMove: 96 }, DEFAULT_NO_BET_WEIGHTS);
    const late = hostileMarketScore({ ...HOSTILE, hoursToKickoffAtMove: 1 }, DEFAULT_NO_BET_WEIGHTS);
    expect(late).toBeGreaterThan(early);
  });
});

describe("tuneLambdaToRate", () => {
  it("hits the target no-bet rate", () => {
    const scores = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.05];
    const { lambda, rate } = tuneLambdaToRate(scores, 0.3);
    expect(rate).toBeCloseTo(0.3, 10);
    expect(lambda).toBeCloseTo(0.7, 10);
    // Decisions at the tuned lambda reproduce the rate.
    const decided = scores.filter((s) => hostileNoBet(s, lambda)).length / scores.length;
    expect(decided).toBeCloseTo(rate, 10);
  });
  it("handles empty input", () => {
    expect(tuneLambdaToRate([], 0.2)).toEqual({ lambda: 1, rate: 0 });
  });
});

describe("hostileGatePasses", () => {
  it("encodes the >=40% wrong-rate cut at matched no-bet rate", () => {
    expect(hostileGatePasses(0.09, 0.15, 0.2, 0.2, 0.56, 0.55)).toBe(true);
    expect(hostileGatePasses(0.1, 0.15, 0.2, 0.2, 0.56, 0.55)).toBe(false); // only 33% cut
    expect(hostileGatePasses(0.09, 0.15, 0.25, 0.2, 0.56, 0.55)).toBe(false); // rate mismatch
    expect(hostileGatePasses(0.09, 0.15, 0.2, 0.2, 0.54, 0.55)).toBe(false); // hit-rate loss
  });
});

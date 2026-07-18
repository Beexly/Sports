import { describe, expect, it } from "vitest";
import {
  buildAmericanOddsConsensus,
  buildMarketPointConsensus,
  buildMarketPointDelta,
  formatAmericanOdds,
  formatCanonicalPickLine,
  formatMarketDelta,
  formatMarketPoint,
  formatSignedMarketPoint,
  normalizeAmericanOdds,
  normalizeMarketPoint,
} from "../market-values.js";

describe("canonical American odds", () => {
  it.each([-5000, -200, -110, -100, 100, 105, 200, 5000])(
    "accepts supported integer price %s",
    (raw) => {
      expect(normalizeAmericanOdds(raw)).toMatchObject({
        kind: "AMERICAN_ODDS",
        raw,
        normalized: raw,
      });
    },
  );

  it.each([
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    0,
    1.91,
    -1.1,
    99,
    -99,
    -110.5,
    -7750,
    -11000,
  ])("quarantines unsupported or unit-confused price %s", (raw) => {
    expect(normalizeAmericanOdds(raw)).toBeNull();
  });

  it("formats the pick'em discontinuity as real American prices", () => {
    expect(formatAmericanOdds(-100)).toBe("-100");
    expect(formatAmericanOdds(100)).toBe("+100");
    expect(formatAmericanOdds(1.91)).toBe("N/A");
  });

  it("chooses an observed price in probability space instead of inventing an average", () => {
    const consensus = buildAmericanOddsConsensus([-110, 105, -39, 1.91]);
    expect(consensus).toMatchObject({
      kind: "AMERICAN_ODDS_CONSENSUS",
      executable: -110,
      normalizedValues: [-110, 105],
      rejectedValues: [-39, 1.91],
    });
    expect(consensus?.normalizedValues).toContain(consensus?.executable);
  });
});

describe("canonical spread and total points", () => {
  it("fails closed when the sport policy is unknown", () => {
    expect(normalizeMarketPoint("SPREAD_POINTS", "", -3.5)).toBeNull();
    expect(normalizeMarketPoint("TOTAL_POINTS", "made_up_league", 48.5)).toBeNull();
  });
  it("supports soccer quarter handicaps and removes floating-point noise", () => {
    expect(normalizeMarketPoint("SPREAD_POINTS", "soccer_usa_mls", -0.24999999999999997))
      .toMatchObject({ raw: -0.24999999999999997, normalized: -0.25, tick: 0.25 });
    expect(normalizeMarketPoint("TOTAL_POINTS", "MLS", 2.7500000000000004))
      .toMatchObject({ normalized: 2.75, tick: 0.25 });
  });

  it.each([
    ["SPREAD_POINTS", "americanfootball_nfl", -3.2],
    ["SPREAD_POINTS", "soccer_usa_mls", -1.2],
    ["TOTAL_POINTS", "baseball_mlb", 8.954545454545455],
    ["TOTAL_POINTS", "NBA", 0],
    ["TOTAL_POINTS", "NHL", 20.5],
    ["SPREAD_POINTS", "NFL", 100.5],
  ] as const)("quarantines non-tradable or implausible %s value", (kind, sport, raw) => {
    expect(normalizeMarketPoint(kind, sport, raw)).toBeNull();
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "quarantines non-finite points %s",
    (raw) => {
      expect(normalizeMarketPoint("TOTAL_POINTS", "NFL", raw)).toBeNull();
    },
  );

  it("normalizes negative zero to pick'em", () => {
    const value = normalizeMarketPoint("SPREAD_POINTS", "NFL", -0);
    expect(value?.normalized).toBe(0);
    expect(Object.is(value?.normalized, -0)).toBe(false);
    expect(formatSignedMarketPoint(value?.normalized ?? Number.NaN)).toBe("PK");
  });
});

describe("executable market consensus", () => {
  it("uses a median reference but selects an observed offer, never an invented mean", () => {
    const consensus = buildMarketPointConsensus(
      "SPREAD_POINTS",
      "NFL",
      [-3.5, -3.5, -3, -3, -2.5],
    );
    expect(consensus).toMatchObject({
      kind: "POINT_CONSENSUS",
      unit: "SPREAD_POINTS",
      reference: -3,
      executable: -3,
      display: "-3",
      rejectedValues: [],
    });
    expect(consensus?.normalizedValues).toContain(consensus?.executable);
  });

  it("does not expose an even-sample midpoint that no bookmaker offers", () => {
    const consensus = buildMarketPointConsensus(
      "SPREAD_POINTS",
      "NFL",
      [-4, -3.5, -3, -2.5],
    );
    expect(consensus?.reference).toBe(-3.25);
    expect(consensus?.executable).toBe(-3.5);
    expect(consensus?.normalizedValues).toContain(consensus?.executable);
  });

  it("retains rejected raw values for audit while excluding them from consensus", () => {
    const consensus = buildMarketPointConsensus(
      "TOTAL_POINTS",
      "MLB",
      [8.5, 8.954545454545455, 9, Number.NaN],
    );
    expect(consensus?.normalizedValues).toEqual([8.5, 9]);
    expect(consensus?.rejectedValues).toHaveLength(2);
    expect(consensus?.executable).toBe(8.5);
  });

  it("returns null when no executable offer survives validation", () => {
    expect(buildMarketPointConsensus("TOTAL_POINTS", "MLB", [8.95, Number.NaN]))
      .toBeNull();
  });
});

describe("central market formatting", () => {
  it("formats a pick line only when its sport and unit agree", () => {
    expect(formatCanonicalPickLine("SPREAD", "NFL", -3.5)).toBe("-3.5");
    expect(formatCanonicalPickLine("SPREAD", "NFL", -3.25)).toBe("N/A");
    expect(formatCanonicalPickLine("SPREAD", "MLS", -0.25)).toBe("-0.25");
    expect(formatCanonicalPickLine("MONEYLINE", "NFL", 105)).toBe("+105");
    expect(formatCanonicalPickLine("UNKNOWN", "NFL", -3.5)).toBe("N/A");
  });
  it("preserves quarter points without float tails", () => {
    expect(formatMarketPoint(2.7500000000000004)).toBe("2.75");
    expect(formatSignedMarketPoint(1.25)).toBe("+1.25");
    expect(formatMarketDelta(-0.2500000000000001)).toBe("-0.25");
  });

  it("fails closed for a non-canonical display value", () => {
    expect(formatMarketPoint(8.954545454545455)).toBe("N/A");
    expect(formatMarketDelta(0.3000000004)).toBe("N/A");
  });

  it("builds movement only from two canonical points", () => {
    expect(buildMarketPointDelta("SPREAD_POINTS", "NFL", -3.5, -3)).toMatchObject({
      kind: "MARKET_POINT_DELTA",
      opening: -3.5,
      current: -3,
      normalized: 0.5,
      display: "+0.5",
    });
    expect(buildMarketPointDelta("SPREAD_POINTS", "NFL", -3.2, -3)).toBeNull();
  });
});

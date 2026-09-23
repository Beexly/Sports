import { describe, expect, it } from "vitest";
import {
  beatCloseRate,
  clvBpsFromPrices,
  extractMarketClvFeatures,
  lineMoveForUs,
  type MarketClvFeatures,
  type MarketClvPrices,
} from "../market-clv-features.js";

const base: MarketClvPrices = {
  decisionPriceDecimal: 1.9,
  closingPriceDecimal: 2.1,
  decisionLine: -3,
  closingLine: -2.5,
  market: "SPREAD",
};

describe("market_clv_features — disabled by default", () => {
  it("returns an empty disabled set when the flag is omitted or false", () => {
    for (const opts of [{}, { enabled: false }]) {
      const f = extractMarketClvFeatures(base, opts);
      expect(f.enabled).toBe(false);
      expect(f.clvBps).toBeNull();
      expect(f.lineMoveForUs).toBeNull();
      expect(f.beatClose).toBeNull();
    }
  });
});

describe("clvBpsFromPrices", () => {
  it("positive when the close is longer than our entry (we beat the close)", () => {
    const bps = clvBpsFromPrices(1.9, 2.1);
    expect(bps).not.toBeNull();
    expect(bps!).toBeGreaterThan(0);
  });

  it("negative when the close shortened (we lost value)", () => {
    const bps = clvBpsFromPrices(2.1, 1.9);
    expect(bps!).toBeLessThan(0);
  });

  it("zero on identical prices", () => {
    expect(clvBpsFromPrices(1.95, 1.95)).toBeCloseTo(0, 2);
  });

  it("refuses missing or invalid odds — silence, never 0", () => {
    expect(clvBpsFromPrices(null, 2)).toBeNull();
    expect(clvBpsFromPrices(2, null)).toBeNull();
    expect(clvBpsFromPrices(1, 2)).toBeNull(); // must be > 1
    expect(clvBpsFromPrices(0.5, 2)).toBeNull();
    expect(clvBpsFromPrices(Number.NaN, 2)).toBeNull();
    expect(clvBpsFromPrices(2, Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("lineMoveForUs", () => {
  it("raw convention: decision − close (positive = market moved past our entry)", () => {
    // We took -3; close is -2.5 → decision − close = -0.5.
    expect(lineMoveForUs(-3, -2.5, "SPREAD")).toBeCloseTo(-0.5, 3);
    // We took -3; close is -3.5 → +0.5.
    expect(lineMoveForUs(-3, -3.5, "SPREAD")).toBeCloseTo(0.5, 3);
    expect(lineMoveForUs(47.5, 48.5, "TOTAL")).toBeCloseTo(-1, 3);
  });

  it("null for moneyline and props, and when either line is missing", () => {
    expect(lineMoveForUs(-3, -2.5, "MONEYLINE")).toBeNull();
    expect(lineMoveForUs(null, -2.5, "SPREAD")).toBeNull();
    expect(lineMoveForUs(-3, null, "SPREAD")).toBeNull();
  });
});

describe("extractMarketClvFeatures — enabled", () => {
  it("derives clvBps, line move and beatClose on a complete pair", () => {
    const f = extractMarketClvFeatures(base, { enabled: true });
    expect(f.enabled).toBe(true);
    expect(f.clvBps).toBeGreaterThan(0);
    expect(f.lineMoveForUs).toBeCloseTo(-0.5, 3);
    expect(f.beatClose).toBe(1);
    expect(f.gaps).toEqual([]);
  });

  it("beatClose is 0 on a lost-to-close pair and null when prices are missing", () => {
    const lost = extractMarketClvFeatures(
      { ...base, decisionPriceDecimal: 2.1, closingPriceDecimal: 1.9 },
      { enabled: true },
    );
    expect(lost.beatClose).toBe(0);

    const missing = extractMarketClvFeatures(
      { ...base, closingPriceDecimal: null },
      { enabled: true },
    );
    expect(missing.clvBps).toBeNull();
    expect(missing.beatClose).toBeNull();
    expect(missing.gaps.length).toBeGreaterThan(0);
  });

  it("moneyline derives clvBps and leaves the line move null", () => {
    const ml = extractMarketClvFeatures(
      {
        decisionPriceDecimal: 1.7,
        closingPriceDecimal: 1.6,
        decisionLine: null,
        closingLine: null,
        market: "MONEYLINE",
      },
      { enabled: true },
    );
    expect(ml.clvBps).not.toBeNull();
    expect(ml.lineMoveForUs).toBeNull();
  });
});

describe("beatCloseRate", () => {
  const feat = (beatClose: 0 | 1 | null): MarketClvFeatures => ({
    enabled: true,
    clvBps: beatClose === 1 ? 100 : beatClose === 0 ? -50 : null,
    lineMoveForUs: null,
    beatClose,
    gaps: [],
  });

  it("computes beat / decided and refuses an empty sample", () => {
    expect(beatCloseRate([])).toEqual({ n: 0, beat: 0, rate: null });
    const r = beatCloseRate([feat(1), feat(1), feat(0), feat(null)]);
    expect(r.n).toBe(3);
    expect(r.beat).toBe(2);
    expect(r.rate).toBeCloseTo(2 / 3, 6);
  });
});

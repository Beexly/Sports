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
  side: "HOME",
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
  it("positive when our entry is longer than the close (we beat the close)", () => {
    // Mirrors ledger computeClvBps(2.1, 1.95) ≈ +366.3.
    const bps = clvBpsFromPrices(2.1, 1.95);
    expect(bps).not.toBeNull();
    expect(bps!).toBeCloseTo(366.3, 1);
    expect(bps!).toBeGreaterThan(0);
  });

  it("negative when the close is longer than our entry (we lost value)", () => {
    const bps = clvBpsFromPrices(1.9, 2.1);
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
  it("SPREAD is side-aware on home-perspective lines", () => {
    // HOME pick: took -3, closed -2.5 → worse number → negative.
    expect(lineMoveForUs(-3, -2.5, "SPREAD", "HOME")).toBeCloseTo(-0.5, 3);
    // HOME pick: took -3, closed -3.5 → better number → positive.
    expect(lineMoveForUs(-3, -3.5, "SPREAD", "HOME")).toBeCloseTo(0.5, 3);
    // AWAY pick: home line moved +3 → +3.5 → away number improved → positive.
    expect(lineMoveForUs(3, 3.5, "SPREAD", "AWAY")).toBeCloseTo(0.5, 3);
    // AWAY pick, opposite move → negative.
    expect(lineMoveForUs(3, 2.5, "SPREAD", "AWAY")).toBeCloseTo(-0.5, 3);
  });

  it("TOTAL needs OVER/UNDER", () => {
    // OVER 47.5 closed 48.5 → captured the better number → +1.
    expect(lineMoveForUs(47.5, 48.5, "TOTAL", "OVER")).toBeCloseTo(1, 3);
    // UNDER 47.5 closed 48.5 → worse number → -1.
    expect(lineMoveForUs(47.5, 48.5, "TOTAL", "UNDER")).toBeCloseTo(-1, 3);
  });

  it("null when the side is missing for SPREAD/TOTAL", () => {
    expect(lineMoveForUs(-3, -2.5, "SPREAD")).toBeNull();
    expect(lineMoveForUs(-3, -2.5, "SPREAD", null)).toBeNull();
    expect(lineMoveForUs(47.5, 48.5, "TOTAL")).toBeNull();
  });

  it("null for moneyline and props, and when either line is missing", () => {
    expect(lineMoveForUs(-3, -2.5, "MONEYLINE", "HOME")).toBeNull();
    expect(lineMoveForUs(null, -2.5, "SPREAD", "HOME")).toBeNull();
    expect(lineMoveForUs(-3, null, "SPREAD", "HOME")).toBeNull();
  });
});

describe("extractMarketClvFeatures — enabled", () => {
  it("derives clvBps, line move and beatClose on a complete pair", () => {
    // Locked 1.9 vs close 2.1 → lost to close; took -3 (HOME) vs close -2.5 → -0.5.
    const f = extractMarketClvFeatures(base, { enabled: true });
    expect(f.enabled).toBe(true);
    expect(f.clvBps).not.toBeNull();
    expect(f.clvBps!).toBeLessThan(0);
    expect(f.lineMoveForUs).toBeCloseTo(-0.5, 3);
    expect(f.beatClose).toBe(0);
    expect(f.gaps).toEqual([]);
  });

  it("beatClose is 1 on a beat-the-close pair", () => {
    const beat = extractMarketClvFeatures(
      { ...base, decisionPriceDecimal: 2.1, closingPriceDecimal: 1.9 },
      { enabled: true },
    );
    expect(beat.clvBps!).toBeGreaterThan(0);
    expect(beat.beatClose).toBe(1);
  });

  it("beatClose is null when prices are missing, with gaps recorded", () => {
    const missing = extractMarketClvFeatures(
      { ...base, closingPriceDecimal: null },
      { enabled: true },
    );
    expect(missing.clvBps).toBeNull();
    expect(missing.beatClose).toBeNull();
    expect(missing.gaps.length).toBeGreaterThan(0);
  });

  it("records a gap when the side is missing for a spread/total", () => {
    const noSide = extractMarketClvFeatures(
      { ...base, side: null },
      { enabled: true },
    );
    expect(noSide.lineMoveForUs).toBeNull();
    expect(noSide.gaps).toContain("missing side for line move");
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
    expect(ml.clvBps!).toBeGreaterThan(0);
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

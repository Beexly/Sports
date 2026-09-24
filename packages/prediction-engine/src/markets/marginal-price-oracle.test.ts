/**
 * Marginal-price oracle — tests (arXiv 2307.08768).
 *
 * ACCEPTANCE GATE: the oracle mid is the median of de-vigged book
 * mids; a book deviating more than the 1% fee band is flagged while
 * tight books pass; the liquidity fit recovers the quotes'
 * bid/ask through the marginal-price curve; the implied fee gamma*
 * grows with the spread; degenerate quotes throw.
 */
import { describe, expect, it } from "vitest";
import {
  fitLiquidity,
  flagMispricings,
  impliedFeeGamma,
  marginalPrice,
  oracleMid,
  tightnessIndex,
  type BookQuote,
} from "./marginal-price-oracle";

const quotes: BookQuote[] = [
  { book: "A", bid: 1.96, ask: 1.91 },
  { book: "B", bid: 1.97, ask: 1.92 },
  { book: "C", bid: 1.95, ask: 1.9 },
  // Book D is off-market (candidate mispricing).
  { book: "D", bid: 2.25, ask: 2.15 },
];

describe("oracleMid + flagMispricings", () => {
  it("builds the consensus and flags deviants", () => {
    const mid = oracleMid(quotes);
    expect(mid).toBeGreaterThan(0.5);
    expect(mid).toBeLessThan(0.55);
    const flags = flagMispricings(quotes);
    const d = flags.find((f) => f.book === "D") as { flagged: boolean; deviation: number };
    expect(d.flagged).toBe(true);
    expect(d.deviation).toBeGreaterThan(0.01);
    for (const b of ["A", "B", "C"]) {
      const f = flags.find((x) => x.book === b) as { flagged: boolean };
      expect(f.flagged).toBe(false);
    }
    expect(() => oracleMid([])).toThrow();
  });
});

describe("fitLiquidity + marginalPrice", () => {
  it("fits the log-utility curve through the quotes", () => {
    const q = quotes[0] as BookQuote;
    const { b, mid } = fitLiquidity(q.bid, q.ask);
    expect(b).toBeGreaterThan(0);
    // The curve passes through the mid at q=0...
    expect(marginalPrice(b, mid, 0)).toBeCloseTo(mid, 10);
    // ...rises toward the ask for positive inventory...
    expect(marginalPrice(b, mid, 0.5)).toBeGreaterThan(mid);
    // ...and the fitted ask matches the quoted ask.
    expect(marginalPrice(b, mid, 0.5)).toBeCloseTo(1 / q.ask, 6);
    expect(() => fitLiquidity(1.9, 1.9)).toThrow();
    expect(() => marginalPrice(0, 0.5, 1)).toThrow();
  });
});

describe("impliedFeeGamma + tightnessIndex", () => {
  it("backs out the effective fee from the spread", () => {
    const tight = impliedFeeGamma({ book: "t", bid: 1.96, ask: 1.95 });
    const wide = impliedFeeGamma({ book: "w", bid: 2.0, ask: 1.8 });
    expect(wide).toBeGreaterThan(tight);
    expect(tight).toBeGreaterThan(0);
    const idx = tightnessIndex(quotes.slice(0, 3));
    expect(idx).toBeGreaterThan(0);
    expect(idx).toBeLessThan(0.05);
    expect(() => impliedFeeGamma({ book: "x", bid: 1.9, ask: 2.0 })).toThrow();
    expect(() => tightnessIndex([])).toThrow();
  });
});

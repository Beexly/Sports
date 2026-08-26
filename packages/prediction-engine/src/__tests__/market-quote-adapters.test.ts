import { describe, it, expect } from "vitest";
import {
  manifoldMarketToQuote,
  manifoldPageToQuotes,
  gammaMarketToQuote,
  gammaPageToQuotes,
} from "../edge-lab/features/market-quote-adapters.js";

// Recorded payload shapes from live probes 2026-08-25.
const MANIFOLD_BINARY = {
  id: "abc123",
  question: "Will X happen?",
  outcomeType: "BINARY",
  probability: 0.42,
  url: "https://manifold.markets/test/will-x-happen",
};
const MANIFOLD_MC = {
  id: "mc1",
  question: "Which team?",
  outcomeType: "MULTIPLE_CHOICE",
  mechanism: "cpmm-multiple",
};
const GAMMA_ROW = {
  id: 559651,
  question: "Will Y happen?",
  slug: "will-y-happen",
  outcomePrices: ["0.006", "0.994"],
  bestBid: 0.005,
  bestAsk: 0.007,
  lastTradePrice: 0.005,
};

describe("manifold adapters", () => {
  it("maps a binary market to a normalized quote", () => {
    const q = manifoldMarketToQuote(MANIFOLD_BINARY);
    expect(q).not.toBeNull();
    expect(q!.source).toBe("manifold");
    expect(q!.yesProb).toBe(0.42);
    expect(q!.bestBid).toBeNull();
  });

  it("skips non-BINARY markets by design", () => {
    expect(manifoldMarketToQuote(MANIFOLD_MC)).toBeNull();
    const page = manifoldPageToQuotes([MANIFOLD_BINARY, MANIFOLD_MC]);
    expect(page).toHaveLength(1);
    expect(page[0]!.marketId).toBe("abc123");
  });

  it("fail closed on malformed rows", () => {
    expect(() => manifoldMarketToQuote(null)).toThrow();
    expect(() => manifoldMarketToQuote({ outcomeType: "BINARY" })).toThrow();
    expect(() => manifoldMarketToQuote({ ...MANIFOLD_BINARY, probability: 1.4 })).toThrow();
    expect(() => manifoldMarketToQuote({ ...MANIFOLD_BINARY, probability: "NaN" })).toThrow();
    expect(() => manifoldPageToQuotes({ not: "an array" })).toThrow();
  });
});

describe("gamma adapters", () => {
  it("parses string outcomePrices and top-of-book", () => {
    const q = gammaMarketToQuote(GAMMA_ROW);
    expect(q.source).toBe("polymarket");
    expect(q.yesProb).toBeCloseTo(0.006, 12);
    expect(q.bestBid).toBe(0.005);
    expect(q.bestAsk).toBe(0.007);
    expect(q.url).toContain("/market/will-y-happen");
  });

  it("tolerates missing book but not malformed prices", () => {
    const noBook = gammaMarketToQuote({
      id: 1,
      question: "q",
      outcomePrices: ["0.5", "0.5"],
    });
    expect(noBook.bestBid).toBeNull();
    expect(noBook.bestAsk).toBeNull();
    expect(() =>
      gammaMarketToQuote({ id: 2, question: "q", outcomePrices: ["1.5", "-0.5"] }),
    ).toThrow();
    expect(() => gammaMarketToQuote({ id: 3, question: "q" })).toThrow();
    expect(() => gammaPageToQuotes("nope")).toThrow();
  });

  it("round-trips a full page", () => {
    const page = gammaPageToQuotes([GAMMA_ROW, { ...GAMMA_ROW, id: 2 }]);
    expect(page).toHaveLength(2);
    expect(page[1]!.marketId).toBe("2");
  });
});

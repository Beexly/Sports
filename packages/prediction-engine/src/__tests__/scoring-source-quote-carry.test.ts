/**
 * Quote quality must reach the persisted glass box.
 *
 * `agreementFactor` in the edge engine turns a second agreeing source into a
 * ×1.0 multiplier where a lone source gets ×0.6 — a 67% uplift. Nothing in that
 * multiplier asks how good the agreeing quote was. A thin, wide-spread exchange
 * mid can therefore promote a pick, and because the spread used to be discarded
 * at ingestion the question "was this uplift sourced from noise?" could not even
 * be answered after the fact.
 *
 * This does not change any score — the multipliers, thresholds and calibration
 * gates are untouched, and these assertions pin that. It makes the inputs
 * auditable: `FactorBreakdown` is persisted to the `factorBreakdown` Json
 * column, so a measurement carried into `independentEdge.sourceQuotes` is
 * recoverable later without any schema change.
 *
 * All assertions are RUNTIME assertions on real values.
 */
import { describe, it, expect } from "vitest";
import { scoreGame } from "../scoring.js";
import { SPEAK_EDGE } from "../edge-engine.js";
import type { OddsInput, ScoredPick, IndependentMarketFairValue } from "@sports/types";

const TEN_BOOKS = [
  "fanduel", "draftkings", "betmgm", "caesars", "pointsbet",
  "betrivers", "wynn", "bet365", "espnbet", "fanatics",
];

function makeInput(independentFairValues?: IndependentMarketFairValue[]): OddsInput {
  return {
    gameId: "game-ml-quote",
    homeTeam: "Chiefs",
    awayTeam: "Eagles",
    commenceTime: new Date("2026-04-15T18:00:00Z"),
    sport: "NFL",
    bookmakerOdds: TEN_BOOKS.map((bookmaker) => ({
      bookmaker,
      market: "H2H" as const,
      homePrice: -350,
      awayPrice: 290,
    })),
    context: { bookmakerCoverageMax: 10, independentFairValues },
  };
}

const ml = (picks: ScoredPick[]) => picks.find((p) => p.pickType === "MONEYLINE")!;

/** A wide, noisy exchange quote — the kind whose agreement should be inspectable. */
const THIN_KALSHI: IndependentMarketFairValue = {
  source: "kalshi",
  homeFairProb: 0.85,
  awayFairProb: 0.15,
  capturedAt: "2026-04-15T17:00:00.000Z",
  quote: {
    homeSpread: 0.09,
    awaySpread: 0.09,
    overround: 1.0,
    homeQuoteSource: "yes_bid_ask",
    awayQuoteSource: "yes_bid_ask",
  },
};

/** The same price from a deep book. */
const DEEP_KALSHI: IndependentMarketFairValue = {
  ...THIN_KALSHI,
  quote: { ...THIN_KALSHI.quote!, homeSpread: 0.01, awaySpread: 0.01 },
};

/** A model estimator — no bid/ask exists, so it reports no quote at all. */
const POISSON: IndependentMarketFairValue = {
  source: "poisson",
  homeFairProb: 0.84,
  awayFairProb: 0.16,
};

describe("independentEdge.sourceQuotes — the agreeing source's quote is on the record", () => {
  it("carries the measured spread of the source that produced a CONFIRMS uplift", () => {
    const pick = ml(scoreGame(makeInput([THIN_KALSHI, POISSON])));
    const ie = pick.factorBreakdown.independentEdge;

    expect(ie).toBeTruthy();
    // The uplift being audited: two sources agree → full credit, not SOLO ×0.6.
    expect(ie!.agreement).toBe("CONFIRMS");

    const quotes = ie!.sourceQuotes;
    expect(Array.isArray(quotes)).toBe(true);
    // Only the quoted market reports a quote; the model estimator has none.
    expect(quotes!.map((q) => q.source)).toEqual(["kalshi"]);

    const kalshi = quotes![0]!;
    expect(typeof kalshi.spread).toBe("number");
    expect(kalshi.spread).toBeCloseTo(0.09, 6);
    expect(kalshi.overround).toBeCloseTo(1.0, 6);
    expect(kalshi.quoteSource).toBe("yes_bid_ask");

    // The point of recording it: this book is wider than the entire bar a pick
    // must clear to be published, which is now checkable from the stored record.
    expect(kalshi.spread!).toBeGreaterThan(SPEAK_EDGE);
  });

  it("resolves the spread to the SIDE actually scored", () => {
    const asymmetric: IndependentMarketFairValue = {
      ...THIN_KALSHI,
      quote: { ...THIN_KALSHI.quote!, homeSpread: 0.09, awaySpread: 0.01 },
    };
    // The home favorite is the chosen side here, so the home leg's spread is the
    // one that belongs on the record — not the away leg's, and not an average.
    const pick = ml(scoreGame(makeInput([asymmetric, POISSON])));
    const kalshi = pick.factorBreakdown.independentEdge!.sourceQuotes![0]!;
    expect(kalshi.spread).toBeCloseTo(0.09, 6);
  });

  it("makes a thin agreeing quote distinguishable from a deep one", () => {
    const thin = ml(scoreGame(makeInput([THIN_KALSHI, POISSON])));
    const deep = ml(scoreGame(makeInput([DEEP_KALSHI, POISSON])));

    const thinIe = thin.factorBreakdown.independentEdge!;
    const deepIe = deep.factorBreakdown.independentEdge!;

    // Identical prices → identical scoring. Nothing here reads the spread.
    expect(thin.confidence).toBe(deep.confidence);
    expect(thin.rankingScore).toBe(deep.rankingScore);
    expect(thinIe.agreement).toBe(deepIe.agreement);
    expect(thinIe.shrunkEdge).toBe(deepIe.shrunkEdge);
    expect(thinIe.conviction).toBe(deepIe.conviction);

    // But the records are no longer identical: the quality is recoverable.
    expect(thinIe.sourceQuotes![0]!.spread!).toBeGreaterThan(
      deepIe.sourceQuotes![0]!.spread!,
    );
  });

  it("omits sourceQuotes entirely when no contributing source is a quoted market", () => {
    // A pure model blend has no bid/ask; an empty array would falsely imply we
    // looked at quotes and found none.
    const pick = ml(scoreGame(makeInput([POISSON, { source: "elo", homeFairProb: 0.85, awayFairProb: 0.15 }])));
    const ie = pick.factorBreakdown.independentEdge!;
    expect(ie.agreement).toBe("CONFIRMS");
    expect(ie.sourceQuotes).toBeUndefined();
  });

  it("survives JSON round-trip, which is how factorBreakdown is persisted", () => {
    const pick = ml(scoreGame(makeInput([THIN_KALSHI, POISSON])));
    const roundTripped = JSON.parse(JSON.stringify(pick.factorBreakdown)) as Record<string, unknown>;
    const ie = roundTripped["independentEdge"] as { sourceQuotes?: Array<{ source: string; spread: number }> };
    expect(ie.sourceQuotes).toBeTruthy();
    expect(ie.sourceQuotes![0]!.source).toBe("kalshi");
    expect(ie.sourceQuotes![0]!.spread).toBeCloseTo(0.09, 6);
  });
});

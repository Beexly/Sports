import { describe, expect, it } from "vitest";
import { scoreGame, americanToImpliedProbability } from "../scoring.js";
import { GRADE_THRESHOLDS } from "../constants.js";
import {
  HONEST_MARKET_EDGE_INDEX_MAX,
  isFeaturedPromotionEligible,
  computePickGrade,
} from "@sports/types";
import type { OddsInput, PickGrade, ScoredPick } from "@sports/types";

/**
 * ============================================================================
 * IS EVERY RUNG OF THE LADDER ACTUALLY REACHABLE?
 * ============================================================================
 *
 * A grade ladder whose top rungs no input can reach is not a ladder, it is
 * decoration — and every gate keyed to those rungs is dead code that reads like
 * live code. This file answers the question against the REAL scorer, with real
 * two-way markets, rather than against hand-fed (confidence, edgeScore) pairs
 * that assume an edgeScore the engine may never emit.
 *
 * The finding it encodes:
 *
 *   Edge Index = clamp(round(50 + 1000 × rawEdge), 0, 100)      (scoring.ts)
 *   rawEdge    = fairProb − offeredProb = −p·(S−1)/S ≤ 0  for overround S ≥ 1
 *
 * so on an honestly priced market the Edge Index cannot exceed
 * HONEST_MARKET_EDGE_INDEX_MAX (50, ±1 for integer price rounding). ELITE_PLAY
 * needs 80 and STRONG_PLAY needs 65. Both are out of reach — which makes the
 * Featured-promotion gate that keys on them unsatisfiable.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHY THE MONEYLINE ARM IS THE HONEST WITNESS
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `scoreMoneylinePick` averages book prices in PROBABILITY space via
 * `averageAmericanPrices`, so `offeredProb` really is the picked side's mean
 * implied probability and the derivation above holds exactly.
 *
 * `scoreSpreadPick` / `scoreTotalPick` on this branch still take an ARITHMETIC
 * mean of American odds. American odds are discontinuous across ±100, so that
 * mean is not a price: it can collapse `offeredProb` far below the true mean,
 * flip `rawEdge` positive, and saturate the Edge Index at 100 out of a market
 * with no edge in it at all. That defect is being fixed on
 * `claude/fix-american-odds-averaging`; it is NOT fixed here, and this file
 * does not pretend otherwise. The spread/total case below therefore asserts the
 * honest-market property only where the arithmetic mean coincides with the
 * probability-space mean (identical prices across books), and the moneyline
 * case carries the general claim.
 */

const BOOKS = [
  "fanduel", "draftkings", "betmgm", "caesars", "pointsbet",
  "betrivers", "espnbet", "fanatics", "bet365", "hardrock",
] as const;

type BookPrices = readonly [sideA: number, sideB: number];
type Market = "SPREADS" | "TOTALS" | "H2H";

function buildMarket(market: Market, quotes: readonly BookPrices[]): OddsInput {
  return {
    gameId: "ladder-reachability",
    homeTeam: "Home Club",
    awayTeam: "Away Club",
    commenceTime: new Date("2026-06-01T18:00:00Z"),
    sport: "NFL",
    bookmakerOdds: quotes.map(([priceA, priceB], i) => {
      const bookmaker = BOOKS[i % BOOKS.length]!;
      if (market === "SPREADS") {
        return {
          bookmaker, market: "SPREADS" as const, spread: -3.5,
          homeSpreadPrice: priceA, awaySpreadPrice: priceB,
        };
      }
      if (market === "TOTALS") {
        return {
          bookmaker, market: "TOTALS" as const, total: 44.5,
          overPrice: priceA, underPrice: priceB,
        };
      }
      return { bookmaker, market: "H2H" as const, homePrice: priceA, awayPrice: priceB };
    }),
  };
}

/** The aggregate overround the engine sees: sum of the two sides' MEAN implied probs. */
function overround(quotes: readonly BookPrices[]): number {
  const a = quotes.reduce((s, [x]) => s + americanToImpliedProbability(x), 0) / quotes.length;
  const b = quotes.reduce((s, [, y]) => s + americanToImpliedProbability(y), 0) / quotes.length;
  return a + b;
}

const AT = new Date("2026-06-01T12:00:00Z");

/** Deterministic 32-bit LCG — a reproducible sweep beats a flaky random one. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A realistic integer American price; never inside the invalid (−100, 100) band. */
function priceFrom(r: number): number {
  const mag = 100 + Math.floor(r * 400);
  return r < 0.5 ? -mag : mag;
}

/** Sweep the moneyline arm over consistent markets; report what it can produce. */
function sweepMoneyline(trials: number): {
  grades: Set<PickGrade>;
  maxEdgeIndex: number;
  featuredEligible: ScoredPick[];
} {
  const rnd = lcg(0x5eed1234);
  const grades = new Set<PickGrade>();
  let maxEdgeIndex = Number.NEGATIVE_INFINITY;
  const featuredEligible: ScoredPick[] = [];

  for (let t = 0; t < trials; t++) {
    const n = 2 + Math.floor(rnd() * 9);
    const quotes: BookPrices[] = [];
    for (let i = 0; i < n; i++) quotes.push([priceFrom(rnd()), priceFrom(rnd())]);
    if (overround(quotes) < 1) continue; // inconsistent market — out of scope of the claim

    for (const pick of scoreGame(buildMarket("H2H", quotes), AT)) {
      if (pick.pickType !== "MONEYLINE") continue;
      grades.add(pick.pickGrade);
      maxEdgeIndex = Math.max(maxEdgeIndex, pick.edgeScore);
      if (isFeaturedPromotionEligible(pick)) featuredEligible.push(pick);
    }
  }
  return { grades, maxEdgeIndex, featuredEligible };
}

describe("grade ladder reachability (real scorer, honest markets)", () => {
  const swept = sweepMoneyline(20000);

  it("the correctly-priced arm cannot exceed the honest-market Edge Index ceiling", () => {
    expect(swept.maxEdgeIndex).toBeGreaterThan(0); // the sweep actually produced picks
    expect(swept.maxEdgeIndex).toBeLessThanOrEqual(HONEST_MARKET_EDGE_INDEX_MAX + 1);
  });

  it("ELITE_PLAY and STRONG_PLAY are unreachable on a correctly-priced market", () => {
    expect(swept.grades.has("ELITE_PLAY")).toBe(false);
    expect(swept.grades.has("STRONG_PLAY")).toBe(false);
  });

  it("the bottom rungs ARE reachable — the ladder is not empty", () => {
    // LEAN from the sweep; SOLID_PLAY needs the confidence side too, so pin it
    // at the exact ladder boundary rather than hoping a random sweep lands there.
    expect(swept.grades.has("LEAN")).toBe(true);
    expect(
      computePickGrade(GRADE_THRESHOLDS.SOLID_PLAY.confidence, GRADE_THRESHOLDS.SOLID_PLAY.edge),
    ).toBe("SOLID_PLAY");
    // …and SOLID_PLAY's edge threshold is the one top-of-ladder number that is
    // still attainable, because it sits exactly ON the ceiling rather than above it.
    expect(GRADE_THRESHOLDS.SOLID_PLAY.edge).toBeLessThanOrEqual(HONEST_MARKET_EDGE_INDEX_MAX);
  });

  /**
   * The dead gate, asserted. `process-sport.ts` promotes a pick to Featured on
   * `isFeaturedPromotionEligible`; nothing the scorer can emit from an honestly
   * priced market satisfies it. If this test ever fails, either the ladder was
   * re-based or the Edge Index was rescaled — both are owner decisions and both
   * change what a "Featured" pick means to a customer.
   */
  it("no honestly-priced pick is Featured-eligible — the gate is inert, and that is asserted", () => {
    expect(swept.featuredEligible).toEqual([]);
  });

  it("a pick carrying an above-ceiling Edge Index is never featured, whatever its grade", () => {
    // Mis-averaged spread/total pricing can currently mint an Edge Index of 100
    // out of a market with no edge (see the header note). That pick grades
    // ELITE_PLAY. It must still not be featured.
    const fabricated = {
      pickGrade: "ELITE_PLAY" as PickGrade,
      confidence: 95,
      edgeScore: 100,
    };
    expect(computePickGrade(fabricated.confidence, fabricated.edgeScore)).toBe("ELITE_PLAY");
    expect(isFeaturedPromotionEligible(fabricated)).toBe(false);
  });

  /**
   * The same claim against a REAL market rather than a hand-built object.
   *
   * Ten books on an ordinary near-pick'em spread, each posting a juiced price
   * within a point or two of even money, every book internally consistent — the
   * most boring market in sports betting, with no edge in it whatsoever.
   * Because the chosen side's prices straddle ±100, the arithmetic mean of the
   * American odds collapses toward zero, `offeredProb` collapses with it, and
   * the engine reports an Edge Index of 100 and an ELITE_PLAY grade. Featuring
   * that pick would put the product's loudest claim on its worst arithmetic.
   */
  it("an ordinary pick'em spread with normal hold is never Featured-eligible", () => {
    const straddling: BookPrices[] = [
      [-105, -105], [100, 100], [-102, -102], [101, 101], [-108, -108],
      [103, 103], [-104, -104], [102, 102], [-106, -106], [100, 100],
    ];
    expect(overround(straddling)).toBeGreaterThan(1); // an honest, vigged market

    const picks = scoreGame(buildMarket("SPREADS", straddling), AT);
    expect(picks.length).toBeGreaterThan(0);
    for (const pick of picks) {
      expect(isFeaturedPromotionEligible(pick)).toBe(false);
    }
  });
});

describe("the Edge Index ceiling holds where price averaging is unambiguous", () => {
  /**
   * Every book posting the SAME pair of prices: the arithmetic mean of American
   * odds and the probability-space mean coincide, so this case is free of the
   * averaging defect on all three market arms and the derivation applies
   * verbatim.
   */
  const uniform: ReadonlyArray<{ market: Market; quote: BookPrices }> = [
    { market: "SPREADS", quote: [-110, -110] },
    { market: "SPREADS", quote: [-135, 115] },
    { market: "TOTALS", quote: [-110, -110] },
    { market: "TOTALS", quote: [-105, -115] },
    { market: "H2H", quote: [-250, 200] },
    { market: "H2H", quote: [-140, 120] },
  ];

  for (const { market, quote } of uniform) {
    it(`${market} ${quote[0]}/${quote[1]} stays at or below the ceiling`, () => {
      const quotes: BookPrices[] = Array.from({ length: 8 }, () => quote);
      expect(overround(quotes)).toBeGreaterThanOrEqual(1);
      const picks = scoreGame(buildMarket(market, quotes), AT);
      for (const pick of picks) {
        expect(pick.edgeScore).toBeLessThanOrEqual(HONEST_MARKET_EDGE_INDEX_MAX + 1);
        expect(pick.pickGrade).not.toBe("ELITE_PLAY");
        expect(pick.pickGrade).not.toBe("STRONG_PLAY");
        expect(isFeaturedPromotionEligible(pick)).toBe(false);
      }
    });
  }
});

describe("prediction-engine re-exports the ONE ladder, it does not redeclare it", () => {
  it("constants.GRADE_THRESHOLDS is the same object identity as the types one", async () => {
    const types = await import("@sports/types");
    expect(GRADE_THRESHOLDS).toBe(types.GRADE_THRESHOLDS);
  });
});

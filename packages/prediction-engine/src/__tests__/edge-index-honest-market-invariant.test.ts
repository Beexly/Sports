import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  scoreGame,
  toEdgeIndex,
  americanToImpliedProbability,
  impliedProbabilityToAmerican,
} from "../scoring.js";
import { WEIGHTS } from "../constants.js";
import type { OddsInput, PickType, ScoredPick } from "@sports/types";

/**
 * ============================================================================
 * THE INVARIANT
 * ============================================================================
 *
 * For any internally consistent two-way market (aggregate overround >= 1),
 * `rawEdge <= 0`, and therefore the published Edge Index is strictly below 50.
 *
 * Derivation, every step traceable to source in `../scoring.ts`:
 *
 *   1. edgeScore    = clamp(round((edgeComponentScore / EDGE_COMPONENT_MAX)
 *                      * 100), 0, 100)                        (~:538/747/942)
 *   2. EDGE_COMPONENT_MAX = 25                              (constants.ts:56)
 *   3. edgeComponentScore = clamp((rawEdge + 0.05) / 0.10, 0, 1) * 25   (~:313)
 *
 *   (1)+(2)+(3)  =>  EdgeIndex = clamp(round(50 + 1000 * rawEdge), 0, 100)
 *
 *   4. rawEdge    = pickedSideFairProb - offeredProb                    (~:300)
 *   5. pickedSideFairProb comes from `removeVig` (~:70), which is the
 *      PROPORTIONAL de-vig  p_side / (p_home + p_away)  applied to the mean
 *      implied probabilities of the very same books.
 *   6. offeredProb = americanToImpliedProbability(avg offered price) — the
 *      WITH-vig implied probability of that same side.
 *
 *   Write S for the aggregate overround (p_home + p_away) and p for the
 *   picked side's mean implied probability. When the offered price is
 *   averaged in probability space, offeredProb = p exactly, so
 *
 *       rawEdge = p/S - p = -p * (S - 1) / S
 *
 *   which is <= 0 for every S >= 1, with equality only at S = 1 (a zero-hold
 *   market that does not exist in practice). De-vigging can only LOWER an
 *   implied probability, so an honest market can never hand the engine a
 *   positive pricing edge against its own price.
 *
 *   => EdgeIndex < 50 on every consistent market. 50 is an unreachable
 *      ceiling, not a midpoint.
 *
 * ============================================================================
 * WHY PER-BOOK HETEROGENEOUS PRICES ARE THE WHOLE POINT
 * ============================================================================
 *
 * The pre-existing regression test in `scoring.test.ts` (~:141) builds its
 * fixture with `makeTwoWayTotalInput`, which hands EVERY book the SAME pair of
 * prices. Under that shape the arithmetic mean of American prices and the
 * probability-space mean coincide, so step 6 holds by accident and the test
 * cannot observe cross-book dispersion at all. Every fixture below therefore
 * gives each book its OWN prices.
 *
 * ============================================================================
 * EXPECTED FAILURE ON MAIN — SPREAD AND TOTAL
 * ============================================================================
 *
 * `scoreSpreadPick` (~:411-414) and `scoreTotalPick` (~:670-673) average
 * American odds ARITHMETICALLY:
 *
 *     chosenPrices.reduce((a, b) => a + b, 0) / chosenPrices.length
 *
 * American odds are discontinuous across +/-100, so that mean is not a price.
 * Averaging -125 and +105 yields -10, whose implied probability is 0.909 --
 * nothing like the 0.53 the two real prices average to. The result is that
 * `offeredProb` collapses far below `p`, step 6 breaks, and `rawEdge` turns
 * strongly POSITIVE: a fabricated edge that saturates the Edge Index at 100.
 * `scoreMoneylinePick` (~:846) already does this correctly via
 * `averageAmericanPrices`, which is why the MONEYLINE arm below passes.
 *
 * That averaging defect is NOT fixed here. It is being fixed on branch
 * `claude/fix-american-odds-averaging`. Until that branch lands, the SPREAD
 * and TOTAL cases in this file FAIL, and that failure is the point: it is
 * independent confirmation of the bug from the invariant side. These cases are
 * deliberately NOT skipped and the assertion is deliberately NOT weakened --
 * a guard that is quiet while the defect ships is worth nothing.
 */

const BOOKS = [
  "fanduel", "draftkings", "betmgm", "caesars", "pointsbet",
  "betrivers", "espnbet", "fanatics", "bet365", "hardrock",
] as const;

/** One book's two-way quote as the pair of integer American prices it posts. */
type BookPrices = readonly [sideA: number, sideB: number];

type Market = "SPREADS" | "TOTALS" | "H2H";

/** Build a market from explicit per-book American prices. */
function buildMarket(market: Market, quotes: readonly BookPrices[]): OddsInput {
  return {
    gameId: "edge-invariant",
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

/**
 * The aggregate overround the engine actually sees: the sum of the two sides'
 * MEAN implied probabilities. This mirrors `twoSidedImpliedSum` in every
 * scoring path, and is computed from the same integer prices the market ships.
 */
function realisedOverround(quotes: readonly BookPrices[]): number {
  const meanA = quotes.reduce((s, [a]) => s + americanToImpliedProbability(a), 0) / quotes.length;
  const meanB = quotes.reduce((s, [, b]) => s + americanToImpliedProbability(b), 0) / quotes.length;
  return meanA + meanB;
}

/** Every book individually consistent: its own two implied probabilities sum >= 1. */
function everyBookConsistent(quotes: readonly BookPrices[]): boolean {
  return quotes.every(
    ([a, b]) => americanToImpliedProbability(a) + americanToImpliedProbability(b) >= 1,
  );
}

/** The Edge Index ceiling implied by the derivation above. */
const HONEST_MARKET_EDGE_CEILING = 50;

/**
 * Assert the invariant on one scored pick, with a message that reports the
 * numbers a reviewer needs rather than a bare boolean.
 */
function expectHonestMarketEdge(pick: ScoredPick, overround: number, label: string): void {
  const published = toEdgeIndex(pick.edgeScore);
  // Inverse of the derivation: EdgeIndex = 50 + 1000 * rawEdge.
  const impliedRawEdge = (pick.edgeScore - HONEST_MARKET_EDGE_CEILING) / 1000;
  expect(
    pick.edgeScore,
    `${label}: overround S=${overround.toFixed(4)} (>= 1, an honest market), so ` +
      `rawEdge must be <= 0 and the Edge Index must be < ${HONEST_MARKET_EDGE_CEILING}. ` +
      `Got edgeScore=${pick.edgeScore} (published Edge Index ${published}), which back-solves ` +
      `to rawEdge=${impliedRawEdge >= 0 ? "+" : ""}${(impliedRawEdge * 100).toFixed(2)} ` +
      `percentage points. A positive rawEdge on a vigged market is fabricated value.`,
  ).toBeLessThan(HONEST_MARKET_EDGE_CEILING);
}

// ============================================================
// The derivation itself, pinned against the constants
// ============================================================

describe("Edge Index derivation constants", () => {
  it("EDGE_COMPONENT_MAX is 25, so the index is 50 + 1000 * rawEdge", () => {
    expect(WEIGHTS.EDGE_COMPONENT_MAX).toBe(25);
    // Reconstruct the composition of steps (1) and (3) for a few rawEdge values
    // and check it against the closed form the invariant relies on.
    for (const rawEdge of [-0.05, -0.03, -0.024, -0.01, 0, 0.01, 0.05]) {
      const componentScore =
        Math.max(0, Math.min(1, (rawEdge + 0.05) / 0.1)) * WEIGHTS.EDGE_COMPONENT_MAX;
      const edgeScore = Math.max(
        0,
        Math.min(100, Math.round((componentScore / WEIGHTS.EDGE_COMPONENT_MAX) * 100)),
      );
      expect(edgeScore).toBe(Math.max(0, Math.min(100, Math.round(50 + 1000 * rawEdge))));
    }
  });

  it("toEdgeIndex is identity-with-clamp — nothing calibrates it", () => {
    // Pinned because the public copy must never describe this mapping as
    // fitted to results. See apps/web/__tests__/edge-index-copy-truth.test.ts.
    for (const v of [0, 13, 26, 42, 49, 50, 71, 100]) {
      expect(toEdgeIndex(v)).toBe(v);
    }
  });
});

// ============================================================
// Named deterministic fixtures — heterogeneous, hand-checked
// ============================================================

/**
 * A tight spread market where the books disagree about which way the juice
 * runs, so the HOME side's prices STRADDLE +/-100. Every book is internally
 * consistent. This is the shape arithmetic American averaging cannot survive.
 */
const SPREAD_STRADDLING: readonly BookPrices[] = [
  [-113, -102],
  [+108, -124],
  [-110, -105],
  [+104, -120],
  [-106, -108],
  [+101, -127],
];

/** Same market, no straddle: every home price sits on the same side of 100. */
const SPREAD_ONE_SIDED: readonly BookPrices[] = [
  [-120, -104],
  [-116, -108],
  [-123, -101],
  [-118, -106],
  [-121, -103],
  [-117, -107],
];

/**
 * A tight total where OVER is favoured at a majority of books (so the engine
 * picks it) while the OVER prices themselves straddle +/-100 across the book
 * set. Real feeds look exactly like this on a 44.5 with two-way juice.
 */
const TOTAL_STRADDLING: readonly BookPrices[] = [
  [-112, -111],
  [-112, -103],
  [+103, -131],
  [-125, +110],
  [-121, +101],
  [-101, -124],
];

/** Same total, every OVER price on the same side of 100. */
const TOTAL_ONE_SIDED: readonly BookPrices[] = [
  [-118, -102],
  [-114, -106],
  [-122, -101],
  [-116, -104],
  [-119, -103],
  [-115, -105],
];

/** Heavy home favourite, heterogeneous across books (moneyline needs fair >= 0.58). */
const H2H_FAVOURITE: readonly BookPrices[] = [
  [-545, +440],
  [-625, +490],
  [-517, +410],
  [-675, +510],
  [-562, +430],
  [-604, +465],
  [-499, +398],
  [-646, +496],
  [-529, +421],
  [-590, +455],
];

type Arm = {
  readonly market: Market;
  readonly pickType: PickType;
  /** Documents the dependency on the sibling branch, per arm. */
  readonly blockedBy: string | null;
};

const ARMS: readonly Arm[] = [
  {
    market: "H2H",
    pickType: "MONEYLINE",
    // Control arm: scoreMoneylinePick already averages in probability space via
    // averageAmericanPrices, so this arm passes on main today.
    blockedBy: null,
  },
  {
    market: "SPREADS",
    pickType: "SPREAD",
    blockedBy: "claude/fix-american-odds-averaging (scoring.ts ~:411-414)",
  },
  {
    market: "TOTALS",
    pickType: "TOTAL",
    blockedBy: "claude/fix-american-odds-averaging (scoring.ts ~:670-673)",
  },
];

function quotesFor(market: Market): readonly (readonly BookPrices[])[] {
  // Moneyline needs a de-vigged fair probability >= 0.58 to publish at all
  // (scoring.ts ~:836), so it gets the favourite shape.
  if (market === "H2H") return [H2H_FAVOURITE];
  if (market === "SPREADS") return [SPREAD_STRADDLING, SPREAD_ONE_SIDED];
  return [TOTAL_STRADDLING, TOTAL_ONE_SIDED];
}

describe.each(ARMS)(
  "Edge Index invariant — $pickType on a consistent heterogeneous market",
  ({ market, pickType, blockedBy }) => {
    // `blockedBy` records which probability-space-averaging fix this arm depends
    // on. That fix is now PRESENT on this branch (ported from
    // claude/fix-american-odds-averaging), so these arms pass here. The note is
    // kept because it is the load-bearing coupling: if the arithmetic-mean
    // averaging is ever reintroduced at that call site, this arm is the test
    // that fails, and the reader should know where to look.
    const dependency = blockedBy ? ` [depends on probability-space averaging: ${blockedBy}]` : "";

    it("its fixtures are heterogeneous and every book is internally consistent", () => {
      for (const [i, quotes] of quotesFor(market).entries()) {
        // Heterogeneity is the property the pre-existing `makeTwoWayTotalInput`
        // helper lacks. Pin it, or this file could silently decay into the same
        // blind spot it was written to close.
        const distinct = new Set(quotes.map((q) => q.join("/")));
        expect(distinct.size, `${pickType} fixture #${i} repeats a book's prices`)
          .toBe(quotes.length);
        expect(everyBookConsistent(quotes), `${pickType} fixture #${i} has a sub-vig book`)
          .toBe(true);
        expect(realisedOverround(quotes)).toBeGreaterThanOrEqual(1);
      }
    });

    it(`named fixtures never reach Edge Index ${HONEST_MARKET_EDGE_CEILING}${dependency}`, () => {
      let asserted = 0;
      for (const [i, quotes] of quotesFor(market).entries()) {
        const overround = realisedOverround(quotes);
        const pick = scoreGame(buildMarket(market, quotes), new Date("2026-06-01T12:00:00Z"))
          .find((p) => p.pickType === pickType);
        if (!pick) continue;
        asserted++;
        expectHonestMarketEdge(pick, overround, `${pickType} named fixture #${i}`);
      }
      // Non-vacuity: a fixture set that stopped publishing would otherwise turn
      // this into a test that asserts nothing.
      expect(asserted, `${pickType}: no named fixture published a pick`).toBeGreaterThan(0);
    });

    it(`holds over randomised per-book prices${dependency}`, () => {
      // Every book is built as: side A carries `a`, side B carries
      // (1 + hold - a). Each book's own overround is therefore exactly
      // 1 + hold >= 1 by construction, and the books still disagree with one
      // another because `a` and `hold` are drawn per book.
      const aRange: [number, number] = market === "H2H" ? [0.78, 0.92] : [0.47, 0.56];
      const bookCount = market === "H2H" ? 10 : 6;

      let published = 0;
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              a: fc.double({ min: aRange[0], max: aRange[1], noNaN: true }),
              hold: fc.double({ min: 0.01, max: 0.06, noNaN: true }),
            }),
            { minLength: bookCount, maxLength: bookCount },
          ),
          (rows) => {
            const quotes: BookPrices[] = rows.map((r) => [
              impliedProbabilityToAmerican(r.a),
              impliedProbabilityToAmerican(1 + r.hold - r.a),
            ]);
            const overround = realisedOverround(quotes);
            // The invariant is stated for consistent markets only. Integer-price
            // rounding can push a razor-thin book under 1.0; those inputs are
            // outside the claim, not counter-examples to it.
            fc.pre(overround >= 1);
            const pick = scoreGame(
              buildMarket(market, quotes),
              new Date("2026-06-01T12:00:00Z"),
            ).find((p) => p.pickType === pickType);
            // Gates below MIN_PUBLISH_CONFIDENCE / consensus simply mean there
            // is no published Edge Index to check.
            if (!pick) return;
            published++;
            expectHonestMarketEdge(pick, overround, `${pickType} randomised market`);
          },
        ),
        { numRuns: 300, seed: 20260825 },
      );

      expect(
        published,
        `${pickType}: the generator produced no publishable picks, so the ` +
          `property asserted nothing. Widen the fixture ranges.`,
      ).toBeGreaterThan(20);
    });
  },
);

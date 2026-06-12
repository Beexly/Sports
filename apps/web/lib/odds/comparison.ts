/**
 * Odds comparison — the Line Room's math.
 *
 * Pure functions over stored per-bookmaker Odds rows (American prices,
 * sanitized at ingestion). Best price per side, latest line per book,
 * median consensus, and no-vig implied probabilities. Facts only — no
 * projections, no fabricated numbers; every value traces to a stored
 * bookmaker row.
 */

export type BoardMarket = "H2H" | "SPREADS" | "TOTALS";

export interface BookLine {
  readonly bookmaker: string;
  readonly market: BoardMarket;
  readonly homePrice: number | null;
  readonly awayPrice: number | null;
  readonly spread: number | null; // home spread
  readonly homeSpreadPrice: number | null;
  readonly awaySpreadPrice: number | null;
  readonly total: number | null;
  readonly overPrice: number | null;
  readonly underPrice: number | null;
  readonly fetchedAt: string;
}

export interface BestPrice {
  readonly bookmaker: string;
  readonly price: number;
  /** The line the price is attached to (spread or total); null for moneyline. */
  readonly line: number | null;
}

export interface MarketBoard {
  readonly market: BoardMarket;
  readonly lines: readonly BookLine[];
  /** Best price for each side across books (American: higher is always better). */
  readonly bestHome: BestPrice | null; // H2H home / spread home / total OVER
  readonly bestAway: BestPrice | null; // H2H away / spread away / total UNDER
  /** Median line across books (spread/total markets). */
  readonly consensusLine: number | null;
  /** No-vig implied win probability for the home side (H2H only). */
  readonly noVigHomeProb: number | null;
  readonly bookCount: number;
}

/** Latest row per bookmaker for one market (rows may span ingestion runs). */
export function latestPerBook(rows: readonly BookLine[]): readonly BookLine[] {
  const byBook = new Map<string, BookLine>();
  for (const row of rows) {
    const prev = byBook.get(row.bookmaker);
    if (!prev || row.fetchedAt > prev.fetchedAt) byBook.set(row.bookmaker, row);
  }
  return [...byBook.values()].sort((a, b) => a.bookmaker.localeCompare(b.bookmaker));
}

/** American odds → implied probability (includes vig). */
export function impliedProbability(american: number): number {
  return american > 0 ? 100 / (american + 100) : -american / (-american + 100);
}

/** Remove the vig from a two-way market. Returns home-side fair probability. */
export function noVigProbability(homeAmerican: number, awayAmerican: number): number {
  const h = impliedProbability(homeAmerican);
  const a = impliedProbability(awayAmerican);
  return h / (h + a);
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((x, y) => x - y);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function best(
  lines: readonly BookLine[],
  price: (l: BookLine) => number | null,
  line: (l: BookLine) => number | null
): BestPrice | null {
  let top: BestPrice | null = null;
  for (const l of lines) {
    const p = price(l);
    if (p === null) continue;
    // American odds: numerically higher is always the better payout for the bettor.
    if (!top || p > top.price) top = { bookmaker: l.bookmaker, price: p, line: line(l) };
  }
  return top;
}

/** Build the comparison board for one game+market from raw stored rows. */
export function buildMarketBoard(
  market: BoardMarket,
  rows: readonly BookLine[]
): MarketBoard {
  const lines = latestPerBook(rows.filter((r) => r.market === market));

  let bestHome: BestPrice | null = null;
  let bestAway: BestPrice | null = null;
  let consensusLine: number | null = null;
  let noVigHomeProb: number | null = null;

  if (market === "H2H") {
    bestHome = best(lines, (l) => l.homePrice, () => null);
    bestAway = best(lines, (l) => l.awayPrice, () => null);
    const fair = lines
      .filter((l) => l.homePrice !== null && l.awayPrice !== null)
      .map((l) => noVigProbability(l.homePrice!, l.awayPrice!));
    noVigHomeProb = median(fair);
  } else if (market === "SPREADS") {
    bestHome = best(lines, (l) => l.homeSpreadPrice, (l) => l.spread);
    bestAway = best(lines, (l) => l.awaySpreadPrice, (l) => (l.spread === null ? null : -l.spread));
    consensusLine = median(lines.map((l) => l.spread).filter((s): s is number => s !== null));
  } else {
    bestHome = best(lines, (l) => l.overPrice, (l) => l.total);
    bestAway = best(lines, (l) => l.underPrice, (l) => l.total);
    consensusLine = median(lines.map((l) => l.total).filter((t): t is number => t !== null));
  }

  return { market, lines, bestHome, bestAway, consensusLine, noVigHomeProb, bookCount: lines.length };
}

/** Format American odds the way books print them. */
export function formatAmerican(price: number): string {
  return price > 0 ? `+${price}` : `${price}`;
}

// ─── +EV finder ───────────────────────────────────────────────────────────────

export interface EdgeFlag {
  /** "HOME" = home ML / home spread / OVER side; "AWAY" = the other side. */
  readonly side: "HOME" | "AWAY";
  readonly bookmaker: string;
  readonly price: number;
  readonly line: number | null;
  /** Fair (no-vig consensus) probability of this side winning the bet. */
  readonly fairProb: number;
  /** Expected value per 1 unit staked at this price vs the fair probability. */
  readonly evPerUnit: number;
}

/** Decimal payout multiplier (profit per unit) for an American price. */
function profitPerUnit(american: number): number {
  return american > 0 ? american / 100 : 100 / -american;
}

export interface ArbOpportunity {
  readonly homeBook: string;
  readonly homePrice: number;
  readonly awayBook: string;
  readonly awayPrice: number;
  /** Guaranteed profit per 1 unit of total stake, both sides covered. */
  readonly profitPct: number;
}

/**
 * Two-way arbitrage: when the best home price and best away price (at
 * DIFFERENT books) imply probabilities summing under 1, both sides can
 * be covered for a guaranteed margin. Spread/total arbs are only real
 * when both books post the SAME line, so non-H2H markets require the
 * best lines to match exactly.
 */
export function findArbitrage(board: MarketBoard): ArbOpportunity | null {
  const { bestHome, bestAway } = board;
  if (!bestHome || !bestAway) return null;
  if (bestHome.bookmaker === bestAway.bookmaker) return null;
  if (board.market !== "H2H") {
    // -3.5 vs +3.5 is the same line flipped; totals carry the same number.
    const a = bestHome.line;
    const b = bestAway.line;
    if (a === null || b === null) return null;
    const matched = board.market === "SPREADS" ? a === -b : a === b;
    if (!matched) return null;
  }
  const sum = impliedProbability(bestHome.price) + impliedProbability(bestAway.price);
  if (sum >= 1) return null;
  return {
    homeBook: bestHome.bookmaker,
    homePrice: bestHome.price,
    awayBook: bestAway.bookmaker,
    awayPrice: bestAway.price,
    profitPct: Math.round((1 / sum - 1) * 10000) / 10000,
  };
}

/**
 * Flag positive-EV prices in a two-sided market: a book is an edge when
 * its price beats the no-vig consensus of ALL books by at least
 * `minEvPct` (default 1%). Requires ≥3 books — with fewer, "consensus"
 * is too thin to call anything an edge, so nothing is flagged.
 */
export function findEdges(
  board: MarketBoard,
  minEvPct = 0.01,
  minBooks = 3
): readonly EdgeFlag[] {
  if (board.bookCount < minBooks) return [];

  const sides: ReadonlyArray<{
    side: "HOME" | "AWAY";
    price: (l: BookLine) => number | null;
    other: (l: BookLine) => number | null;
    line: (l: BookLine) => number | null;
  }> =
    board.market === "H2H"
      ? [
          { side: "HOME", price: (l) => l.homePrice, other: (l) => l.awayPrice, line: () => null },
          { side: "AWAY", price: (l) => l.awayPrice, other: (l) => l.homePrice, line: () => null },
        ]
      : board.market === "SPREADS"
        ? [
            { side: "HOME", price: (l) => l.homeSpreadPrice, other: (l) => l.awaySpreadPrice, line: (l) => l.spread },
            { side: "AWAY", price: (l) => l.awaySpreadPrice, other: (l) => l.homeSpreadPrice, line: (l) => (l.spread === null ? null : -l.spread) },
          ]
        : [
            { side: "HOME", price: (l) => l.overPrice, other: (l) => l.underPrice, line: (l) => l.total },
            { side: "AWAY", price: (l) => l.underPrice, other: (l) => l.overPrice, line: (l) => l.total },
          ];

  const edges: EdgeFlag[] = [];
  for (const s of sides) {
    // Fair prob for this side = median no-vig prob across two-sided books.
    const fairProbs = board.lines
      .filter((l) => s.price(l) !== null && s.other(l) !== null)
      .map((l) => noVigProbability(s.price(l)!, s.other(l)!));
    if (fairProbs.length < minBooks) continue;
    const sorted = [...fairProbs].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const fairProb =
      sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;

    for (const l of board.lines) {
      const p = s.price(l);
      if (p === null) continue;
      const ev = fairProb * profitPerUnit(p) - (1 - fairProb);
      if (ev >= minEvPct) {
        edges.push({
          side: s.side,
          bookmaker: l.bookmaker,
          price: p,
          line: s.line(l),
          fairProb,
          evPerUnit: Math.round(ev * 10000) / 10000,
        });
      }
    }
  }
  return edges.sort((a, b) => b.evPerUnit - a.evPerUnit);
}

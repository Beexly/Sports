import {
  consensusNoVig,
  marketGravityIndex,
  type ConsensusMarketRead,
  type MarketGravity,
} from "@sports/prediction-engine";
import { normalizeAmericanOdds } from "@sports/types";

/**
 * Game-level market read — turns captured per-book H2H odds rows into the
 * market's own no-vig consensus (Shin de-vig per book, median across books).
 *
 * This is MARKET DESCRIPTION, not a model claim: "what the books charge,
 * with their margin removed." Model fair-value/EV stays hard-gated elsewhere
 * (audit-drawer-shape contract); this module never touches model outputs.
 * Pure, no I/O.
 */

/**
 * Minimum |homeDriftPp| that indicates the market is actively moving within
 * the capture window. Used by both market-fair-board.tsx (text-plasma styling)
 * and the Galaxy Twin (node "moving" state). Single source of truth.
 */
export const DRIFT_MOVING_PP = 1.5;

export interface OddsRowForRead {
  readonly bookmaker: string;
  readonly market: string;
  readonly fetchedAt: Date;
  readonly homePrice: number | null;
  readonly awayPrice: number | null;
  readonly drawPrice: number | null;
}

type CanonicalOddsRowForRead = Omit<
  OddsRowForRead,
  "homePrice" | "awayPrice" | "drawPrice"
> & {
  readonly homePrice: number;
  readonly awayPrice: number;
  readonly drawPrice: number | null;
};

export interface GameMarketRead {
  readonly consensus: ConsensusMarketRead;
  /** ISO timestamp of the freshest odds row used. */
  readonly freshestFetchedAt: string;
  /**
   * Fair P(home) drift in percentage points since each book's EARLIEST
   * captured quote (no-vig then vs no-vig now). Positive = the market has
   * moved toward the home side. Null when no earlier capture exists.
   * This is the Line Death Clock's heartbeat: which way the fair price is
   * bleeding, from real captured history only.
   */
  readonly homeDriftPp: number | null;
  /**
   * Line Death Clock: the drift's RATE in fair-prob points per hour across the
   * capture window. |rate| is how fast the price is moving — a fast-bleeding
   * edge has little time left. Null when no earlier capture or no time span.
   */
  readonly homeDriftPerHourPp: number | null;
  /** Market Gravity Index — how strongly the market pulls toward one side. */
  readonly gravity: MarketGravity;
}

/**
 * Build the no-vig consensus from a game's odds rows. Uses each bookmaker's
 * LATEST H2H row only (stale rows from the same book never vote twice).
 * Returns null when fewer than `minBooks` books have a two-sided quote —
 * a one-book "consensus" would be a costume, not a consensus.
 */
export function buildH2hMarketRead(
  rows: readonly OddsRowForRead[],
  minBooks = 2,
): GameMarketRead | null {
  const latestByBook = new Map<string, CanonicalOddsRowForRead>();
  for (const row of rows) {
    if (row.market !== "H2H") continue;
    const canonical = canonicalRow(row);
    if (!canonical) continue;
    const existing = latestByBook.get(row.bookmaker);
    if (!existing || row.fetchedAt > existing.fetchedAt) {
      latestByBook.set(row.bookmaker, canonical);
    }
  }

  const books = [...latestByBook.values()];
  if (books.length < minBooks) return null;

  const toBookPrices = (rows: readonly CanonicalOddsRowForRead[]) =>
    rows.map((b) => ({
      home: b.homePrice,
      away: b.awayPrice,
      draw: b.drawPrice,
    }));

  const consensus = consensusNoVig(toBookPrices(books));
  if (!consensus || consensus.bookCount < minBooks) return null;

  const freshest = books.reduce((max, b) =>
    b.fetchedAt > max.fetchedAt ? b : max,
  );

  // Drift: same de-vig over each book's EARLIEST quote. Only books with a
  // genuinely earlier capture count — a single snapshot has no history.
  const earliestByBook = new Map<string, CanonicalOddsRowForRead>();
  for (const row of rows) {
    if (row.market !== "H2H") continue;
    const canonical = canonicalRow(row);
    if (!canonical) continue;
    const existing = earliestByBook.get(row.bookmaker);
    if (!existing || row.fetchedAt < existing.fetchedAt) {
      earliestByBook.set(row.bookmaker, canonical);
    }
  }
  const earlier = [...earliestByBook.values()].filter((b) => {
    const latest = latestByBook.get(b.bookmaker);
    return latest !== undefined && b.fetchedAt < latest.fetchedAt;
  });
  let homeDriftPp: number | null = null;
  let homeDriftPerHourPp: number | null = null;
  if (earlier.length >= minBooks) {
    const open = consensusNoVig(toBookPrices(earlier));
    if (open && open.bookCount >= minBooks) {
      homeDriftPp = Number(((consensus.fairHomeProb - open.fairHomeProb) * 100).toFixed(1));
      const earliestAt = earlier.reduce((min, b) => (b.fetchedAt < min ? b.fetchedAt : min), earlier[0]!.fetchedAt);
      const spanHours = (freshest.fetchedAt.getTime() - earliestAt.getTime()) / 3_600_000;
      if (spanHours > 0) {
        homeDriftPerHourPp = Number((homeDriftPp / spanHours).toFixed(2));
      }
    }
  }

  return {
    consensus,
    freshestFetchedAt: freshest.fetchedAt.toISOString(),
    homeDriftPp,
    homeDriftPerHourPp,
    gravity: marketGravityIndex(consensus),
  };
}

function canonicalRow(row: OddsRowForRead): CanonicalOddsRowForRead | null {
  const home = normalizeAmericanOdds(row.homePrice);
  const away = normalizeAmericanOdds(row.awayPrice);
  if (!home || !away) return null;
  return {
    ...row,
    homePrice: home.normalized,
    awayPrice: away.normalized,
    drawPrice: normalizeAmericanOdds(row.drawPrice)?.normalized ?? null,
  };
}

import { consensusNoVig, type ConsensusMarketRead } from "@sports/prediction-engine";

/**
 * Game-level market read — turns captured per-book H2H odds rows into the
 * market's own no-vig consensus (Shin de-vig per book, median across books).
 *
 * This is MARKET DESCRIPTION, not a model claim: "what the books charge,
 * with their margin removed." Model fair-value/EV stays hard-gated elsewhere
 * (audit-drawer-shape contract); this module never touches model outputs.
 * Pure, no I/O.
 */

export interface OddsRowForRead {
  readonly bookmaker: string;
  readonly market: string;
  readonly fetchedAt: Date;
  readonly homePrice: number | null;
  readonly awayPrice: number | null;
  readonly drawPrice: number | null;
}

export interface GameMarketRead {
  readonly consensus: ConsensusMarketRead;
  /** ISO timestamp of the freshest odds row used. */
  readonly freshestFetchedAt: string;
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
  const latestByBook = new Map<string, OddsRowForRead>();
  for (const row of rows) {
    if (row.market !== "H2H") continue;
    if (!isPrice(row.homePrice) || !isPrice(row.awayPrice)) continue;
    const existing = latestByBook.get(row.bookmaker);
    if (!existing || row.fetchedAt > existing.fetchedAt) {
      latestByBook.set(row.bookmaker, row);
    }
  }

  const books = [...latestByBook.values()];
  if (books.length < minBooks) return null;

  const consensus = consensusNoVig(
    books.map((b) => ({
      home: b.homePrice as number,
      away: b.awayPrice as number,
      draw: isPrice(b.drawPrice) ? b.drawPrice : null,
    })),
  );
  if (!consensus || consensus.bookCount < minBooks) return null;

  const freshest = books.reduce((max, b) =>
    b.fetchedAt > max.fetchedAt ? b : max,
  );

  return { consensus, freshestFetchedAt: freshest.fetchedAt.toISOString() };
}

function isPrice(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value) && value !== 0;
}

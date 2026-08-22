/**
 * Encode licensed Odds API player-prop event-odds into OddsLineSnapshot rows.
 *
 * Schema is sealed. OddsLineSnapshot.market and .side are strings with no
 * playerId. We do not add a table. Encoding:
 *   market = "<oddsApiKey>|<playerSlug>"   e.g. player_receptions|justin_jefferson
 *   side   = "over" | "under"
 *   line   = outcome.point
 *   price  = American odds as returned
 *
 * OPEN/INTERIM classification in line-archive is per (gameId, market), so the
 * player slug belongs in `market`, not only in `side`.
 *
 * Fail closed: skip missing player name, non Over/Under, non-finite price.
 * One-sided books are stored as one row — do not invent the other side.
 *
 * Never historical. Never scrape. DK/FD/MGM via the Odds API payload only.
 */

import type { LineSnapshotRow } from "./line-archive.js";

export const PROP_MARKET_SEP = "|";

export interface PropOutcomeLike {
  readonly name?: string;
  readonly description?: string;
  readonly price?: number;
  readonly point?: number;
}

export interface PropMarketLike {
  readonly key?: string;
  readonly outcomes?: readonly PropOutcomeLike[];
}

export interface PropBookmakerLike {
  readonly key?: string;
  readonly markets?: readonly PropMarketLike[];
}

export interface PropEventLike {
  readonly id?: string;
  readonly bookmakers?: readonly PropBookmakerLike[];
}

function slugPlayer(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function overUnder(name: string): "over" | "under" | null {
  const n = name.trim().toLowerCase();
  if (n === "over") return "over";
  if (n === "under") return "under";
  return null;
}

export function encodePropMarket(marketKey: string, playerName: string): string | null {
  if (!marketKey || marketKey.includes(PROP_MARKET_SEP)) return null;
  const slug = slugPlayer(playerName);
  if (!slug) return null;
  return `${marketKey}${PROP_MARKET_SEP}${slug}`;
}

export function decodePropMarket(
  market: string,
): { readonly marketKey: string; readonly playerSlug: string } | null {
  const i = market.indexOf(PROP_MARKET_SEP);
  if (i <= 0 || i === market.length - 1) return null;
  return { marketKey: market.slice(0, i), playerSlug: market.slice(i + 1) };
}

function isFeaturedMarket(key: string): boolean {
  return key === "h2h" || key === "spreads" || key === "totals";
}

/**
 * Flatten one Odds API event-odds payload into archive rows.
 * Featured h2h/spreads/totals are ignored here — toLineSnapshotRows owns those.
 */
export function toPropLineSnapshotRows(event: PropEventLike): LineSnapshotRow[] {
  const rows: LineSnapshotRow[] = [];
  for (const book of event.bookmakers ?? []) {
    const bookKey = book.key ?? "";
    if (!bookKey) continue;
    for (const market of book.markets ?? []) {
      const marketKey = market.key ?? "";
      if (!marketKey || isFeaturedMarket(marketKey)) continue;
      for (const outcome of market.outcomes ?? []) {
        const side = overUnder(outcome.name ?? "");
        const player = outcome.description ?? "";
        const encoded = encodePropMarket(marketKey, player);
        if (side == null || encoded == null) continue;
        if (!Number.isFinite(outcome.price)) continue;
        rows.push({
          book: bookKey,
          market: encoded,
          side,
          price: outcome.price as number,
          line: Number.isFinite(outcome.point) ? (outcome.point as number) : null,
        });
      }
    }
  }
  return rows;
}

export function eventOddsId(event: PropEventLike): string | null {
  const id = event.id;
  return id && id.length > 0 ? id : null;
}

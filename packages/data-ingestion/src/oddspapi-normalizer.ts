/**
 * OddsPapi → NormalizedOdds mapping.
 *
 * The wire shape (CONFIRMED from official docs + NFL props study, 2026-09-18):
 *   bookmakerOdds[slug].markets[marketId].outcomes[outcomeId].players[playerId]
 * where dict keys that look numeric are STRINGS and player "0" = game line.
 * Market IDs are NOT stable semantics: the same bet ships under multiple IDs
 * (anytime TD under two IDs on one fixture), so every lookup below resolves
 * by market NAME from the /v4/markets catalog — never by hardcoded ID.
 *
 * LADDER RULE (CONFIRMED): total/handicap families carry ONE market ID PER
 * LINE RUNG. Consumers key on (playerName, handicap), never market ID.
 *
 * ASSUMPTIONS (flagged, verify against a live sample):
 *   - Handicap markets quote the line on both outcomes symmetrically; the
 *     catalog `handicap` is recorded as the market's line as-is.
 *   - Outcome side resolution is name-based (1/Home vs 2/Away, Over/Under).
 *
 * PROPS are deliberately EXCLUDED from normalized output: the GSE `picks`
 * table only supports SPREAD/MONEYLINE/TOTAL, so prop boards (player-keyed
 * rungs) never enter this path. Prop CLV/line-movement work uses the raw
 * client (getHistoricalOdds) directly.
 */

import type { NormalizedOdds } from "@sports/types";
import {
  classifyGameLineMarket,
  parseAmericanPrice,
  type OddsPapiMarketCatalogEntry,
  type OddsPapiOddsResponse,
} from "./oddspapi-client.js";

/** marketId → catalog entry. Build once per fetch from /v4/markets. */
export type OddsPapiCatalog = Map<string, OddsPapiMarketCatalogEntry>;

/** Outcome IDs that the catalog says nothing about are dropped, never guessed. */
export type OutcomeSide = "home" | "away" | "over" | "under";

export function buildOddsPapiCatalog(
  entries: readonly OddsPapiMarketCatalogEntry[],
): OddsPapiCatalog {
  return new Map(entries.map((e) => [e.marketId, e]));
}

/**
 * Name-based outcome side resolution. UNVERIFIED against live samples for
 * every naming variant — unknown names resolve to null and the price is
 * skipped rather than mislabeled.
 */
export function resolveOutcomeSide(
  outcomeName: string,
  homeNames: readonly string[],
  awayNames: readonly string[],
): OutcomeSide | null {
  const lower = outcomeName.trim().toLowerCase();
  if (!lower) return null;
  const home = new Set(homeNames.map((n) => n.trim().toLowerCase()).filter(Boolean));
  const away = new Set(awayNames.map((n) => n.trim().toLowerCase()).filter(Boolean));
  if (lower === "over" || lower === "o") return "over";
  if (lower === "under" || lower === "u") return "under";
  if (home.has(lower) || lower === "1" || lower === "home") return "home";
  if (away.has(lower) || lower === "2" || lower === "away") return "away";
  return null;
}

/** Internal / demo feeds must never enter GSE quotes. */
export function isInternalOddsPapiFeed(slug: string): boolean {
  return slug === "demo" || slug.startsWith("pinnacle+");
}

function namesFor(response: OddsPapiOddsResponse): {
  readonly home: string[];
  readonly away: string[];
} {
  return {
    home: [
      response.participant1Name,
      response.participant1ShortName ?? "",
      response.participant1Abbr ?? "",
    ].filter(Boolean),
    away: [
      response.participant2Name,
      response.participant2ShortName ?? "",
      response.participant2Abbr ?? "",
    ].filter(Boolean),
  };
}

function toDate(value: string | null | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const t = Date.parse(value);
  return Number.isFinite(t) ? new Date(t) : fallback;
}

export function normalizeOddsPapiOdds(
  response: OddsPapiOddsResponse,
  catalog: OddsPapiCatalog,
  fetchedAt: Date,
): NormalizedOdds[] {
  const out: NormalizedOdds[] = [];
  const { home, away } = namesFor(response);
  const books = response.bookmakerOdds ?? {};

  for (const [slug, book] of Object.entries(books)) {
    if (!book || book.suspended || isInternalOddsPapiFeed(slug)) continue;
    for (const [marketId, market] of Object.entries(book.markets ?? {})) {
      if (!market || !market.marketActive) continue;
      const entry = catalog.get(marketId);
      // Unknown market ID: the catalog is the source of truth — skip, never guess.
      if (!entry) continue;
      const kind = classifyGameLineMarket(entry.marketName);
      if (kind === null) continue; // prop or unknown family — excluded by design

      const outcomes = Object.entries(market.outcomes ?? {});
      if (outcomes.length === 0) continue;

      const prices = new Map<OutcomeSide, { price: number; updated: Date }>();
      for (const [outcomeId, outcome] of outcomes) {
        const outcomeName =
          entry.outcomes.find((o) => o.outcomeId === outcomeId)?.outcomeName ?? "";
        const side = resolveOutcomeSide(outcomeName, home, away);
        if (side === null) continue;
        // Game line only: player "0". Prop rungs (other player IDs) never
        // enter normalized output (see module docstring).
        const cell = outcome.players?.["0"];
        if (!cell || !cell.active) continue;
        const american = parseAmericanPrice(cell.priceAmerican);
        if (american === null) continue;
        prices.set(side, {
          price: american,
          updated: toDate(cell.bookmakerChangedAt ?? cell.changedAt, fetchedAt),
        });
      }

      if (kind === "H2H") {
        const h = prices.get("home");
        const a = prices.get("away");
        if (!h || !a) continue; // one-sided book: not a usable quote
        out.push({
          gameExternalId: response.fixtureId,
          bookmaker: slug,
          market: "H2H",
          homePrice: h.price,
          awayPrice: a.price,
          fetchedAt,
          bookmakerLastUpdate: h.updated > a.updated ? h.updated : a.updated,
        });
      } else if (kind === "SPREADS") {
        const h = prices.get("home");
        const a = prices.get("away");
        if (!h || !a || entry.handicap == null) continue;
        out.push({
          gameExternalId: response.fixtureId,
          bookmaker: slug,
          market: "SPREADS",
          spread: entry.handicap,
          homeSpreadPrice: h.price,
          awaySpreadPrice: a.price,
          fetchedAt,
          bookmakerLastUpdate: h.updated > a.updated ? h.updated : a.updated,
        });
      } else {
        const o = prices.get("over");
        const u = prices.get("under");
        if (!o || !u || entry.handicap == null) continue;
        out.push({
          gameExternalId: response.fixtureId,
          bookmaker: slug,
          market: "TOTALS",
          total: entry.handicap,
          overPrice: o.price,
          underPrice: u.price,
          fetchedAt,
          bookmakerLastUpdate: o.updated > u.updated ? o.updated : u.updated,
        });
      }
    }
  }

  return out;
}

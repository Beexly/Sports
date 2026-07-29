/**
 * Gamma → closing archive cron_delta runner (hot q-plane, free).
 * Odds API not required. Feeds self-CLV archive.
 */

import {
  fetchGammaMarkets,
  type GammaHttp,
  type GammaMarketQuote,
} from "../providers/gamma-markets.js";
import {
  type ClosingArchive,
  type ClosingArchiveEntry,
} from "../archive/closing-archive.js";
import { summarizeCronDelta, type CronDeltaTick } from "./write-through.js";

export type GammaCronDeltaResult = {
  ok: boolean;
  tick: CronDeltaTick;
  quotes: GammaMarketQuote[];
  archived: number;
  refused: number;
  error?: string;
  code?: string;
};

export async function runGammaCronDelta(opts: {
  archive: ClosingArchive;
  http?: GammaHttp;
  limit?: number;
  /** First touch for an event/market/side becomes open if none exists */
  promoteOpen?: boolean;
  now?: () => string;
}): Promise<GammaCronDeltaResult> {
  const startedAt = (opts.now ?? (() => new Date().toISOString()))();
  const fetched = await fetchGammaMarkets({
    http: opts.http,
    limit: opts.limit,
    now: () => startedAt,
  });

  if (!fetched.ok) {
    const tick: CronDeltaTick = {
      source: "polymarket_gamma",
      startedAt,
      finishedAt: startedAt,
      quotesTouched: 0,
      archived: 0,
      refused: 1,
      oddsApiUsed: false,
    };
    return {
      ok: false,
      tick,
      quotes: [],
      archived: 0,
      refused: 1,
      error: fetched.error,
      code: fetched.code,
    };
  }

  let archived = 0;
  let refused = 0;
  for (const q of fetched.quotes) {
    try {
      const hasOpen = opts.archive.opens(q.eventId, q.market, q.side);
      const role: ClosingArchiveEntry["role"] =
        opts.promoteOpen !== false && !hasOpen ? "open" : "touch";
      opts.archive.append({
        eventId: q.eventId,
        market: q.market,
        side: q.side,
        decimalOdds: q.decimalOdds,
        asOf: q.asOf,
        source: "gamma",
        role,
        archivedAt: startedAt,
        book: "polymarket",
      });
      archived += 1;
    } catch {
      refused += 1;
    }
  }

  const finishedAt = (opts.now ?? (() => new Date().toISOString()))();
  const tick: CronDeltaTick = {
    source: "polymarket_gamma",
    startedAt,
    finishedAt,
    quotesTouched: fetched.quotes.length,
    archived,
    refused,
    oddsApiUsed: false,
  };

  return {
    ok: refused === 0 || archived > 0,
    tick,
    quotes: fetched.quotes,
    archived,
    refused,
  };
}

export function summarizeGammaTicks(ticks: readonly CronDeltaTick[]) {
  return {
    ...summarizeCronDelta(ticks),
    source: "polymarket_gamma" as const,
    oddsApiRequired: false as const,
  };
}

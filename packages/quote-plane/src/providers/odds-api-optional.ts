/**
 * The Odds API — OPTIONAL enrichment, not required path.
 * When key missing → empty (honest refuse), never synthetic books labeled as real.
 */

import type { QuoteFetchRequest, QuoteLine, QuoteProvider } from "../types";
import { twoWayDevig, americanToImplied } from "../devig/american";

export interface OddsApiBookOutcome {
  readonly name: string;
  readonly price: number; // american
}

export interface OddsApiEvent {
  readonly id: string;
  readonly sport_key: string;
  readonly home_team: string;
  readonly away_team: string;
  readonly commence_time: string;
  readonly bookmakers?: readonly {
    readonly key: string;
    readonly markets?: readonly {
      readonly key: string;
      readonly outcomes?: readonly OddsApiBookOutcome[];
    }[];
  }[];
}

export function oddsApiEventsToLines(
  events: readonly OddsApiEvent[],
  sourceId = "the_odds_api",
): QuoteLine[] {
  const out: QuoteLine[] = [];
  for (const ev of events) {
    for (const book of ev.bookmakers ?? []) {
      for (const m of book.markets ?? []) {
        if (m.key !== "h2h" || !m.outcomes || m.outcomes.length < 2) continue;
        const a = m.outcomes[0]!;
        const b = m.outcomes[1]!;
        try {
          const { pA, pB, overround } = twoWayDevig(a.price, b.price);
          const asOf = ev.commence_time;
          out.push(
            {
              eventId: ev.id,
              sport: ev.sport_key,
              market: "h2h",
              selection: a.name,
              q: pA,
              rawAmerican: a.price,
              quoteAsOf: asOf,
              sourceId,
              sourceKind: "sportsbook_aggregator",
              rights: "api_tos",
              bookId: book.key,
              overround,
              confidence: 0.85,
              methodTag: "two_way_devig_v1",
              modelVersion: "quote.odds_api.v1",
            },
            {
              eventId: ev.id,
              sport: ev.sport_key,
              market: "h2h",
              selection: b.name,
              q: pB,
              rawAmerican: b.price,
              quoteAsOf: asOf,
              sourceId,
              sourceKind: "sportsbook_aggregator",
              rights: "api_tos",
              bookId: book.key,
              overround,
              confidence: 0.85,
              methodTag: "two_way_devig_v1",
              modelVersion: "quote.odds_api.v1",
            },
          );
        } catch {
          // single outcome fallback — no methodTag (raw implied ≠ de-vig)
          // Continuous CLV must refuse rather than pretend continuity.
          out.push({
            eventId: ev.id,
            sport: ev.sport_key,
            market: "h2h",
            selection: a.name,
            q: americanToImplied(a.price),
            rawAmerican: a.price,
            quoteAsOf: ev.commence_time,
            sourceId,
            sourceKind: "sportsbook_aggregator",
            rights: "api_tos",
            bookId: book.key,
            confidence: 0.5,
            notes: "raw implied (no pair de-vig)",
          });
        }
      }
    }
  }
  return out;
}

/** The fetch signature this provider accepts for injection (tests / adapters). */
export type OddsApiOptionalFetch = (
  url: string,
  init?: { headers?: Record<string, string> },
) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

export function createOddsApiOptionalProvider(opts: {
  apiKey?: string | null;
  /** Offline / test fixtures */
  fixtures?: readonly OddsApiEvent[];
  fetchImpl?: OddsApiOptionalFetch;
}): QuoteProvider {
  return {
    id: "the_odds_api",
    kind: "sportsbook_aggregator",
    rights: "api_tos",
    requiresApiKey: true,
    phaseOutRole: "legacy", // enrichment only in phase-out plan
    async fetchQuotes(req: QuoteFetchRequest): Promise<QuoteLine[]> {
      if (opts.fixtures) return oddsApiEventsToLines(opts.fixtures);
      if (!opts.apiKey) return []; // key missing → empty, not fake
      const sport = req.sport || "americanfootball_nfl";
      // api.the-odds-api.com authenticates via an `apiKey` query parameter —
      // it does not accept a header. Confirmed live 2026-08-15 (a header-only
      // request returns 401 MISSING_KEY). Reverted to query-param auth.
      const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds?regions=us&markets=h2h&oddsFormat=american&apiKey=${encodeURIComponent(opts.apiKey)}`;
      try {
        const fetchImpl: OddsApiOptionalFetch =
          opts.fetchImpl ??
          (async (u: string, init?: { headers?: Record<string, string> }) => {
            const r = await fetch(u, { headers: init?.headers });
            return { ok: r.ok, json: () => r.json() };
          });
        const res = await fetchImpl(url);
        if (!res.ok) return [];
        const body = (await res.json()) as OddsApiEvent[];
        return Array.isArray(body) ? oddsApiEventsToLines(body) : [];
      } catch {
        return [];
      }
    },
  };
}

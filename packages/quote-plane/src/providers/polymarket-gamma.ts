/**
 * Polymarket Gamma API adapter — free, no API key for market discovery.
 * Primary candidate to reduce The Odds API dependency for binary sports markets.
 *
 * Base: https://gamma-api.polymarket.com
 * Auth: none for read-only Gamma
 * Rights: api_tos / public_market — attribute Polymarket; check commercial ToS before prod money path
 *
 * Network fetch is injectable so tests stay offline.
 */

import type { QuoteFetchRequest, QuoteLine, QuoteProvider } from "../types";
import { clamp01 } from "../devig/american";

export const POLYMARKET_GAMMA_BASE = "https://gamma-api.polymarket.com";

export interface GammaMarket {
  readonly id?: string;
  readonly question?: string;
  readonly slug?: string;
  readonly outcomePrices?: string | string[] | number[]; // often JSON string of [yes, no]
  readonly outcomes?: string | string[];
  readonly endDate?: string;
  readonly closed?: boolean;
  readonly active?: boolean;
  readonly sportsMarketType?: string;
  readonly updatedAt?: string;
}

export type GammaFetch = (
  path: string,
  init?: RequestInit,
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

function parsePrices(m: GammaMarket): number[] | null {
  let prices: unknown = m.outcomePrices;
  if (typeof prices === "string") {
    try {
      prices = JSON.parse(prices);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(prices) || prices.length < 1) return null;
  const nums = prices.map((x) => Number(x)).filter((n) => Number.isFinite(n));
  return nums.length ? nums : null;
}

function parseOutcomes(m: GammaMarket): string[] {
  let o: unknown = m.outcomes;
  if (typeof o === "string") {
    try {
      o = JSON.parse(o);
    } catch {
      return ["Yes", "No"];
    }
  }
  if (Array.isArray(o)) return o.map(String);
  return ["Yes", "No"];
}

export function gammaMarketToLines(
  m: GammaMarket,
  sport = "MULTI",
  nowIso?: string,
): QuoteLine[] {
  const prices = parsePrices(m);
  if (!prices) return [];
  const outcomes = parseOutcomes(m);
  const eventId = String(m.id ?? m.slug ?? "unknown");
  const asOf = m.updatedAt ?? nowIso ?? new Date().toISOString();
  return prices.map((q, i) => ({
    eventId,
    sport,
    market: "binary_pm" as const,
    selection: outcomes[i] ?? `outcome_${i}`,
    q: clamp01(q),
    quoteAsOf: asOf,
    sourceId: "polymarket.gamma",
    sourceKind: "prediction_market" as const,
    rights: "public_market" as const,
    bookId: "polymarket",
    confidence: 0.7,
    notes: m.question,
  }));
}

export function createPolymarketGammaProvider(
  opts: {
    fetchImpl?: GammaFetch;
    baseUrl?: string;
    sport?: string;
    /** Offline fixtures when network unavailable */
    fixtures?: readonly GammaMarket[];
  } = {},
): QuoteProvider {
  const base = opts.baseUrl ?? POLYMARKET_GAMMA_BASE;
  const fetchImpl =
    opts.fetchImpl ??
    (async (path: string) => {
      const res = await fetch(`${base}${path}`);
      return {
        ok: res.ok,
        status: res.status,
        json: () => res.json(),
      };
    });

  return {
    id: "polymarket.gamma",
    kind: "prediction_market",
    rights: "public_market",
    requiresApiKey: false,
    phaseOutRole: "primary_candidate",
    async fetchQuotes(req: QuoteFetchRequest): Promise<QuoteLine[]> {
      if (opts.fixtures) {
        return opts.fixtures.flatMap((m) =>
          gammaMarketToLines(m, opts.sport ?? req.sport ?? "MULTI", req.asOf),
        );
      }
      // Sports-tagged markets; limit for safety
      const q = new URLSearchParams({
        closed: "false",
        limit: "25",
        active: "true",
      });
      if (req.eventId) q.set("id", req.eventId);
      try {
        const res = await fetchImpl(`/markets?${q.toString()}`);
        if (!res.ok) return [];
        const body = (await res.json()) as GammaMarket[] | { data?: GammaMarket[] };
        const markets = Array.isArray(body) ? body : (body.data ?? []);
        return markets.flatMap((m) =>
          gammaMarketToLines(m, opts.sport ?? req.sport ?? "MULTI", req.asOf),
        );
      } catch {
        return []; // refuse-default: empty, never fake prices
      }
    },
  };
}

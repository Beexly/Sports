/**
 * Kalshi Trade API market-data adapter (read path).
 * Base: https://external-api.kalshi.com/trade-api/v2
 * Orderbook: GET /markets/{ticker}/orderbook (public market data pattern)
 * Injectable fetch — tests offline. Rights/ToS before commercial redistribution.
 *
 * GSE: optional quote enrichment. oddsApiRequired=false. Not a DCM product surface.
 */

import type { QuoteFetchRequest, QuoteLine, QuoteProvider } from "../types";

export const KALSHI_TRADE_API_BASE =
  "https://external-api.kalshi.com/trade-api/v2";

export type KalshiFetch = (
  path: string,
  init?: RequestInit,
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export interface KalshiOrderbookPayload {
  readonly orderbook?: {
    readonly yes?: unknown[];
    readonly no?: unknown[];
  };
  readonly yes?: unknown[];
  readonly no?: unknown[];
}

function levelPriceQty(level: unknown): { price: number; qty: number } | null {
  if (Array.isArray(level) && level.length >= 2) {
    const price = Number(level[0]);
    const qty = Number(level[1]);
    if (Number.isFinite(price) && Number.isFinite(qty)) return { price, qty };
  }
  if (level && typeof level === "object") {
    const o = level as Record<string, unknown>;
    const price = Number(o.price ?? o.yes_price ?? o.p);
    const qty = Number(o.quantity ?? o.count ?? o.q ?? 0);
    if (Number.isFinite(price))
      return { price, qty: Number.isFinite(qty) ? qty : 0 };
  }
  return null;
}

/** Normalize Kalshi cents (1–99) or unit interval to unit interval. */
function toUnit(price: number): number {
  if (price > 1 && price <= 100) return price / 100;
  return price;
}

/**
 * Best YES bid from yes book; YES ask ≈ 1 − best NO bid when books linked.
 */
export function midFromKalshiOrderbook(
  payload: KalshiOrderbookPayload,
): { mid: number; bid: number | null; ask: number | null } | null {
  const book = payload.orderbook ?? payload;
  const yes = (book as { yes?: unknown[] }).yes ?? [];
  const no = (book as { no?: unknown[] }).no ?? [];
  const yesBids = yes
    .map(levelPriceQty)
    .filter((x): x is { price: number; qty: number } => !!x)
    .map((x) => ({ ...x, price: toUnit(x.price) }))
    .filter((x) => x.price > 0 && x.price < 1)
    .sort((a, b) => b.price - a.price);
  const noBids = no
    .map(levelPriceQty)
    .filter((x): x is { price: number; qty: number } => !!x)
    .map((x) => ({ ...x, price: toUnit(x.price) }))
    .filter((x) => x.price > 0 && x.price < 1)
    .sort((a, b) => b.price - a.price);

  const bid = yesBids[0]?.price ?? null;
  const ask = noBids[0] != null ? 1 - noBids[0].price : null;

  if (bid != null && ask != null) {
    const mid = (bid + ask) / 2;
    if (mid > 0 && mid < 1) return { mid, bid, ask };
  }
  if (bid != null) return { mid: bid, bid, ask: null };
  if (ask != null && ask > 0 && ask < 1) return { mid: ask, bid: null, ask };
  return null;
}

export function createKalshiTradeProvider(
  opts: {
    fetchImpl?: KalshiFetch;
    baseUrl?: string;
    /** Offline fixtures keyed by ticker */
    fixtures?: Record<string, KalshiOrderbookPayload>;
    defaultTicker?: string;
  } = {},
): QuoteProvider {
  const base = opts.baseUrl ?? KALSHI_TRADE_API_BASE;
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
    id: "kalshi.trade_api",
    kind: "prediction_market",
    rights: "public_market",
    requiresApiKey: false,
    phaseOutRole: "primary_candidate",
    async fetchQuotes(req: QuoteFetchRequest): Promise<QuoteLine[]> {
      const ticker =
        req.eventId ?? opts.defaultTicker ?? "DEMO-TICKER";
      if (opts.fixtures) {
        const payload = opts.fixtures[ticker] ?? Object.values(opts.fixtures)[0];
        if (!payload) return [];
        const m = midFromKalshiOrderbook(payload);
        if (!m) return [];
        return [
          {
            eventId: ticker,
            sport: req.sport,
            market: "binary_pm",
            selection: "Yes",
            q: m.mid,
            quoteAsOf: req.asOf ?? new Date().toISOString(),
            sourceId: "kalshi.trade_api",
            sourceKind: "prediction_market",
            rights: "public_market",
            bookId: "kalshi",
            confidence: 0.75,
            notes: `bid=${m.bid} ask=${m.ask} fee_aware`,
            methodTag: "prediction_market_raw_v1",
            modelVersion: "quote.kalshi.v1",
          },
        ];
      }
      // Fail-closed: Kalshi Developer Agreement v1.1 §3/§3.1 (own-trading only).
      // Flip only after source-rights-registry `kalshi` is approved_written_permission.
      const kalshiLiveNetworkCleared = false;
      if (!kalshiLiveNetworkCleared) return [];
      const res = await fetchImpl(
        `/markets/${encodeURIComponent(ticker)}/orderbook`,
      );
      if (!res.ok) return [];
      const json = (await res.json()) as KalshiOrderbookPayload;
      const m = midFromKalshiOrderbook(json);
      if (!m) return [];
      return [
        {
          eventId: ticker,
          sport: req.sport,
          market: "binary_pm",
          selection: "Yes",
          q: m.mid,
          quoteAsOf: req.asOf ?? new Date().toISOString(),
          sourceId: "kalshi.trade_api",
          sourceKind: "prediction_market",
          rights: "public_market",
          bookId: "kalshi",
          confidence: 0.75,
          notes: `bid=${m.bid} ask=${m.ask}`,
          methodTag: "prediction_market_raw_v1",
          modelVersion: "quote.kalshi.v1",
        },
      ];
    },
  };
}

export const KALSHI_PROVIDER_META = {
  id: "kalshi.trade_api",
  oddsApiRequired: false as const,
  authForPublicOrderbook: false,
  rightsNote:
    "Kalshi Developer Agreement v1.1 §3/§3.1: API use is own-trading only; live network defaults off until written authorization",
} as const;

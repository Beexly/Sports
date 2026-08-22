/**
 * PredExon Kalshi vendor — the legal HOW around Kalshi Dev Agreement §3.
 *
 * Native Kalshi Trade API is own-trading-only. PredExon captures Kalshi from
 * its own infrastructure and sells a REST catalog (docs.predexon.com).
 * Auth: `x-api-key` header. GET /v2/kalshi/markets is documented free+unlimited.
 *
 * SAFETY
 *   - Default OFF (`PREDEXON_INGEST`).
 *   - Key from env `PREDEXON_API_KEY` only. Never commit, log, or print it.
 *   - assertIngestible("predexon") before any network.
 *   - No orders. No Kalshi Trade API. No HuggingFace API dumps.
 */

import { assertIngestible } from "./source-registry.js";
import { noStoreFetch } from "./no-store-fetch.js";

export const PREDEXON_SOURCE_ID = "predexon";
export const PREDEXON_BASE = "https://api.predexon.com";
const TIMEOUT_MS = 12_000;

export function isPredExonIngestEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const v = (env.PREDEXON_INGEST ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function predexonApiKey(env: NodeJS.ProcessEnv): string | null {
  const v = (env.PREDEXON_API_KEY ?? "").trim();
  return v.length > 0 ? v : null;
}

export class PredExonError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "PredExonError";
  }
}

export interface PredExonKalshiMarket {
  readonly ticker: string;
  readonly event_ticker: string;
  readonly title: string;
  readonly status: string;
  readonly last_price: number | null;
}

export interface PredExonKalshiMarketsPage {
  readonly markets: readonly PredExonKalshiMarket[];
  readonly hasMore: boolean;
  readonly paginationKey: string | null;
}

function asMarkets(body: unknown): PredExonKalshiMarket[] {
  if (!body || typeof body !== "object") return [];
  const raw = (body as { markets?: unknown }).markets;
  if (!Array.isArray(raw)) return [];
  const out: PredExonKalshiMarket[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.ticker !== "string" || typeof r.event_ticker !== "string") continue;
    const last = r.last_price;
    out.push({
      ticker: r.ticker,
      event_ticker: r.event_ticker,
      title: typeof r.title === "string" ? r.title : "",
      status: typeof r.status === "string" ? r.status : "",
      last_price: typeof last === "number" && Number.isFinite(last) ? last : null,
    });
  }
  return out;
}

export class PredExonClient {
  constructor(
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly fetchImpl: typeof fetch = noStoreFetch,
  ) {}

  async listKalshiMarkets(query: {
    readonly search?: string;
    readonly status?: "open" | "closed";
    readonly limit?: number;
  } = {}): Promise<PredExonKalshiMarketsPage | null> {
    if (!isPredExonIngestEnabled(this.env)) return null;
    assertIngestible(PREDEXON_SOURCE_ID);
    const key = predexonApiKey(this.env);
    if (!key) throw new PredExonError("missing PREDEXON_API_KEY");

    const params = new URLSearchParams();
    if (query.search) params.set("search", query.search);
    if (query.status) params.set("status", query.status);
    params.set("limit", String(Math.min(100, Math.max(1, query.limit ?? 20))));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await this.fetchImpl(`${PREDEXON_BASE}/v2/kalshi/markets?${params.toString()}`, {
        headers: { "x-api-key": key, Accept: "application/json" },
        signal: controller.signal,
      });
      if (!res.ok) throw new PredExonError(`PredExon HTTP ${res.status}`, res.status);
      const body: unknown = await res.json();
      const pagination =
        body && typeof body === "object"
          ? (body as { pagination?: { has_more?: unknown; pagination_key?: unknown } }).pagination
          : undefined;
      return {
        markets: asMarkets(body),
        hasMore: pagination?.has_more === true,
        paginationKey: typeof pagination?.pagination_key === "string" ? pagination.pagination_key : null,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

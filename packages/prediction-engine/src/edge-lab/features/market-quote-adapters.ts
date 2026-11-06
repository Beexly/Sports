/**
 * Market-quote adapters for the zero-cost live-data lane (INDEX remaining
 * candidate #3): normalized read mappings from free prediction-market APIs
 * into the repo's quote shape. Pure parsers ONLY — fetching stays in scripts
 * (curl/fetch), so tests run offline against recorded payload shapes.
 *
 * Verified live 2026-08-25 (no auth required):
 * - Manifold  GET https://api.manifold.markets/v0/markets?limit=N&sort=sort
 *   → array of markets; BINARY markets expose `probability` (CPMM-derived
 *   P(YES)); docs https://docs.manifold.markets/api (~500 req/min per IP).
 * - Polymarket GET https://gamma-api.polymarket.com/markets?closed=false
 *   → array of markets; `outcomePrices` = [P(YES), P(NO)] as STRINGS,
 *   plus bestBid/bestAsk/lastTradePrice; trading is auth-gated but reads
 *   are open.
 *
 * Honesty rules: fail closed on malformed payloads; non-BINARY Manifold
 * markets are skipped (MULTIPLE_CHOICE/FREE_RESPONSE have no single YES);
 * prices must be finite in [0,1]. Adapters never invent data.
 */

export interface NormalizedQuote {
  readonly source: "manifold" | "polymarket";
  /** Platform-unique id for the market. */
  readonly marketId: string;
  readonly question: string;
  /** Consensus P(YES) implied by the platform mechanism/order book. */
  readonly yesProb: number;
  /** Optional top-of-book — Polymarket only; null elsewhere. */
  readonly bestBid: number | null;
  readonly bestAsk: number | null;
  readonly url: string;
}

function unitInterval(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 1) {
    throw new Error(`price not a finite value in [0,1]: ${String(v)}`);
  }
  return n;
}

/** Map one Manifold /v0/markets row. Returns null for non-BINARY markets. */
export function manifoldMarketToQuote(raw: unknown): NormalizedQuote | null {
  if (typeof raw !== "object" || raw == null) {
    throw new Error("manifold row must be an object");
  }
  const m = raw as Record<string, unknown>;
  if (m.outcomeType !== "BINARY") return null;
  if (typeof m.id !== "string" || typeof m.question !== "string") {
    throw new Error("manifold row missing id/question");
  }
  return {
    source: "manifold",
    marketId: m.id,
    question: m.question,
    yesProb: unitInterval(m.probability),
    bestBid: null,
    bestAsk: null,
    url: typeof m.url === "string" ? m.url : `https://manifold.markets/market/${m.id}`,
  };
}

export function manifoldPageToQuotes(payload: unknown): NormalizedQuote[] {
  if (!Array.isArray(payload)) throw new Error("manifold page must be an array");
  const out: NormalizedQuote[] = [];
  for (const row of payload) {
    const q = manifoldMarketToQuote(row);
    if (q) out.push(q); // non-BINARY skipped by design, documented above
  }
  return out;
}

/** Map one Polymarket Gamma /markets row. */
export function gammaMarketToQuote(raw: unknown): NormalizedQuote {
  if (typeof raw !== "object" || raw == null) {
    throw new Error("gamma row must be an object");
  }
  const m = raw as Record<string, unknown>;
  if (typeof m.id === "undefined" || typeof m.question !== "string") {
    throw new Error("gamma row missing id/question");
  }
  if (!Array.isArray(m.outcomePrices) || m.outcomePrices.length < 1) {
    throw new Error("gamma row missing outcomePrices");
  }
  const bid = m.bestBid == null ? null : unitInterval(m.bestBid);
  const ask = m.bestAsk == null ? null : unitInterval(m.bestAsk);
  return {
    source: "polymarket",
    marketId: String(m.id),
    question: m.question,
    yesProb: unitInterval(m.outcomePrices[0]),
    bestBid: bid,
    bestAsk: ask,
    url: typeof m.slug === "string" ? `https://polymarket.com/market/${m.slug}` : "",
  };
}

export function gammaPageToQuotes(payload: unknown): NormalizedQuote[] {
  if (!Array.isArray(payload)) throw new Error("gamma page must be an array");
  return payload.map(gammaMarketToQuote);
}

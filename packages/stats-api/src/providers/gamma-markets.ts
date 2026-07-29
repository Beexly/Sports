/**
 * Free Polymarket Gamma markets client — hot q-plane enrichment WITHOUT Odds API.
 * Public HTTPS, no key. Refuse-default on non-finite / missing prices.
 * Not a sportsbook affiliate. Not LIVE_BOARD authority.
 */

export type GammaMarketQuote = {
  eventId: string;
  market: string;
  side: string;
  decimalOdds: number;
  implied: number;
  asOf: string;
  source: "polymarket_gamma";
  rawQuestion?: string;
};

export type GammaFetchResult =
  | { ok: true; quotes: GammaMarketQuote[]; fetchedAt: string }
  | { ok: false; code: string; error: string };

export type GammaHttp = (url: string) => Promise<{ status: number; json: unknown }>;

const DEFAULT_BASE = "https://gamma-api.polymarket.com";

/** Convert probability (0,1) to decimal odds; refuse edges. */
export function impliedToDecimal(p: number): number | null {
  if (!Number.isFinite(p) || p <= 0 || p >= 1) return null;
  return Math.round((1 / p) * 1e6) / 1e6;
}

export function parseGammaMarketsPayload(
  json: unknown,
  asOf: string,
): GammaMarketQuote[] {
  if (!Array.isArray(json)) return [];
  const out: GammaMarketQuote[] = [];
  for (const row of json) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = String(r.id ?? r.conditionId ?? r.slug ?? "");
    if (!id) continue;
    // outcomePrices often JSON string of ["0.45","0.55"]
    let prices: number[] = [];
    const op = r.outcomePrices;
    if (typeof op === "string") {
      try {
        const parsed = JSON.parse(op) as unknown;
        if (Array.isArray(parsed)) {
          prices = parsed.map((x) => Number(x)).filter((n) => Number.isFinite(n));
        }
      } catch {
        prices = [];
      }
    } else if (Array.isArray(op)) {
      prices = op.map((x) => Number(x)).filter((n) => Number.isFinite(n));
    }
    let outcomes: string[] = ["yes", "no"];
    if (typeof r.outcomes === "string") {
      try {
        const parsed = JSON.parse(r.outcomes) as unknown;
        if (Array.isArray(parsed)) outcomes = parsed.map(String);
      } catch {
        /* keep default */
      }
    } else if (Array.isArray(r.outcomes)) {
      outcomes = r.outcomes.map(String);
    }
    const question = typeof r.question === "string" ? r.question : undefined;
    for (let i = 0; i < prices.length; i++) {
      const implied = prices[i]!;
      const dec = impliedToDecimal(implied);
      if (dec == null) continue;
      out.push({
        eventId: id,
        market: "binary",
        side: outcomes[i] ?? `side_${i}`,
        decimalOdds: dec,
        implied,
        asOf,
        source: "polymarket_gamma",
        rawQuestion: question,
      });
    }
  }
  return out;
}

/**
 * Fetch active markets. Inject http for tests — no network in unit tests.
 */
export async function fetchGammaMarkets(
  opts: {
    http?: GammaHttp;
    baseUrl?: string;
    limit?: number;
    now?: () => string;
  } = {},
): Promise<GammaFetchResult> {
  const asOf = (opts.now ?? (() => new Date().toISOString()))();
  const limit = opts.limit ?? 50;
  const base = opts.baseUrl ?? DEFAULT_BASE;
  const url = `${base}/markets?limit=${limit}&active=true&closed=false`;
  const http =
    opts.http ??
    (async (u: string) => {
      const res = await fetch(u, {
        headers: { Accept: "application/json" },
      });
      const json = (await res.json()) as unknown;
      return { status: res.status, json };
    });

  try {
    const { status, json } = await http(url);
    if (status < 200 || status >= 300) {
      return {
        ok: false,
        code: "gamma_http",
        error: `HTTP ${status}`,
      };
    }
    const quotes = parseGammaMarketsPayload(json, asOf);
    if (quotes.length === 0) {
      return {
        ok: false,
        code: "gamma_empty",
        error: "no parseable quotes",
      };
    }
    return { ok: true, quotes, fetchedAt: asOf };
  } catch (e) {
    return {
      ok: false,
      code: "gamma_fetch_failed",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

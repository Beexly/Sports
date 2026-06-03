/**
 * Kalshi fair-value client — a READ-ONLY market-data source for Closing-Line
 * Value (CLV), the make-or-break credibility metric (see prediction-engine/clv.ts).
 *
 * WHY KALSHI: Kalshi is a regulated event-contract exchange. Its public market
 * prices are market-implied probabilities with a near-zero overround (~0–0.5% vs
 * a sportsbook's 4–5%), making the de-vigged price an unusually clean fair-value
 * anchor to grade picks against. Verified live 2026-06-03 (docs/source-providers/
 * kalshi-and-odds-api-io-evaluation-2026-06-03.md).
 *
 * SAFETY — non-negotiable:
 *   • PUBLIC market-data reads ONLY. We touch `/events` and `/markets` (GET).
 *   • NO API key, NO request signing, NO `/portfolio` or `/orders` endpoints.
 *   • We NEVER place an order. Placing an order on Kalshi is automated betting,
 *     which is prohibited. This module has no code path that can.
 *
 * This file is pure ingestion: it returns a fair-value snapshot. Persisting that
 * snapshot at lock + near start, and grading picks against it, is a separate,
 * deliberate step (a schema field + computeMoneylineClv at settlement).
 */

// Public Trade API. Despite the host, this serves all Kalshi markets.
const KALSHI_BASE_URL = "https://external-api.kalshi.com/trade-api/v2";
// A hung exchange call must never block the ingestion cron.
const KALSHI_TIMEOUT_MS = 15 * 1000;

/** Leagues whose Kalshi game-winner series we can map. Ticker stem is `KX<LEAGUE>GAME`. */
export type KalshiLeague = "NBA" | "MLB" | "NFL" | "NHL";

/** A game described in the terms Kalshi tickers use: league, date, and the
 *  exchange's own team abbreviations (e.g. NYK, SAS). Mapping an internal team id
 *  to a Kalshi abbreviation is the caller's concern (a lookup table), kept out of
 *  here so this stays pure and testable. */
export interface KalshiGameRef {
  readonly league: KalshiLeague;
  /** Game date. Date-only string (YYYY-MM-DD) or ISO; interpreted in UTC. */
  readonly dateUtc: string;
  readonly awayAbbr: string;
  readonly homeAbbr: string;
}

/** Minimal shape of a Kalshi market we read. Prices are `*_dollars` strings in [0,1]. */
interface KalshiMarketRaw {
  readonly ticker: string;
  readonly yes_sub_title?: string;
  readonly status?: string;
  readonly yes_bid_dollars?: string;
  readonly yes_ask_dollars?: string;
  readonly last_price_dollars?: string;
}

interface KalshiMarketsListResponse {
  readonly markets?: readonly KalshiMarketRaw[];
}
interface KalshiMarketDetailResponse {
  readonly market?: KalshiMarketRaw;
}

export interface KalshiSideFairValue {
  /** Team name as Kalshi labels the YES side (e.g. "New York"). */
  readonly team: string;
  readonly ticker: string;
  /** Raw market-implied YES probability before de-vig; null if unquoted. */
  readonly rawImpliedProb: number | null;
  /** De-vigged fair probability (the two sides sum to 1); null if unquoted. */
  readonly fairProb: number | null;
}

export interface KalshiFairValue {
  readonly eventTicker: string;
  /** When this snapshot was captured (ISO). Use as the CLV "as-of" timestamp. */
  readonly capturedAt: string;
  /** Sum of raw implied probabilities — 1.0 means a perfectly balanced book. */
  readonly overround: number | null;
  readonly sides: readonly KalshiSideFairValue[];
}

export class KalshiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "KalshiError";
  }
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] as const;

/**
 * Map a game to its Kalshi event ticker.
 * Grammar (verified live): `KX<LEAGUE>GAME-<YYMMMDD><AWAY><HOME>`, e.g.
 * Game 1 New York at San Antonio on 2026-06-03 → `KXNBAGAME-26JUN03NYKSAS`.
 */
export function toKalshiEventTicker(game: KalshiGameRef): string {
  const d = new Date(game.dateUtc);
  if (Number.isNaN(d.getTime())) {
    throw new KalshiError(`Invalid game date: ${game.dateUtc}`);
  }
  const yy = String(d.getUTCFullYear()).slice(2);
  const mon = MONTHS[d.getUTCMonth()];
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const matchup = `${game.awayAbbr}${game.homeAbbr}`.toUpperCase();
  return `KX${game.league}GAME-${yy}${mon}${dd}${matchup}`;
}

/**
 * Market-implied YES probability from a quote. Prefer the bid/ask mid; fall back
 * to the last trade. Returns null when there is no live quote at all.
 */
export function impliedYesProbability(market: KalshiMarketRaw): number | null {
  const bid = Number(market.yes_bid_dollars);
  const ask = Number(market.yes_ask_dollars);
  const last = Number(market.last_price_dollars);
  if (Number.isFinite(bid) && Number.isFinite(ask) && (bid > 0 || ask > 0)) {
    return (bid + ask) / 2;
  }
  if (Number.isFinite(last) && last > 0) return last;
  return null;
}

/**
 * De-vig two raw YES implied probabilities by normalising them to sum to 1,
 * removing the (tiny, on an exchange) overround. Returns the fair probabilities
 * plus the overround. If either side is unpriced, fair values are null.
 */
export function devigTwoSided(
  rawA: number | null,
  rawB: number | null,
): { fairA: number | null; fairB: number | null; overround: number | null } {
  if (rawA == null || rawB == null) {
    return { fairA: null, fairB: null, overround: rawA != null && rawB != null ? rawA + rawB : null };
  }
  const overround = rawA + rawB;
  if (overround <= 0) return { fairA: null, fairB: null, overround };
  return { fairA: rawA / overround, fairB: rawB / overround, overround };
}

interface KalshiClientOptions {
  readonly maxRetries?: number;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
  readonly jitterRatio?: number;
  readonly random?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
  /** Injectable clock so snapshots are deterministic in tests. */
  readonly now?: () => Date;
}

const DEFAULTS = {
  maxRetries: 2,
  baseDelayMs: 250,
  maxDelayMs: 2_000,
  jitterRatio: 0.35,
  random: Math.random,
  sleep: (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  now: () => new Date(),
};

function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

/**
 * Read-only client for Kalshi public market data. No credentials: the endpoints
 * used require none, and the client exposes no order/portfolio methods.
 */
export class KalshiClient {
  private readonly opts: Required<KalshiClientOptions>;

  constructor(options: KalshiClientOptions = {}) {
    this.opts = {
      maxRetries: options.maxRetries ?? DEFAULTS.maxRetries,
      baseDelayMs: options.baseDelayMs ?? DEFAULTS.baseDelayMs,
      maxDelayMs: options.maxDelayMs ?? DEFAULTS.maxDelayMs,
      jitterRatio: options.jitterRatio ?? DEFAULTS.jitterRatio,
      random: options.random ?? DEFAULTS.random,
      sleep: options.sleep ?? DEFAULTS.sleep,
      now: options.now ?? DEFAULTS.now,
    };
  }

  private async get<T>(path: string): Promise<T> {
    let response: Response | null = null;

    for (let attempt = 0; attempt <= this.opts.maxRetries; attempt++) {
      try {
        response = await globalThis.fetch(`${KALSHI_BASE_URL}${path}`, {
          headers: { accept: "application/json" },
          signal: AbortSignal.timeout(KALSHI_TIMEOUT_MS),
        });
      } catch (err) {
        const name = err instanceof Error ? err.name : "";
        if (name === "TimeoutError" || name === "AbortError") {
          throw new KalshiError(`Kalshi request timed out after ${KALSHI_TIMEOUT_MS}ms`, 408);
        }
        throw new KalshiError(
          `Kalshi request failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      if (!isRetryableStatus(response.status) || attempt === this.opts.maxRetries) break;

      const exp = Math.min(this.opts.baseDelayMs * 2 ** attempt, this.opts.maxDelayMs);
      const jitter = Math.round(exp * this.opts.jitterRatio * this.opts.random());
      await this.opts.sleep(exp + jitter);
    }

    if (!response) throw new KalshiError("Kalshi request failed before a response was received");
    if (!response.ok) {
      const body = await response.text();
      throw new KalshiError(`Kalshi error: ${response.status} — ${body}`, response.status);
    }
    return (await response.json()) as T;
  }

  /** List the markets (one per outcome) for an event ticker. Read-only. */
  async getEventMarkets(eventTicker: string): Promise<readonly KalshiMarketRaw[]> {
    const res = await this.get<KalshiMarketsListResponse>(
      `/markets?event_ticker=${encodeURIComponent(eventTicker)}&limit=10`,
    );
    return res.markets ?? [];
  }

  /** Fetch one market's full quote (`*_dollars` fields live on the detail object). */
  private async getMarket(ticker: string): Promise<KalshiMarketRaw | null> {
    const res = await this.get<KalshiMarketDetailResponse>(`/markets/${encodeURIComponent(ticker)}`);
    return res.market ?? null;
  }

  /**
   * Compute a de-vigged fair-value snapshot for a game. Maps the game to its
   * Kalshi event ticker, reads both outcome markets, and returns each side's
   * fair win probability. Returns null `fairProb`s when the market is unquoted
   * (no Kalshi coverage / no liquidity yet) — a supplementary signal, never a
   * sole source (honesty doctrine: never overclaim from a thin market).
   */
  async getFairValue(game: KalshiGameRef): Promise<KalshiFairValue> {
    const eventTicker = toKalshiEventTicker(game);
    const listed = await this.getEventMarkets(eventTicker);

    const detailed: KalshiMarketRaw[] = [];
    for (const m of listed) {
      const full = (await this.getMarket(m.ticker)) ?? m;
      detailed.push(full);
    }

    const raws = detailed.map((m) => impliedYesProbability(m));
    const { fairA, fairB, overround } =
      detailed.length >= 2
        ? devigTwoSided(raws[0] ?? null, raws[1] ?? null)
        : { fairA: null, fairB: null, overround: raws[0] ?? null };
    const fairs = [fairA, fairB];

    const sides: KalshiSideFairValue[] = detailed.map((m, i) => ({
      team: m.yes_sub_title ?? m.ticker,
      ticker: m.ticker,
      rawImpliedProb: raws[i] ?? null,
      fairProb: i < 2 ? (fairs[i] ?? null) : null,
    }));

    return {
      eventTicker,
      capturedAt: this.opts.now().toISOString(),
      overround: overround ?? null,
      sides,
    };
  }
}

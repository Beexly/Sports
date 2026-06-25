import type {
  OddsApiEvent,
  OddsApiSport,
  OddsApiScore,
} from "@sports/types";
import {
  ODDS_API_BASE_URL,
  ODDS_API_TIMEOUT_MS,
  ODDS_REGION,
  ODDS_FORMAT,
  type Market,
  type SupportedSportKey,
} from "./config.js";

export class OddsApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly remainingRequests?: number
  ) {
    super(message);
    this.name = "OddsApiError";
  }
}

export interface OddsApiFetchResult<T> {
  data: T;
  remainingRequests: number;
  usedRequests: number;
}

/**
 * Envelope returned by the historical odds endpoint. `data` is the slate at `timestamp`
 * (the nearest snapshot the API has to the requested time); `previous_timestamp` /
 * `next_timestamp` let a caller walk the movement series. Historical calls cost 10x a
 * current-odds call (markets × regions × 10) — budget accordingly.
 */
export interface HistoricalOddsSnapshot {
  readonly timestamp: string;
  readonly previous_timestamp: string | null;
  readonly next_timestamp: string | null;
  readonly data: OddsApiEvent[];
}

interface OddsApiRetryOptions {
  readonly maxRetries?: number;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
  readonly jitterRatio?: number;
  readonly random?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
}

interface ResolvedRetryOptions {
  readonly maxRetries: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly jitterRatio: number;
  readonly random: () => number;
  readonly sleep: (ms: number) => Promise<void>;
}

const DEFAULT_RETRY_OPTIONS: ResolvedRetryOptions = {
  maxRetries: 2,
  baseDelayMs: 250,
  maxDelayMs: 2_000,
  jitterRatio: 0.35,
  random: Math.random,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

function resolveRetryOptions(options: OddsApiRetryOptions = {}): ResolvedRetryOptions {
  return {
    maxRetries: options.maxRetries ?? DEFAULT_RETRY_OPTIONS.maxRetries,
    baseDelayMs: options.baseDelayMs ?? DEFAULT_RETRY_OPTIONS.baseDelayMs,
    maxDelayMs: options.maxDelayMs ?? DEFAULT_RETRY_OPTIONS.maxDelayMs,
    jitterRatio: options.jitterRatio ?? DEFAULT_RETRY_OPTIONS.jitterRatio,
    random: options.random ?? DEFAULT_RETRY_OPTIONS.random,
    sleep: options.sleep ?? DEFAULT_RETRY_OPTIONS.sleep,
  };
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

function retryAfterMs(response: Response): number | null {
  const header = response.headers.get("retry-after");
  if (!header) return null;

  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1_000);
  }

  const date = Date.parse(header);
  if (Number.isNaN(date)) return null;
  return Math.max(0, date - Date.now());
}

function computeRetryDelayMs(
  attemptIndex: number,
  response: Response,
  options: ResolvedRetryOptions
): number {
  const exponentialDelay = Math.min(
    options.baseDelayMs * 2 ** attemptIndex,
    options.maxDelayMs
  );
  const jitter = Math.round(exponentialDelay * options.jitterRatio * options.random());
  const retryAfter = retryAfterMs(response);
  return Math.max(retryAfter ?? 0, exponentialDelay + jitter);
}

export class OddsApiClient {
  private readonly apiKey: string;
  private readonly retryOptions: ResolvedRetryOptions;

  constructor(apiKey: string, retryOptions?: OddsApiRetryOptions) {
    if (!apiKey) {
      throw new Error("THE_ODDS_API_KEY is required");
    }
    this.apiKey = apiKey;
    this.retryOptions = resolveRetryOptions(retryOptions);
  }

  private async fetch<T>(
    path: string,
    params: Record<string, string> = {}
  ): Promise<OddsApiFetchResult<T>> {
    const url = new URL(`${ODDS_API_BASE_URL}${path}`);
    url.searchParams.set("apiKey", this.apiKey);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    let response: Response | null = null;

    for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
      try {
        response = await globalThis.fetch(url.toString(), {
          signal: AbortSignal.timeout(ODDS_API_TIMEOUT_MS),
        });
      } catch (err) {
        const name = err instanceof Error ? err.name : "";
        if (name === "TimeoutError" || name === "AbortError") {
          throw new OddsApiError(
            `The Odds API request timed out after ${ODDS_API_TIMEOUT_MS}ms`,
            408
          );
        }
        throw new OddsApiError(
          `The Odds API request failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }

      if (!isRetryableStatus(response.status) || attempt === this.retryOptions.maxRetries) {
        break;
      }

      const delayMs = computeRetryDelayMs(attempt, response, this.retryOptions);
      await this.retryOptions.sleep(delayMs);
    }

    if (!response) {
      throw new OddsApiError("The Odds API request failed before a response was received");
    }

    const remainingRequests = parseInt(
      response.headers.get("x-requests-remaining") ?? "0",
      10
    );
    const usedRequests = parseInt(
      response.headers.get("x-requests-used") ?? "0",
      10
    );

    if (!response.ok) {
      const body = await response.text();
      throw new OddsApiError(
        `The Odds API error: ${response.status} — ${body}`,
        response.status,
        remainingRequests
      );
    }

    const data = (await response.json()) as T;
    return { data, remainingRequests, usedRequests };
  }

  async getSports(): Promise<OddsApiFetchResult<OddsApiSport[]>> {
    return this.fetch<OddsApiSport[]>("/sports", { all: "false" });
  }

  async getOdds(
    sportKey: SupportedSportKey,
    markets: Market[]
  ): Promise<OddsApiFetchResult<OddsApiEvent[]>> {
    return this.fetch<OddsApiEvent[]>(`/sports/${sportKey}/odds`, {
      regions: ODDS_REGION,
      markets: markets.join(","),
      oddsFormat: ODDS_FORMAT,
      dateFormat: "iso",
    });
  }

  async getScores(
    sportKey: SupportedSportKey,
    daysFrom: number = 1
  ): Promise<OddsApiFetchResult<OddsApiScore[]>> {
    return this.fetch<OddsApiScore[]>(`/sports/${sportKey}/scores`, {
      daysFrom: daysFrom.toString(),
      dateFormat: "iso",
    });
  }

  async getEvents(
    sportKey: SupportedSportKey
  ): Promise<OddsApiFetchResult<OddsApiEvent[]>> {
    return this.fetch<OddsApiEvent[]>(`/sports/${sportKey}/events`, {
      dateFormat: "iso",
    });
  }

  /**
   * Historical odds snapshot of the whole slate at (or nearest to) `isoTimestamp`.
   * Used to reconstruct opening->closing line movement for CLV analysis. Costs 10x a
   * current-odds request (markets × regions × 10). Available on paid plans only.
   */
  async getHistoricalOdds(
    sportKey: SupportedSportKey,
    markets: Market[],
    isoTimestamp: string
  ): Promise<OddsApiFetchResult<HistoricalOddsSnapshot>> {
    return this.fetch<HistoricalOddsSnapshot>(`/historical/sports/${sportKey}/odds`, {
      regions: ODDS_REGION,
      markets: markets.join(","),
      oddsFormat: ODDS_FORMAT,
      dateFormat: "iso",
      date: isoTimestamp,
    });
  }
}

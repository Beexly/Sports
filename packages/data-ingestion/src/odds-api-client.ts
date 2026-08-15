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
import { noStoreFetch } from "./no-store-fetch.js";
import {
  getOddsPaymentCircuitBreaker,
  type OddsPaymentCircuitBreaker,
} from "./odds-api-circuit-breaker.js";

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
  private readonly circuitBreaker: OddsPaymentCircuitBreaker;

  constructor(
    apiKey: string,
    retryOptions?: OddsApiRetryOptions,
    circuitBreaker?: OddsPaymentCircuitBreaker,
  ) {
    if (!apiKey) {
      throw new Error("THE_ODDS_API_KEY is required");
    }
    this.apiKey = apiKey;
    this.retryOptions = resolveRetryOptions(retryOptions);
    this.circuitBreaker = circuitBreaker ?? getOddsPaymentCircuitBreaker();
  }

  /**
   * Build the request URL. api.the-odds-api.com authenticates via an
   * `apiKey` query parameter — it does not accept a header. A prior change
   * moved auth to an `X-API-Key` header on the (different) odds-api/odds-api
   * project's say-so; against the real vendor that returns
   * `401 {"error_code":"MISSING_KEY"}` on every request. Confirmed live
   * 2026-08-15. Reverted to query-param auth.
   */
  private buildUrl(path: string, params: Record<string, string> = {}): URL {
    const url = new URL(`${ODDS_API_BASE_URL}${path}`);
    url.searchParams.set("apiKey", this.apiKey);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return url;
  }

  private async fetch<T>(
    path: string,
    params: Record<string, string> = {}
  ): Promise<OddsApiFetchResult<T>> {
    const url = this.buildUrl(path, params);

    // Payment circuit: fail closed on prior 402 without burning more upstream calls.
    const circuit = this.circuitBreaker.tryAcquire();
    if (!circuit.allowed) {
      // The status must say what actually happened. Every refusal used to be
      // thrown as 402, and odds-provider-adapter classifies 401/402/403 as
      // `paymentOrAuth` — so a purely LOCAL concurrency refusal (one half-open
      // probe already out) was reported as "provider payment failure". That
      // tells an operator their card failed when upstream has said nothing at
      // all, and it is the kind of confident-but-wrong diagnosis this product
      // exists to not make.
      //
      // 402 is reserved for the case upstream really did drive: the circuit
      // opened on a genuine 402/401. A probe-concurrency refusal is 429 (a
      // local rate/concurrency limit), and an operator's own kill switch is
      // 503 (we are deliberately unavailable, not unpaid).
      const status =
        circuit.cause === "probe_in_flight"
          ? 429
          : circuit.cause === "operator_forced_open"
            ? 503
            : 402;
      throw new OddsApiError(
        circuit.reason ?? "Odds API payment circuit open — refusing to call upstream",
        status,
      );
    }

    // A half-open probe holds an exclusive slot that ONLY recordSuccess /
    // recordPaymentRequired release. Every other exit from this method — a
    // timeout, a network error, a 500, a JSON parse failure — must hand the
    // slot back, or the circuit wedges half-open forever and refuses every
    // later call for the life of the process, even once payment is restored.
    //
    // Released ONLY by the acquirer. This `finally` previously ran for every
    // request that got past tryAcquire, including closed-circuit ones that
    // never held a probe — so an ordinary concurrent request could clear a
    // slot belonging to a real in-flight probe and let a second probe through,
    // defeating the one-probe-at-a-time rule the half-open state exists to
    // enforce. `acquiredProbe` makes ownership explicit rather than inferred.
    try {
      return await this.fetchWithinCircuit<T>(url);
    } finally {
      if (circuit.acquiredProbe) this.circuitBreaker.releaseProbe();
    }
  }

  /** The actual request path. Circuit acquisition/release is the caller's job. */
  private async fetchWithinCircuit<T>(url: URL): Promise<OddsApiFetchResult<T>> {

    let response: Response | null = null;

    for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
      try {
        // noStoreFetch: odds/scores MUST bypass Next's Data Cache — a cached
        // quota header + frozen bookmaker timestamps took the whole pipeline
        // down on 2026-07-10 (see no-store-fetch.ts).
        // GSE-SEC-028: API key sent via X-API-Key header, NOT in the query string.
        response = await noStoreFetch(url.toString(), {
          signal: AbortSignal.timeout(ODDS_API_TIMEOUT_MS),
          headers: { "X-API-Key": this.apiKey },
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

      // GSE-SEC-041: a 429 (rate-limited / quota exhausted) is a signal to STOP,
      // not a retryable transient error. Each retry on 429 spends another credit
      // against a depleted quota, compounding the over-spend. Break immediately
      // and throw the 429 out so callers see a rate-limited result.
      if (response.status === 429) {
        break;
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
      if (response.status === 402 || response.status === 401) {
        this.circuitBreaker.recordPaymentRequired(
          response.status === 402 ? body : `HTTP 401: ${body}`,
        );
      }
      throw new OddsApiError(
        `The Odds API error: ${response.status} — ${body}`,
        response.status,
        remainingRequests
      );
    }

    this.circuitBreaker.recordSuccess();
    const data = (await response.json()) as T;
    return { data, remainingRequests, usedRequests };
  }

  async getSports(): Promise<OddsApiFetchResult<OddsApiSport[]>> {
    return this.fetch<OddsApiSport[]>("/sports", { all: "false" });
  }

  async getOdds(
    sportKey: SupportedSportKey,
    markets: Market[],
    // Optional override of the default US-region request — e.g. the Pinnacle
    // closing-line leg (packages/ingestion-pipeline/src/pinnacle-line-archive.ts)
    // passes { regions: "eu", bookmakers: ["pinnacle"] }. Omitted entirely (every
    // call site before that leg existed), this produces the exact same request
    // as before: regions=ODDS_REGION, no bookmakers filter.
    options?: { regions?: string; bookmakers?: readonly string[] }
  ): Promise<OddsApiFetchResult<OddsApiEvent[]>> {
    const params: Record<string, string> = {
      regions: options?.regions ?? ODDS_REGION,
      markets: markets.join(","),
      oddsFormat: ODDS_FORMAT,
      dateFormat: "iso",
    };
    // The Odds API: `bookmakers` takes precedence over `regions` for book
    // selection when both are present; `regions` is left set above regardless
    // (harmless, and keeps the request shape uniform).
    if (options?.bookmakers && options.bookmakers.length > 0) {
      params["bookmakers"] = options.bookmakers.join(",");
    }
    return this.fetch<OddsApiEvent[]>(`/sports/${sportKey}/odds`, params);
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
}

import type {
  OddsApiEvent,
  OddsApiSport,
  OddsApiScore,
} from "@sports/types";
import {
  ODDS_API_BASE_URL,
  ODDS_REGION,
  ODDS_FORMAT,
  type Market,
  type SupportedSportKey,
} from "./config.js";
import {
  classifyProviderError,
  PROVIDER_JOB_STATUS,
  type ProviderJobStatus,
  type HeaderLike,
} from "./provider-status.js";

export class OddsApiError extends Error {
  /**
   * The classified job-truth status for this failure (PROVIDER_AUTH_FAILED,
   * PROVIDER_QUOTA_EXHAUSTED, PROVIDER_RATE_LIMITED, PROVIDER_UNAVAILABLE, …).
   * Always populated so callers can record it without re-deriving — this is
   * the signal the cron job-truth contract keys off of.
   */
  public readonly providerStatus: ProviderJobStatus;

  constructor(
    message: string,
    public readonly status?: number,
    public readonly remainingRequests?: number,
    providerStatus?: ProviderJobStatus,
    headers?: HeaderLike
  ) {
    super(message);
    this.name = "OddsApiError";
    this.providerStatus =
      providerStatus ??
      classifyProviderError({ status: status ?? null, headers });
  }
}

/**
 * Best-effort extraction of the classified provider status from any caught
 * error. An `OddsApiError` carries it directly; a raw fetch/network failure is
 * classified on the spot; anything else is UNKNOWN.
 */
export function providerStatusFromError(error: unknown): ProviderJobStatus {
  if (error instanceof OddsApiError) return error.providerStatus;
  // Network/timeout failures never reach OddsApiError (the throw is below the
  // `response.ok` check), so classify them from the raw error here.
  const classified = classifyProviderError({ status: null, error });
  return classified === PROVIDER_JOB_STATUS.UNKNOWN
    ? PROVIDER_JOB_STATUS.UNKNOWN
    : classified;
}

export interface OddsApiFetchResult<T> {
  data: T;
  remainingRequests: number;
  usedRequests: number;
}

export class OddsApiClient {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("THE_ODDS_API_KEY is required");
    }
    this.apiKey = apiKey;
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

    const response = await globalThis.fetch(url.toString());

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
        remainingRequests,
        // Classify here so the headers (rate-limit vs quota) are available;
        // the constructor would otherwise only see the status code.
        classifyProviderError({ status: response.status, headers: response.headers }),
        response.headers
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
}

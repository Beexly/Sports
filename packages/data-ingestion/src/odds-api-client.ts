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
}

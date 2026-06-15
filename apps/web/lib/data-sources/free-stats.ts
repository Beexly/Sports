/**
 * Free-stats facade — one typed, CACHED entrypoint over the free adapters.
 *
 * The rest of the app should read free stats through here, not by calling adapters
 * directly. The TTL cache protects the free sources' rate limits (ESPN public,
 * Open-Meteo are free tiers — hammering them risks an IP block) and avoids redundant
 * fetches. Every result carries provenance + attribution.
 *
 * Cache + clock are injectable so the facade is fully testable without network or time.
 */

import { fetchEspnScoreboard, type NormalizedGame } from "./free-adapters/espn-scores";
import { fetchEspnRankings, type RankingPoll } from "./free-adapters/espn-rankings";
import { fetchEspnStandings, type Standings } from "./free-adapters/espn-standings";
import { fetchWeather, type WeatherResult } from "./free-adapters/open-meteo";
import type { Sport } from "./source-router";

export type Clock = () => number;

type CacheEntry<T> = { readonly value: T; readonly expiresAt: number };

export type FreeStatsResult<T> = {
  readonly data: T;
  readonly sourceId: string;
  readonly cached: boolean;
  readonly fetchedAt: number;
};

/** TTLs (ms): scores churn fast; standings/rankings/weather are slower. */
export const TTL = {
  scores: 60_000,
  rankings: 6 * 60 * 60_000,
  standings: 60 * 60_000,
  weather: 60 * 60_000,
} as const;

export type FreeStatsOptions = {
  readonly fetchImpl?: typeof fetch;
  readonly clock?: Clock;
  readonly timeoutMs?: number;
};

export class FreeStats {
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly clock: Clock;
  private readonly fetchImpl?: typeof fetch;
  private readonly timeoutMs?: number;

  constructor(opts: FreeStatsOptions = {}) {
    this.clock = opts.clock ?? Date.now;
    this.fetchImpl = opts.fetchImpl;
    this.timeoutMs = opts.timeoutMs;
  }

  private async memoize<T>(key: string, ttl: number, load: () => Promise<T>): Promise<{ value: T; cached: boolean }> {
    const now = this.clock();
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > now) {
      return { value: hit.value as T, cached: true };
    }
    const value = await load();
    this.cache.set(key, { value, expiresAt: now + ttl });
    return { value, cached: false };
  }

  private opts() {
    return { fetchImpl: this.fetchImpl, timeoutMs: this.timeoutMs };
  }

  async scores(sport: Sport): Promise<FreeStatsResult<readonly NormalizedGame[]>> {
    const { value, cached } = await this.memoize(`scores:${sport}`, TTL.scores, () =>
      fetchEspnScoreboard(sport, this.opts()),
    );
    return { data: value, sourceId: "espn-public-api", cached, fetchedAt: this.clock() };
  }

  async rankings(sport: Sport): Promise<FreeStatsResult<readonly RankingPoll[]>> {
    const { value, cached } = await this.memoize(`rankings:${sport}`, TTL.rankings, () =>
      fetchEspnRankings(sport, this.opts()),
    );
    return { data: value, sourceId: "espn-public-api", cached, fetchedAt: this.clock() };
  }

  async standings(sport: Sport): Promise<FreeStatsResult<Standings>> {
    const { value, cached } = await this.memoize(`standings:${sport}`, TTL.standings, () =>
      fetchEspnStandings(sport, this.opts()),
    );
    return { data: value, sourceId: "espn-public-api", cached, fetchedAt: this.clock() };
  }

  async weather(latitude: number, longitude: number): Promise<FreeStatsResult<WeatherResult>> {
    const key = `weather:${latitude.toFixed(3)},${longitude.toFixed(3)}`;
    const { value, cached } = await this.memoize(key, TTL.weather, () =>
      fetchWeather(latitude, longitude, this.opts()),
    );
    return { data: value, sourceId: "open-meteo", cached, fetchedAt: this.clock() };
  }

  /** Test/ops helper. */
  clear(): void {
    this.cache.clear();
  }
}

/** Shared process-wide instance for app use. */
export const freeStats = new FreeStats();

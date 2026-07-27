/**
 * Odds quote provider adapter — concrete OddsProvider implementations.
 *
 * Builds on `odds-failover.ts` (`OddsProvider` / `OddsProviderResult`) so the
 * gate and Prisma `Odds` shape stay provider-agnostic.
 *
 * Design rules:
 *   - Missing/unpaid API key → OfflineOddsProvider (healthy=false, odds=[]).
 *     Never invent prices; never mark healthy when certifiable quotes are absent.
 *   - The Odds API → TheOddsApiOddsProvider (normalize via DataNormalizer).
 *   - LIVE_BOARD / selective-gate are NOT touched here. Offline provider is
 *     explicitly NOT certifiable for live gate FIRE.
 *   - No scrape-based providers in this module (too volatile for honesty thesis).
 */

import type { NormalizedOdds, OddsApiEvent } from "@sports/types";
import { OddsApiClient, OddsApiError } from "./odds-api-client.js";
import { DataNormalizer } from "./normalizer.js";
import type { Market, SupportedSportKey } from "./config.js";
import { MARKETS } from "./config.js";
import type { OddsProvider, OddsProviderResult } from "./odds-failover.js";

export type OddsProviderId = "the-odds-api" | "offline";

export interface OddsProviderCapabilities {
  /** True when the source can return multiple independent bookmakers. */
  readonly multiBook: boolean;
  readonly markets: readonly ("H2H" | "SPREADS" | "TOTALS")[];
  readonly supportsLiveQuotes: boolean;
  /**
   * When false, product must not treat rows from this provider alone as
   * sufficient for LIVE_BOARD FIRE (offline / demo / scores-only).
   */
  readonly certifiableForLiveGate: boolean;
}

export interface OddsProviderHealth {
  readonly available: boolean;
  readonly reason?: string;
  readonly statusCode?: number;
  readonly remainingCredits?: number;
}

/** Extended provider: OddsProvider + identity/capabilities for registry use. */
export interface OddsQuoteProvider extends OddsProvider {
  readonly id: OddsProviderId;
  readonly capabilities: OddsProviderCapabilities;
  /** Optional cheap readiness check (no full sport fetch). */
  probe?(): Promise<OddsProviderHealth>;
}

const LIVE_CAPABILITIES: OddsProviderCapabilities = {
  multiBook: true,
  markets: ["H2H", "SPREADS", "TOTALS"],
  supportsLiveQuotes: true,
  certifiableForLiveGate: true,
};

const OFFLINE_CAPABILITIES: OddsProviderCapabilities = {
  multiBook: false,
  markets: [],
  supportsLiveQuotes: false,
  certifiableForLiveGate: false,
};

/**
 * Soft-fail provider: always returns unhealthy empty odds with an explicit reason.
 * Use when the key is missing, unpaid, or ODDS_PROVIDER=offline.
 */
export class OfflineOddsProvider implements OddsQuoteProvider {
  readonly id = "offline" as const;
  readonly name = "offline";
  readonly capabilities = OFFLINE_CAPABILITIES;

  constructor(
    private readonly reason: string = "odds provider offline — refusing to invent quotes",
  ) {}

  async fetchNormalized(sportKey: string): Promise<OddsProviderResult> {
    return {
      provider: this.name,
      odds: [],
      healthy: false,
      error: `${this.reason} (sport=${sportKey})`,
    };
  }

  async probe(): Promise<OddsProviderHealth> {
    return { available: false, reason: this.reason };
  }
}

export interface TheOddsApiOddsProviderOptions {
  readonly markets?: readonly Market[];
  readonly regions?: string;
  readonly normalizer?: DataNormalizer;
  readonly client?: OddsApiClient;
  /** Injected clock for tests. */
  readonly now?: () => Date;
}

/**
 * Primary production adapter: The Odds API → NormalizedOdds via DataNormalizer.
 */
export class TheOddsApiOddsProvider implements OddsQuoteProvider {
  readonly id = "the-odds-api" as const;
  readonly name = "the-odds-api";
  readonly capabilities = LIVE_CAPABILITIES;

  private readonly client: OddsApiClient;
  private readonly normalizer: DataNormalizer;
  private readonly markets: readonly Market[];
  private readonly regions?: string;
  private readonly now: () => Date;

  constructor(apiKey: string, options: TheOddsApiOddsProviderOptions = {}) {
    this.client = options.client ?? new OddsApiClient(apiKey);
    this.normalizer = options.normalizer ?? new DataNormalizer();
    this.markets = options.markets ?? [...MARKETS];
    this.regions = options.regions;
    this.now = options.now ?? (() => new Date());
  }

  async fetchNormalized(sportKey: string): Promise<OddsProviderResult> {
    const fetchedAt = this.now();
    try {
      const { data: events, remainingRequests } = await this.client.getOdds(
        sportKey as SupportedSportKey,
        [...this.markets],
        this.regions ? { regions: this.regions } : undefined,
      );

      if (!this.normalizer.validateFreshness(fetchedAt)) {
        return {
          provider: this.name,
          odds: [],
          healthy: false,
          error: `freshness validation failed at fetch (remaining=${remainingRequests})`,
        };
      }

      const odds: NormalizedOdds[] = this.normalizer.normalizeOdds(
        events as OddsApiEvent[],
        fetchedAt,
      );

      return {
        provider: this.name,
        odds,
        healthy: true,
      };
    } catch (err) {
      const status = err instanceof OddsApiError ? err.status : undefined;
      const remaining =
        err instanceof OddsApiError ? err.remainingRequests : undefined;
      const message = err instanceof Error ? err.message : String(err);
      // 401/402/403 → treat as offline-class failure (auth/payment).
      const paymentOrAuth =
        status === 401 || status === 402 || status === 403;
      return {
        provider: this.name,
        odds: [],
        healthy: false,
        error: paymentOrAuth
          ? `provider auth/payment failure (${status}): ${message}`
          : message,
      };
    }
  }

  async probe(): Promise<OddsProviderHealth> {
    try {
      const { remainingRequests } = await this.client.getSports();
      return {
        available: true,
        remainingCredits: remainingRequests,
      };
    } catch (err) {
      const status = err instanceof OddsApiError ? err.status : undefined;
      return {
        available: false,
        statusCode: status,
        reason: err instanceof Error ? err.message : String(err),
        remainingCredits:
          err instanceof OddsApiError ? err.remainingRequests : undefined,
      };
    }
  }
}

export interface CreateOddsQuoteProviderOptions {
  readonly env?: Record<string, string | undefined>;
  /** Test seam for The Odds API client. */
  readonly theOddsApiOptions?: TheOddsApiOddsProviderOptions;
}

/**
 * Resolve the active quote provider from env.
 *
 *   ODDS_PROVIDER=offline           → OfflineOddsProvider
 *   THE_ODDS_API_KEY missing/empty  → OfflineOddsProvider
 *   otherwise                       → TheOddsApiOddsProvider
 */
export function createOddsQuoteProvider(
  options: CreateOddsQuoteProviderOptions = {},
): OddsQuoteProvider {
  const env = options.env ?? process.env;
  const mode = (env["ODDS_PROVIDER"] ?? "the-odds-api").trim().toLowerCase();

  if (mode === "offline") {
    return new OfflineOddsProvider("ODDS_PROVIDER=offline");
  }

  const key = env["THE_ODDS_API_KEY"]?.trim() ?? "";
  if (!key) {
    return new OfflineOddsProvider(
      "THE_ODDS_API_KEY missing — refusing to invent quotes",
    );
  }

  return new TheOddsApiOddsProvider(key, options.theOddsApiOptions);
}

/** True when the provider may back live-gate certifiable quotes. */
export function isCertifiableOddsProvider(provider: OddsQuoteProvider): boolean {
  return provider.capabilities.certifiableForLiveGate === true;
}

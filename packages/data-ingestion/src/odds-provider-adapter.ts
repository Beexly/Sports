/**
 * Odds quote provider adapter — concrete OddsProvider implementations.
 *
 * Builds on `odds-failover.ts` (`OddsProvider` / `OddsProviderResult`) so the
 * gate and Prisma `Odds` shape stay provider-agnostic.
 *
 * Design rules:
 *   - The Odds API → TheOddsApiOddsProvider when THE_ODDS_API_KEY is set AND
 *     the payment circuit is not open (normalize via DataNormalizer).
 *   - Paid key missing, or the HTTP 402 payment circuit OPEN →
 *     GalaxySportsApiOddsProvider (keyless ESPN site.web.api inline odds — the
 *     Galaxy Sports API formula, "we are the provider"). Not another vendor key.
 *     Not certifiable for LIVE_BOARD FIRE. Never invents prices; healthy only
 *     when real rows came back.
 *   - ODDS_PROVIDER=offline → OfflineOddsProvider (healthy=false, odds=[]).
 *   - LIVE_BOARD / selective-gate are NOT touched here. Neither the offline nor
 *     the Galaxy provider is certifiable for live gate FIRE.
 *   - No scrape-based providers beyond the registry-gated ESPN facts path.
 */

import type { NormalizedOdds, OddsApiEvent } from "@sports/types";
import { OddsApiClient, OddsApiError } from "./odds-api-client.js";
import {
  OddsPapiClient,
  OddsPapiError,
  ODDSPAPI_NFL_SPORT_ID,
  ODDSPAPI_NFL_TOURNAMENT_ID,
  dedupeHeartbeatSnapshots,
  deriveClosingSnapshot,
  type OddsPapiHistoricalSnapshot,
} from "./oddspapi-client.js";
import {
  normalizeOddsPapiOdds,
  buildOddsPapiCatalog,
  type OddsPapiCatalog,
} from "./oddspapi-normalizer.js";
import { resolveOddsPapiKey } from "./oddspapi-key.js";
import { DataNormalizer } from "./normalizer.js";
import type { Market, SupportedSportKey } from "./config.js";
import { MARKETS } from "./config.js";
import type { OddsProvider, OddsProviderResult } from "./odds-failover.js";
import { mergeNormalizedOdds } from "./odds-failover.js";
import { fetchEspnOddsForSport } from "./espn-odds-client.js";
import { getOddsPaymentCircuitBreaker, type OddsCircuitState } from "./odds-api-circuit-breaker.js";

export type OddsProviderId = "the-odds-api" | "offline" | "galaxy-sports-api" | "oddspapi";

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
        remainingCredits: remainingRequests ?? undefined,
      };
    } catch (err) {
      const status = err instanceof OddsApiError ? err.status : undefined;
      return {
        available: false,
        statusCode: status,
        reason: err instanceof Error ? err.message : String(err),
        remainingCredits:
          err instanceof OddsApiError ? (err.remainingRequests ?? undefined) : undefined,
      };
    }
  }
}

const GALAXY_CAPABILITIES: OddsProviderCapabilities = {
  multiBook: false,
  markets: ["H2H", "SPREADS", "TOTALS"],
  supportsLiveQuotes: true,
  certifiableForLiveGate: false,
};

/**
 * Keyless Galaxy Sports API path: ESPN public scoreboard inline odds, gated by
 * the "galaxy-espn-inline" registry entry (facts only, attribution required).
 * Requires neither THE_ODDS_API_KEY nor RUNDOWN_API_KEY.
 */
export class GalaxySportsApiOddsProvider implements OddsQuoteProvider {
  readonly id = "galaxy-sports-api" as const;
  readonly name = "galaxy-sports-api";
  readonly capabilities = GALAXY_CAPABILITIES;

  constructor(
    private readonly fetchEspn: typeof fetchEspnOddsForSport = fetchEspnOddsForSport,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async fetchNormalized(sportKey: string): Promise<OddsProviderResult> {
    const espn = await this.fetchEspn(sportKey);
    const events = espn.events;
    if (events.length === 0) {
      return {
        provider: this.name,
        odds: [],
        healthy: false,
        error: espn.error ?? `galaxy-sports-api empty (sport=${sportKey})`,
      };
    }
    const normalizer = new DataNormalizer();
    const odds = normalizer.normalizeOdds(events, this.now());
    return {
      provider: this.name,
      odds,
      healthy: odds.length > 0,
      error: espn.error,
    };
  }

  async probe(): Promise<OddsProviderHealth> {
    return { available: true, reason: "galaxy-sports-api keyless ESPN inline" };
  }
}

export interface CreateOddsQuoteProviderOptions {
  readonly env?: Record<string, string | undefined>;
  /** Test seam for The Odds API client. */
  readonly theOddsApiOptions?: TheOddsApiOddsProviderOptions;
  /**
   * Payment-circuit state seam (defaults to the shared HTTP 402 breaker).
   * "open" means the paid feed refused to be called since the last 402: the
   * keyless Galaxy path is selected so the board does not go dark while the
   * paid key is unusable (WP-27 step 2).
   */
  readonly paidCircuitState?: () => OddsCircuitState;
}

/**
 * Resolve the active quote provider from env.
 *
 *   ODDS_PROVIDER=offline                       → OfflineOddsProvider
 *   THE_ODDS_API_KEY present, circuit not open  → TheOddsApiOddsProvider
 *   otherwise (key absent, or 402 circuit open) → GalaxySportsApiOddsProvider
 *                                                 (keyless; no Rundown key)
 */
export function createOddsQuoteProvider(
  options: CreateOddsQuoteProviderOptions = {},
): OddsQuoteProvider {
  const env = options.env ?? process.env;
  const mode = (env["ODDS_PROVIDER"] ?? "").trim().toLowerCase();

  if (mode === "offline") {
    return new OfflineOddsProvider("ODDS_PROVIDER=offline");
  }

  const key = env["THE_ODDS_API_KEY"]?.trim() ?? "";
  if (key) {
    const circuitState = (options.paidCircuitState ?? (() => getOddsPaymentCircuitBreaker().getState()))();
    if (circuitState !== "open") {
      return new TheOddsApiOddsProvider(key, options.theOddsApiOptions);
    }
  }

  return new GalaxySportsApiOddsProvider();
}

/** True when the provider may back live-gate certifiable quotes. */
export function isCertifiableOddsProvider(provider: OddsQuoteProvider): boolean {
  return provider.capabilities.certifiableForLiveGate === true;
}

/* ------------------------------------------------------------------ */
/* OddsPapi secondary provider (55 Tech, oddspapi.io)                  */
/* ------------------------------------------------------------------ */

const ODDSPAPI_CAPABILITIES: OddsProviderCapabilities = {
  multiBook: true,
  markets: ["H2H", "SPREADS", "TOTALS"],
  supportsLiveQuotes: true,
  // CONFIRMED at https://oddspapi.io/en/legal/terms (2026-09-18): terms forbid
  // reselling / repackaging / redistributing the data as a standalone product.
  // Internal analytics (CLV reconstruction, prop discovery, disagreement
  // checks) is fine; public display of OddsPapi-derived quotes needs a legal
  // read first — so this provider is NOT certifiable for the live gate yet.
  certifiableForLiveGate: false,
};

/**
 * GSE sportKey → OddsPapi IDs. NFL is the only sport wired today
 * (sportId 14 / tournamentId 31, CONFIRMED 2026-09-18). NCAA tournamentId
 * 27653 is a future option once the mapping is verified live.
 */
const ODDSPAPI_SPORT_MAP: Record<string, { sportId: number; tournamentId: number }> = {
  americanfootball_nfl: {
    sportId: ODDSPAPI_NFL_SPORT_ID,
    tournamentId: ODDSPAPI_NFL_TOURNAMENT_ID,
  },
};

const ODDSPAPI_CATALOG_TTL_MS = 24 * 60 * 60 * 1000;

export interface OddsPapiOddsProviderOptions {
  readonly client?: OddsPapiClient;
  /**
   * Bookmaker slugs to request per fixture. Default ["pinnacle"] — the sharp
   * reference. Slug names beyond "pinnacle" are UNVERIFIED against the live
   * /v4/bookmakers list; add more only after verifying slugs live.
   */
  readonly bookmakers?: readonly string[];
  /**
   * Cap on fixtures per fetch. Each fixture costs 1 billable /odds call (the
   * /fixtures list and /markets catalog cost 1 each); the free tier is 250/mo
   * (~8/day), so the default 3 keeps one fetch at ~5 calls.
   */
  readonly maxFixturesPerFetch?: number;
  readonly tournamentId?: number;
  /** Injected clock for tests. */
  readonly now?: () => Date;
}

/**
 * Secondary odds adapter: OddsPapi → NormalizedOdds (game lines only).
 *
 * GSE role is COMPLEMENT, not replacement: The Odds API stays primary for
 * live US/NFL quotes. This provider's highest-value job is (a) historical
 * line movement + CLV reconstruction via the free unmetered
 * /v4/historical-odds endpoint (see fetchPinnacleLineMovement), and (b)
 * bookmaker breadth for disagreement checks. Pinnacle prices NFL game lines
 * only — zero props — so the NFL prop board never comes through this path.
 */
export class OddsPapiOddsProvider implements OddsQuoteProvider {
  readonly id = "oddspapi" as const;
  readonly name = "oddspapi";
  readonly capabilities = ODDSPAPI_CAPABILITIES;

  private readonly client: OddsPapiClient;
  private readonly bookmakers: readonly string[];
  private readonly maxFixturesPerFetch: number;
  private readonly tournamentIdOverride?: number;
  private readonly now: () => Date;
  private catalogCache: { readonly at: number; readonly catalog: OddsPapiCatalog } | null = null;

  constructor(apiKey: string, options: OddsPapiOddsProviderOptions = {}) {
    this.client = options.client ?? new OddsPapiClient(apiKey);
    this.bookmakers = options.bookmakers ?? ["pinnacle"];
    this.maxFixturesPerFetch = options.maxFixturesPerFetch ?? 3;
    this.tournamentIdOverride = options.tournamentId;
    this.now = options.now ?? (() => new Date());
  }

  private async getCatalog(): Promise<OddsPapiCatalog> {
    const nowMs = this.now().getTime();
    if (
      this.catalogCache &&
      nowMs - this.catalogCache.at < ODDSPAPI_CATALOG_TTL_MS
    ) {
      return this.catalogCache.catalog;
    }
    const { data } = await this.client.getMarkets();
    const catalog = buildOddsPapiCatalog(data);
    this.catalogCache = { at: nowMs, catalog };
    return catalog;
  }

  async fetchNormalized(sportKey: string): Promise<OddsProviderResult> {
    const fetchedAt = this.now();
    try {
      const mapping = ODDSPAPI_SPORT_MAP[sportKey];
      if (!mapping) {
        return {
          provider: this.name,
          odds: [],
          healthy: false,
          error: `oddspapi: unsupported sportKey "${sportKey}" (only americanfootball_nfl is wired)`,
        };
      }
      const tournamentId = this.tournamentIdOverride ?? mapping.tournamentId;
      const catalog = await this.getCatalog();
      const { data: fixtures } = await this.client.getFixtures({
        tournamentId,
        statusId: 0,
        hasOdds: true,
      });

      const odds: NormalizedOdds[] = [];
      for (const fixture of fixtures.slice(0, this.maxFixturesPerFetch)) {
        const { data: board } = await this.client.getOdds({
          fixtureId: fixture.fixtureId,
          bookmakers: [...this.bookmakers],
        });
        odds.push(...normalizeOddsPapiOdds(board, catalog, fetchedAt));
      }

      return {
        provider: this.name,
        odds,
        healthy: odds.length > 0,
        error: odds.length === 0 ? "oddspapi returned no usable game-line quotes" : undefined,
      };
    } catch (err) {
      const status = err instanceof OddsPapiError ? err.status : undefined;
      const message = err instanceof Error ? err.message : String(err);
      // 401/403 = key problem (auth class); 429 = rate-limited (stop, don't spin).
      const paymentOrAuth = status === 401 || status === 403;
      return {
        provider: this.name,
        odds: [],
        healthy: false,
        error: paymentOrAuth
          ? `oddspapi auth failure (${status}): ${message}`
          : message,
      };
    }
  }

  /**
   * Flagship free-tier job: Pinnacle line movement + closing price for one
   * fixture, via the UNMETERED /historical-odds endpoint. Heartbeats (repeated
   * identical snapshots) are deduped; the close is the last active snapshot
   * before kickoff. Returns null when the board carries no usable history.
   */
  async fetchPinnacleLineMovement(
    fixtureId: string,
    bookmakers: readonly string[] = ["pinnacle"],
  ): Promise<{
    readonly snapshots: readonly OddsPapiHistoricalSnapshot[];
    readonly closingPrice: number | null;
  } | null> {
    const { data } = await this.client.getHistoricalOdds({ fixtureId, bookmakers });
    const markets = data.bookmakers[bookmakers[0] ?? ""]?.markets;
    if (!markets) return null;
    const all: OddsPapiHistoricalSnapshot[] = [];
    for (const market of Object.values(markets)) {
      for (const outcome of Object.values(market.outcomes)) {
        for (const snaps of Object.values(outcome.players)) {
          all.push(...snaps);
        }
      }
    }
    if (all.length === 0) return null;
    const snapshots = dedupeHeartbeatSnapshots(
      [...all].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)),
    );
    return { snapshots, closingPrice: snapshots[snapshots.length - 1]?.price ?? null };
  }

  /**
   * Derive a true closing price given the fixture's kickoff: last active
   * snapshot with createdAt < startTime (snapshots may continue in-play).
   */
  deriveClose(
    snapshots: readonly OddsPapiHistoricalSnapshot[],
    startTimeIso: string,
  ): OddsPapiHistoricalSnapshot | null {
    return deriveClosingSnapshot(snapshots, startTimeIso);
  }

  async probe(): Promise<OddsProviderHealth> {
    try {
      // /account is unmetered and stays available after exhaustion — the
      // correct cheap probe for this vendor.
      const { data } = await this.client.getAccount();
      return {
        available: true,
        remainingCredits: Math.max(0, data.request_limit - data.request_count),
      };
    } catch (err) {
      const status = err instanceof OddsPapiError ? err.status : undefined;
      return {
        available: false,
        statusCode: status,
        reason: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

/**
 * Resolve the secondary (OddsPapi) provider from env. Returns null when
 * ODDSPAPI_KEY is absent — the primary path proceeds alone. Never invents a key.
 */
export function createSecondaryOddsProvider(
  options: {
    readonly env?: Record<string, string | undefined>;
    readonly oddspapiOptions?: OddsPapiOddsProviderOptions;
  } = {},
): OddsPapiOddsProvider | null {
  const env = options.env ?? process.env;
  const key = resolveOddsPapiKey(env);
  if (!key) return null;
  return new OddsPapiOddsProvider(key, options.oddspapiOptions);
}

/**
 * Dual-source fetch: primary first, secondary adds bookmakers the primary did
 * not already quote (mergeNormalizedOdds — primary wins on conflict).
 * Healthy when either side is healthy; the error only fires when BOTH failed.
 */
export async function fetchDualProviderOdds(
  primary: OddsQuoteProvider,
  secondary: OddsQuoteProvider,
  sportKey: string,
): Promise<OddsProviderResult> {
  const [p, s] = await Promise.all([
    primary.fetchNormalized(sportKey),
    secondary.fetchNormalized(sportKey),
  ]);
  const merged = mergeNormalizedOdds(p.odds, s.odds);
  const bothFailed = !p.healthy && !s.healthy;
  return {
    provider: `${p.provider}+${s.provider}`,
    odds: merged,
    healthy: p.healthy || s.healthy,
    error: bothFailed
      ? [p.error, s.error].filter(Boolean).join(" | ")
      : undefined,
  };
}

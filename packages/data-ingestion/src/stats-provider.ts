/**
 * StatsProvider — feature / context plane (NOT live-quote certifiable).
 *
 * Parallel to `odds-provider-adapter.ts` (quote plane). Stats enrich evidence,
 * GameContext, and glass-box reasoning. They MUST NOT mint sportsbook `q` or
 * alone authorize LIVE_BOARD FIRE.
 *
 * Rules:
 *   - certifiableForLiveGate is always false on this plane.
 *   - Only SOURCE_REGISTRY ingestible ids may back a real provider.
 *   - Offline / unpaid / missing config → healthy=false, features=[], explicit reason.
 *   - No scrape-as-primary providers here.
 */

import type { SignalCategory } from "@sports/types";
import {
  assertIngestible,
  attributionFor,
  getSource,
  type LegalSource,
} from "./source-registry.js";

/** Provider role tag — kept distinct from quote providers at the type level. */
export type DataPlaneRole = "stats";

export type StatsProviderId =
  | "offline"
  | "nflverse"
  | "nws-weather"
  | "retrosheet"
  | "lahman-db"
  | "moneypuck"
  | "openfootball";

export interface StatsProviderCapabilities {
  readonly role: DataPlaneRole;
  /** Always false — stats never certify live sportsbook FIRE by themselves. */
  readonly certifiableForLiveGate: false;
  readonly categories: readonly SignalCategory[];
  readonly sports: readonly string[]; // empty = multi / unspecified
  readonly requiresNetwork: boolean;
}

export interface StatsProviderHealth {
  readonly available: boolean;
  readonly reason?: string;
  readonly sourceRegistryId?: string;
  readonly attribution?: string | null;
}

/** One normalized feature row with full provenance. */
export interface StatsFeature {
  readonly providerId: StatsProviderId;
  readonly sourceRegistryId: string;
  readonly category: SignalCategory;
  readonly signalKey: string;
  /** Opaque payload; consumers interpret by signalKey. */
  readonly value: unknown;
  readonly entityKey?: string; // e.g. game external id, team name
  readonly sportKey?: string;
  readonly fetchedAt: Date;
  readonly trustLevel: number; // 0–1
  readonly sampleSize?: number | null;
  readonly attribution?: string | null;
}

export interface StatsFetchQuery {
  readonly sportKey?: string;
  readonly entityKeys?: readonly string[];
  readonly categories?: readonly SignalCategory[];
  readonly asOf?: Date;
}

export interface StatsProviderResult {
  readonly providerId: StatsProviderId;
  readonly healthy: boolean;
  readonly features: readonly StatsFeature[];
  readonly error?: string;
  readonly fetchedAt: Date;
}

export interface StatsProvider {
  readonly id: StatsProviderId;
  readonly capabilities: StatsProviderCapabilities;
  /** SOURCE_REGISTRY id when this maps to a declared source; null for offline. */
  readonly sourceRegistryId: string | null;
  probe(): Promise<StatsProviderHealth>;
  fetchFeatures(query?: StatsFetchQuery): Promise<StatsProviderResult>;
}

const OFFLINE_CAPABILITIES: StatsProviderCapabilities = {
  role: "stats",
  certifiableForLiveGate: false,
  categories: [],
  sports: [],
  requiresNetwork: false,
};

/** Soft-fail stats provider — never invents features. */
export class OfflineStatsProvider implements StatsProvider {
  readonly id = "offline" as const;
  readonly capabilities = OFFLINE_CAPABILITIES;
  readonly sourceRegistryId = null;

  constructor(
    private readonly reason: string = "stats provider offline — refusing to invent features",
  ) {}

  async probe(): Promise<StatsProviderHealth> {
    return { available: false, reason: this.reason };
  }

  async fetchFeatures(_query?: StatsFetchQuery): Promise<StatsProviderResult> {
    return {
      providerId: this.id,
      healthy: false,
      features: [],
      error: this.reason,
      fetchedAt: new Date(),
    };
  }
}

/**
 * Registry-backed shell for a cleared stats source.
 * Does not download bulk data yet — probe validates registry + returns attribution.
 * fetchFeatures returns healthy empty until a concrete fetcher is plugged in
 * (Retrosheet/Lahman/nflverse bulk jobs stay separate modules).
 */
export class RegistryStatsProvider implements StatsProvider {
  readonly id: StatsProviderId;
  readonly capabilities: StatsProviderCapabilities;
  readonly sourceRegistryId: string;
  private readonly source: LegalSource;

  constructor(
    id: StatsProviderId,
    sourceRegistryId: string,
    capabilities: StatsProviderCapabilities,
  ) {
    // Fail closed if someone wires a forbidden / paid-required id.
    this.source = assertIngestible(sourceRegistryId);
    this.id = id;
    this.sourceRegistryId = sourceRegistryId;
    this.capabilities = {
      ...capabilities,
      role: "stats",
      certifiableForLiveGate: false,
    };
  }

  async probe(): Promise<StatsProviderHealth> {
    return {
      available: true,
      sourceRegistryId: this.sourceRegistryId,
      attribution: attributionFor(this.sourceRegistryId),
      reason: `registered (${this.source.verdict}): ${this.source.reason}`,
    };
  }

  /**
   * Interface-level fetch: healthy but empty features until bulk loaders attach.
   * Downstream must treat empty healthy as "source declared, no rows this query"
   * — not as invented zeros.
   */
  async fetchFeatures(query?: StatsFetchQuery): Promise<StatsProviderResult> {
    const fetchedAt = query?.asOf ?? new Date();
    return {
      providerId: this.id,
      healthy: true,
      features: [],
      fetchedAt,
    };
  }
}

function nflverseCapabilities(): StatsProviderCapabilities {
  return {
    role: "stats",
    certifiableForLiveGate: false,
    categories: ["RATINGS", "PLAYER_AVAILABILITY", "SCHEDULE", "TEAM_RATES" as SignalCategory].filter(
      Boolean,
    ) as SignalCategory[],
    sports: ["americanfootball_nfl"],
    requiresNetwork: true,
  };
}

// TEAM_RATES may exist in SignalCategory — if not, TypeScript will fail CI.
// Prefer only categories known to exist in @sports/types.
function safeNflverseCapabilities(): StatsProviderCapabilities {
  return {
    role: "stats",
    certifiableForLiveGate: false,
    categories: ["RATINGS", "PLAYER_AVAILABILITY", "SCHEDULE"],
    sports: ["americanfootball_nfl"],
    requiresNetwork: true,
  };
}

function weatherCapabilities(): StatsProviderCapabilities {
  return {
    role: "stats",
    certifiableForLiveGate: false,
    categories: ["WEATHER", "VENUE_ENVIRONMENT"],
    sports: [],
    requiresNetwork: true,
  };
}

function mlbHistoryCapabilities(): StatsProviderCapabilities {
  return {
    role: "stats",
    certifiableForLiveGate: false,
    categories: ["RATINGS", "SCHEDULE"],
    sports: ["baseball_mlb"],
    requiresNetwork: true,
  };
}

function hockeyCapabilities(): StatsProviderCapabilities {
  return {
    role: "stats",
    certifiableForLiveGate: false,
    categories: ["RATINGS"],
    sports: ["icehockey_nhl"],
    requiresNetwork: true,
  };
}

function soccerCapabilities(): StatsProviderCapabilities {
  return {
    role: "stats",
    certifiableForLiveGate: false,
    categories: ["SCHEDULE"],
    sports: ["soccer_usa_mls"],
    requiresNetwork: true,
  };
}

export interface CreateStatsProvidersOptions {
  readonly env?: Record<string, string | undefined>;
  /** When true, only return OfflineStatsProvider. */
  readonly forceOffline?: boolean;
}

/**
 * Build the active stats provider set.
 *
 *   STATS_PROVIDER=offline → [OfflineStatsProvider]
 *   otherwise → registry-backed shells for cleared sources (empty features until loaders land)
 *
 * Never includes forbidden registry ids.
 */
export function createStatsProviders(
  options: CreateStatsProvidersOptions = {},
): StatsProvider[] {
  const env = options.env ?? process.env;
  const mode = (env["STATS_PROVIDER"] ?? "registry").trim().toLowerCase();

  if (options.forceOffline || mode === "offline") {
    return [
      new OfflineStatsProvider(
        mode === "offline"
          ? "STATS_PROVIDER=offline"
          : "stats providers forced offline",
      ),
    ];
  }

  const providers: StatsProvider[] = [];

  // Only wire sources that assertIngestible accepts today.
  const catalog: Array<{
    id: StatsProviderId;
    registryId: string;
    caps: StatsProviderCapabilities;
  }> = [
    { id: "nflverse", registryId: "nflverse", caps: safeNflverseCapabilities() },
    { id: "nws-weather", registryId: "nws-weather", caps: weatherCapabilities() },
    { id: "retrosheet", registryId: "retrosheet", caps: mlbHistoryCapabilities() },
    { id: "lahman-db", registryId: "lahman-db", caps: mlbHistoryCapabilities() },
    { id: "moneypuck", registryId: "moneypuck", caps: hockeyCapabilities() },
    { id: "openfootball", registryId: "openfootball", caps: soccerCapabilities() },
  ];

  for (const entry of catalog) {
    const src = getSource(entry.registryId);
    if (!src) continue;
    try {
      providers.push(
        new RegistryStatsProvider(entry.id, entry.registryId, entry.caps),
      );
    } catch {
      // Skip non-ingestible (should not happen for catalog picks).
    }
  }

  if (providers.length === 0) {
    return [
      new OfflineStatsProvider(
        "no ingestible stats sources available in registry",
      ),
    ];
  }

  return providers;
}

/** Merge feature batches; later providers do not overwrite same signalKey+entityKey. */
export function mergeStatsFeatures(
  batches: readonly StatsProviderResult[],
): StatsFeature[] {
  const seen = new Set<string>();
  const out: StatsFeature[] = [];
  for (const batch of batches) {
    if (!batch.healthy) continue;
    for (const f of batch.features) {
      const key = `${f.entityKey ?? ""}|${f.signalKey}|${f.category}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(f);
    }
  }
  return out;
}

/** True only for quote-plane certifiers — always false for StatsProvider. */
export function isCertifiableStatsProvider(provider: StatsProvider): boolean {
  return provider.capabilities.certifiableForLiveGate === true;
}

// silence unused helper if TEAM_RATES path unused
void nflverseCapabilities;

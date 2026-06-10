/**
 * Multi-provider odds FAILOVER registry (scaffold — ADDITIVE / INERT).
 *
 * Goal: describe odds providers in one typed place so a single provider
 * 401/429/outage can't blank the product. The Odds API is the configured
 * PRIMARY; every other entry is an inert FALLBACK stub that is excluded from
 * the resolved order unless its own env var is present.
 *
 * This module is deliberately a SAFE NO-OP until a fallback's env var is set —
 * the established codebase pattern. Nothing here:
 *   - makes a network call,
 *   - reads, prints, or stores a secret value,
 *   - changes `OddsApiClient` behavior, the cron route, or `processSport`.
 *
 * `isConfigured(env)` checks only whether an env var is *present* (a boolean).
 * It never reads the value, so it can be evaluated anywhere — including in
 * RSC/client-adjacent code — without risk of leaking a credential. The actual
 * ingestion path continues to use `OddsApiClient` directly; this registry is
 * the scaffold a future failover orchestrator resolves its ordered provider
 * list from.
 *
 * Mirrors `provider-status.ts`: pure, side-effect free, trivially unit-testable.
 */

import {
  PROVIDER_JOB_STATUS,
  type ProviderJobStatus,
} from "./provider-status.js";

/**
 * A minimal, read-only view of the environment. We only ever ask whether a key
 * is *present* — never for its value — so the surface is intentionally narrow
 * and safe to pass around. Mirrors `process.env`'s `string | undefined` shape.
 */
export type EnvLike = Record<string, string | undefined>;

/** The role a provider plays in the failover order. */
export type ProviderRole = "primary" | "fallback";

/**
 * A stable identifier for each odds provider. Kept as a string-literal union so
 * the registry is exhaustive and consumers get autocomplete without a runtime
 * enum object leaking into any bundle.
 */
export type OddsProviderId = "the-odds-api" | "odds-api-io" | "api-sports";

/**
 * A typed description of an odds provider. Pure data plus a pure
 * `isConfigured` predicate — no client instances, no I/O.
 */
export interface OddsProviderDescriptor {
  /** Stable identifier used for ordering, logging, and lookup. */
  readonly id: OddsProviderId;
  /** Human-readable label for operator surfaces (never public-facing copy). */
  readonly label: string;
  /** PRIMARY (the configured source of truth) or FALLBACK (inert until keyed). */
  readonly role: ProviderRole;
  /**
   * Lower runs first. The primary owns the lowest priority; fallbacks are
   * ordered after it. Priorities are distinct so ordering is deterministic.
   */
  readonly priority: number;
  /**
   * The env var whose *presence* enables this provider. Documented here so the
   * gate is auditable; `isConfigured` is the only thing that reads it.
   */
  readonly envVar: string;
  /**
   * True when this provider's env var is present. Presence-only — never reads
   * or returns the value. A blank/empty string counts as not configured.
   */
  isConfigured(env: EnvLike): boolean;
}

/**
 * Presence-only env check shared by every descriptor. Treats an absent var and
 * an empty/whitespace-only var identically as "not configured", matching how
 * `OddsApiClient` rejects a falsy key. Never returns or logs the value.
 */
export function isEnvVarPresent(env: EnvLike, name: string): boolean {
  const value = env[name];
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * The env var that enables the primary. Matches the existing convention used by
 * `OddsApiClient` / the cron route (`process.env["THE_ODDS_API_KEY"]`).
 */
export const PRIMARY_PROVIDER_ENV_VAR = "THE_ODDS_API_KEY";

/**
 * The Odds API — the one configured, in-use provider. PRIMARY, priority 0.
 * Its descriptor mirrors the real ingestion path: when `THE_ODDS_API_KEY` is
 * present it resolves first; nothing about its behavior changes here.
 */
export const THE_ODDS_API_PROVIDER: OddsProviderDescriptor = {
  id: "the-odds-api",
  label: "The Odds API",
  role: "primary",
  priority: 0,
  envVar: PRIMARY_PROVIDER_ENV_VAR,
  isConfigured(env: EnvLike): boolean {
    return isEnvVarPresent(env, PRIMARY_PROVIDER_ENV_VAR);
  },
};

/**
 * Inert FALLBACK stub — odds-api.io.
 *
 * This is a SCAFFOLD entry: it carries no client and makes no calls. It is
 * excluded from the resolved order unless `ODDS_API_IO_KEY` is present, and even
 * when present it remains a structural placeholder for a future adapter. The
 * pre-classified `unavailableStatus` lets a failover orchestrator record a
 * truthful `PROVIDER_UNAVAILABLE` reason the moment it tries an unbuilt
 * fallback — reusing the `provider-status.ts` vocabulary rather than inventing
 * a new one.
 */
export const ODDS_API_IO_FALLBACK: OddsProviderDescriptor = {
  id: "odds-api-io",
  label: "odds-api.io (fallback — inert scaffold)",
  role: "fallback",
  priority: 10,
  envVar: "ODDS_API_IO_KEY",
  isConfigured(env: EnvLike): boolean {
    return isEnvVarPresent(env, "ODDS_API_IO_KEY");
  },
};

/**
 * Inert FALLBACK stub — API-Sports.
 *
 * Same contract as {@link ODDS_API_IO_FALLBACK}: structural placeholder, no
 * network, excluded until `API_SPORTS_KEY` is present.
 */
export const API_SPORTS_FALLBACK: OddsProviderDescriptor = {
  id: "api-sports",
  label: "API-Sports (fallback — inert scaffold)",
  role: "fallback",
  priority: 20,
  envVar: "API_SPORTS_KEY",
  isConfigured(env: EnvLike): boolean {
    return isEnvVarPresent(env, "API_SPORTS_KEY");
  },
};

/**
 * The full registry, declared in priority order. The primary first, then inert
 * fallbacks. This is the only place providers are enumerated.
 */
export const ODDS_PROVIDER_REGISTRY: readonly OddsProviderDescriptor[] = [
  THE_ODDS_API_PROVIDER,
  ODDS_API_IO_FALLBACK,
  API_SPORTS_FALLBACK,
];

/**
 * The job-truth status to record when a resolved-but-unbuilt fallback is
 * attempted. Re-exported from the shared vocabulary so callers never invent a
 * new reason string. A fallback stub has no adapter, so the honest outcome of
 * "using" it is `PROVIDER_UNAVAILABLE`.
 */
export const FALLBACK_STUB_STATUS: ProviderJobStatus =
  PROVIDER_JOB_STATUS.PROVIDER_UNAVAILABLE;

/**
 * The honest, side-effect-free result of "invoking" an inert fallback stub.
 * A future orchestrator can call this to get a truthful classification without
 * any network attempt — keeping the fail-closed contract intact while the real
 * adapter is still a scaffold.
 */
export function fallbackStubStatus(): ProviderJobStatus {
  return FALLBACK_STUB_STATUS;
}

export interface ResolveProviderOrderOptions {
  /**
   * Include configured fallbacks in the resolved order. Defaults to `true`.
   * (Unconfigured fallbacks are always excluded regardless.) Provided so a
   * caller can resolve "primary only" without mutating the registry.
   */
  readonly includeFallbacks?: boolean;
}

/**
 * Resolve the ORDERED list of providers to try, given the current environment.
 *
 * Rules (pure, deterministic):
 *   1. Only providers whose env var is *present* are included. An unconfigured
 *      fallback is excluded entirely (it never appears in the order).
 *   2. The result is sorted by ascending `priority`, then by `id` as a stable
 *      tie-breaker, so the order is fully deterministic for a given env.
 *   3. With only `THE_ODDS_API_KEY` set, the result is exactly the primary —
 *      identical to today's single-provider behavior (no behavior change).
 *
 * No network, no secret reads — only env-var presence is consulted.
 */
export function resolveProviderOrder(
  env: EnvLike,
  options: ResolveProviderOrderOptions = {}
): OddsProviderDescriptor[] {
  const includeFallbacks = options.includeFallbacks ?? true;
  return ODDS_PROVIDER_REGISTRY.filter((provider) => {
    if (!provider.isConfigured(env)) return false;
    if (!includeFallbacks && provider.role === "fallback") return false;
    return true;
  }).sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/**
 * The single highest-priority configured provider, or `null` if none is
 * configured. With the standard env this is always The Odds API.
 */
export function resolvePrimaryProvider(
  env: EnvLike
): OddsProviderDescriptor | null {
  return resolveProviderOrder(env)[0] ?? null;
}

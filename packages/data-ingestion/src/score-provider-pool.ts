/**
 * Free SETTLEMENT score-provider pool — health-aware round-robin + failover.
 *
 * WHY: settlement (recording final scores so picks can be graded) does not need
 * the paid odds key — the facts are available from free, rights-cleared sources
 * (ESPN public API, nflverse open data). This pool spreads a settlement fetch
 * across every provider that is BOTH healthy AND clearance-granted, failing over
 * to the next on any failure, and returns the FIRST successful normalized result.
 * When every provider is unhealthy, uncleared, or empty it returns an HONEST
 * "no provider available" result — it NEVER throws and NEVER fabricates scores.
 *
 * SCOPE BOUNDARY: scores + schedules + settlement facts ONLY. This NEVER prices a
 * market or fetches live odds — live odds stay on the paid Odds-API path. Mirror
 * of the failover STYLE in `odds-failover.ts` (provider-agnostic decision layer)
 * and the health-aware round-robin in `apps/web/lib/claude-api/provider-pool.ts`
 * (rotating cursor + in-memory cooldown map + test reset hook). We mirror the
 * style; we do not import either.
 *
 * RIGHTS / FAIL-CLOSED: the clearance fn is INJECTED (this package does not
 * depend on apps/web). It is threaded straight through to each provider, which
 * already fails closed — a provider with no granted clearance returns
 * `{ healthy: false }` and extracts nothing. The pool merely skips it.
 *
 * PURITY: `fetchFn`, the clearance fn, and the clock (`now`) are all injectable,
 * so the whole pool unit-tests against a mocked fetch with NO live network.
 *
 * ── INTENDED settle-sport wiring (DEFERRED — see report) ──────────────────────
 * The flag-gated fallback in `packages/ingestion-pipeline/src/settle-sport.ts`
 * was DEFERRED because it cannot be wired non-breakingly today. The paid path
 * matches DB games by `Game.externalId`, which is the Odds-API game id. The free
 * providers emit ESPN event ids / nflverse `game_id` as `NormalizedScore.gameKey`
 * — these do NOT equal the stored Odds-API `externalId`, so feeding pool results
 * into the existing `db.game.findUnique({ where: { externalId } })` loop would
 * silently match nothing (or, worse, require a new fuzzy team-name+date matcher
 * that does not yet exist and would be a behavior change). The correct, safe
 * wiring — to be added in a follow-up once a settlement key-mapping layer exists —
 * is, IN OUTLINE, an INERT, default-OFF addition that does not alter the paid
 * path or any caller-visible signature:
 *
 *   // top of settleSport(), after `client`/`normalizer` are built:
 *   //   1. Run the paid path EXACTLY as today to produce `normalized`.
 *   //   2. const freeEnabled = process.env.FREE_DATA_PROVIDER_ENABLED === "true";
 *   //   3. if (freeEnabled && (normalized.length === 0 || <paid getScores threw>)) {
 *   //        const pooled = await fetchScoresWithPool(sport.key, 2, {
 *   //          fetchFn, checkClearance,            // both injected by the caller
 *   //        });
 *   //        if (pooled.healthy) {
 *   //          // map NormalizedScore -> { externalId, homeScore, awayScore, completed }
 *   //          // VIA a settlement key-map (team-name + commenceTime normalization),
 *   //          // NOT a raw gameKey===externalId compare, then merge as a fallback ONLY
 *   //          // for games the paid path did not already settle.
 *   //        }
 *   //      }
 *   //   4. Continue the existing completed-game loop unchanged.
 *
 * Until that key-map exists, forcing a `gameKey===externalId` join would be a
 * latent no-op at best and a correctness risk at worst, so the wiring is left
 * out per the "stop rather than force a risky edit" instruction. The pool below
 * is complete, tested, and ready to be called the moment the mapping lands.
 */

import {
  type ScoreProvider,
  type ScoreProviderOptions,
  type NormalizedScoreResult,
} from "./score-provider.js";

/** Cooldown applied to a provider after a failure before it is preferred again. */
export const SCORE_POOL_COOLDOWN_MS = 60_000;

interface Health {
  /** Epoch ms until which the provider is considered unhealthy. 0 = healthy. */
  unhealthyUntil: number;
}

// Module-level (process lifetime) so load genuinely spreads across calls and a
// provider that just failed is de-preferred on the next call. Both reset via
// __resetScorePoolStateForTests() for deterministic tests.
const healthByProvider = new Map<string, Health>();
let rotationCursor = 0;

/** Test hook — clears the rotating cursor and the in-memory health map. */
export function __resetScorePoolStateForTests(): void {
  healthByProvider.clear();
  rotationCursor = 0;
}

function isHealthy(sourceId: string, now: number): boolean {
  const h = healthByProvider.get(sourceId);
  return !h || h.unhealthyUntil <= now;
}

function markUnhealthy(sourceId: string, now: number): void {
  healthByProvider.set(sourceId, { unhealthyUntil: now + SCORE_POOL_COOLDOWN_MS });
}

function markHealthy(sourceId: string): void {
  healthByProvider.delete(sourceId);
}

/**
 * Order providers for this attempt:
 *   1. rotate the start index so load spreads (no provider is always first);
 *   2. prefer currently-healthy providers, but keep cooling-down ones as a last
 *      resort so we still try them if every healthy one fails or is uncleared.
 */
function orderForAttempt(providers: readonly ScoreProvider[], now: number): ScoreProvider[] {
  if (providers.length === 0) return [];
  const start = rotationCursor % providers.length;
  rotationCursor = (rotationCursor + 1) % providers.length;

  const rotated: ScoreProvider[] = [];
  for (let i = 0; i < providers.length; i += 1) {
    rotated.push(providers[(start + i) % providers.length]!);
  }
  const healthy = rotated.filter((p) => isHealthy(p.sourceId, now));
  const cooling = rotated.filter((p) => !isHealthy(p.sourceId, now));
  return [...healthy, ...cooling];
}

/** One provider's failure detail, in the order attempted. */
export interface ScorePoolAttempt {
  readonly provider: string;
  readonly reason: string;
}

/** The outcome of a pooled settlement-score fetch. */
export interface ScorePoolResult {
  /** True only when one provider returned a healthy, usable result. */
  readonly healthy: boolean;
  /**
   * The winning provider's normalized result when `healthy`; an empty,
   * unhealthy stand-in when no provider could serve (never null, never throws).
   */
  readonly result: NormalizedScoreResult;
  /** The provider id that served the result, or null when none did. */
  readonly servedBy: string | null;
  /** Per-provider failure detail, in the order attempted (empty when served first try). */
  readonly attempts: readonly ScorePoolAttempt[];
}

export interface ScorePoolOptions extends ScoreProviderOptions {
  /** Injectable clock (ms epoch) for deterministic cooldown tests. */
  readonly now?: () => number;
}

/**
 * Default provider roster. Order is irrelevant — the pool rotates — but it
 * documents which free sources participate. Callers may pass their own roster.
 *
 * Imported lazily inside the function-less default so this module stays a pure
 * decision layer; the concrete providers are passed in by `fetchScoresWithPool`.
 */
import { espnScoreProvider } from "./providers/espn-scores.js";
import { nflverseScoreProvider } from "./providers/nflverse-scores.js";

export const DEFAULT_SCORE_PROVIDERS: readonly ScoreProvider[] = [
  espnScoreProvider,
  nflverseScoreProvider,
];

/**
 * Resolve settlement scores for `sportKey` over the free provider pool.
 *
 * Round-robins across providers that are healthy AND (by virtue of the injected
 * clearance fn) clearance-granted, returns the FIRST healthy non-empty result,
 * marks failures unhealthy (cooldown) and moves on, and returns an honest empty
 * result if every provider fails / is uncleared / is empty. NEVER throws.
 *
 * A provider that returns `{ healthy: false }` (clearance denied, network error,
 * bad payload) is treated as a failure and skipped — the provider extracts
 * nothing in that case, so the pool simply tries the next.
 *
 * A provider that is `{ healthy: true }` but has zero scores (e.g. it does not
 * serve this sport, or there are no games in the window) is NOT a hard failure:
 * it is not marked unhealthy, but the pool keeps looking for a provider that can
 * actually serve scores. If none can, the (healthy, empty) result is returned as
 * the honest "nothing to settle" answer rather than a failure.
 *
 * @param sportKey  - internal Odds-API sport key (e.g. "americanfootball_nfl")
 * @param daysBack  - lookback window in days (settlement uses 2)
 * @param options   - injectable fetchFn, checkClearance, clock, and roster
 * @param providers - provider roster (defaults to DEFAULT_SCORE_PROVIDERS)
 */
export async function fetchScoresWithPool(
  sportKey: string,
  daysBack: number,
  options: ScorePoolOptions = {},
  providers: readonly ScoreProvider[] = DEFAULT_SCORE_PROVIDERS,
): Promise<ScorePoolResult> {
  const now = options.now ?? Date.now;
  const providerOptions: ScoreProviderOptions = {
    fetchFn: options.fetchFn,
    checkClearance: options.checkClearance,
  };

  const attempts: ScorePoolAttempt[] = [];
  // Remember the best "healthy but empty" result so an all-empty roster still
  // returns an honest healthy-empty answer rather than a misleading failure.
  let healthyEmpty: NormalizedScoreResult | null = null;
  let healthyEmptyProvider: string | null = null;

  for (const provider of orderForAttempt(providers, now())) {
    let result: NormalizedScoreResult;
    try {
      result = await provider.fetchScores(sportKey, daysBack, providerOptions);
    } catch (err) {
      // Providers MUST NOT throw by contract; if one does, treat it as a failure
      // and keep the pool alive (never propagate).
      markUnhealthy(provider.sourceId, now());
      attempts.push({
        provider: provider.sourceId,
        reason: `threw:${err instanceof Error ? err.name : "unknown"}`,
      });
      continue;
    }

    if (!result.healthy) {
      markUnhealthy(provider.sourceId, now());
      attempts.push({ provider: result.provider, reason: result.error ?? "unhealthy" });
      continue;
    }

    // Healthy result. A provider that served scores wins immediately.
    markHealthy(provider.sourceId);
    if (result.scores.length > 0) {
      return { healthy: true, result, servedBy: result.provider, attempts };
    }

    // Healthy but empty — keep it as a fallback and try to find a richer source.
    if (healthyEmpty === null) {
      healthyEmpty = result;
      healthyEmptyProvider = result.provider;
    }
    attempts.push({ provider: result.provider, reason: "healthy-empty" });
  }

  // No provider served non-empty scores. If at least one was healthy-but-empty,
  // that is the honest "nothing to settle from the free pool" answer.
  if (healthyEmpty !== null) {
    return {
      healthy: true,
      result: healthyEmpty,
      servedBy: healthyEmptyProvider,
      attempts,
    };
  }

  // Every provider failed or was uncleared — honest empty result, never throws.
  return {
    healthy: false,
    result: {
      provider: "score-pool",
      scores: [],
      healthy: false,
      error: "no-provider-available",
    },
    servedBy: null,
    attempts,
  };
}

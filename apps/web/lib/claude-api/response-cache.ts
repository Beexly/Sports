/**
 * Exact-key LLM response cache.
 *
 * The one genuine gap found in the 2026-08-12 capability audit: Anthropic's
 * native prompt caching (messages.ts, `cache_control: ephemeral`) discounts the
 * *input* side of a repeated call, but an identical request still pays full
 * output cost and full latency every time. This closes that.
 *
 * DELIBERATELY EXACT-KEY, NOT SEMANTIC.
 * An embedding/similarity cache returns a *different* prompt's answer whenever the
 * threshold is mistuned, silently. Against CLAUDE.md rule #5 ("No stale data —
 * always validate timestamps and freshness") that is a correctness hazard wearing
 * a performance costume. A SHA-256 over the exact request tuple either matches or
 * it does not. No thresholds, no judgment calls, no silent wrong answers.
 *
 * SAFETY POSTURE
 *   - Opt-in per call. Never caches unless the caller asks.
 *   - Surface allowlist. Only draft-shaped surfaces are eligible, mirroring the
 *     free-lane rule that these never auto-publish (free-lane-policy.ts).
 *   - Mandatory TTL, conservative default.
 *   - Every hit reports `ageMs`, so a caller can reject a too-old entry itself.
 *   - Store-agnostic: no `ioredis` import here, so the transport-import boundary
 *     is untouched and this module is unit-testable with no I/O.
 *
 * Wire a Redis store with `createRedisResponseCacheStore(client)`; pass the
 * already-configured ioredis client from the caller.
 */
import { createHash } from "node:crypto";
import type { ClaudeSurface } from "./model-router";

/** Minimal store contract. Satisfied by Redis, an LRU, or the in-memory test store. */
export interface ResponseCacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
}

/**
 * Surfaces eligible for caching. Draft-shaped work only — the same restriction
 * the $0 free lane applies, and for the same reason: these outputs are reviewed
 * before they reach anyone. Anything that informs a pick, a price, or a public
 * claim is absent on purpose and must stay absent.
 */
export const CACHEABLE_SURFACES: ReadonlySet<ClaudeSurface> = new Set<ClaudeSurface>([
  "brief",
  "content",
]);

/** 1 hour. Long enough to absorb a retry storm, short enough to stay honest. */
export const DEFAULT_TTL_SECONDS = 3600;

export interface CacheableRequest {
  readonly model: string;
  readonly system: string;
  readonly user: string;
  readonly maxTokens: number;
  readonly temperature?: number;
  readonly surface?: ClaudeSurface;
}

/** The subset of a call result worth persisting. */
export interface CacheableResult {
  readonly text: string;
  readonly modelName: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
}

interface CacheEnvelope extends CacheableResult {
  readonly cachedAtMs: number;
  readonly v: 1;
}

export type CacheOutcome =
  | { readonly kind: "hit"; readonly result: CacheableResult; readonly ageMs: number }
  | { readonly kind: "miss"; readonly result: CacheableResult }
  | { readonly kind: "bypass"; readonly result: CacheableResult; readonly reason: BypassReason };

export type BypassReason =
  | "not-opted-in"
  | "surface-not-cacheable"
  | "nondeterministic-temperature"
  | "store-error";

/**
 * Deterministic cache key. Field names are included so that moving a value between
 * fields cannot collide, and the version prefix lets the key space be retired.
 */
export function responseCacheKey(request: CacheableRequest): string {
  const canonical = JSON.stringify({
    model: request.model,
    system: request.system,
    user: request.user,
    maxTokens: request.maxTokens,
    temperature: request.temperature ?? 0,
  });
  return `llmcache:v1:${createHash("sha256").update(canonical).digest("hex")}`;
}

/**
 * Why a request is not cacheable, or null when it is.
 *
 * Temperature > 0 is excluded because caching a deliberately-sampled response
 * turns "give me a variation" into "give me the same thing forever" — the caller
 * asked for nondeterminism and would silently stop getting it.
 */
export function cacheBypassReason(
  request: CacheableRequest,
  optedIn: boolean,
): BypassReason | null {
  if (!optedIn) return "not-opted-in";
  if (request.surface === undefined || !CACHEABLE_SURFACES.has(request.surface)) {
    return "surface-not-cacheable";
  }
  if ((request.temperature ?? 0) > 0) return "nondeterministic-temperature";
  return null;
}

function parseEnvelope(raw: string): CacheEnvelope | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") return null;
    const e = parsed as Partial<CacheEnvelope>;
    if (e.v !== 1) return null;
    if (typeof e.text !== "string" || typeof e.modelName !== "string") return null;
    if (typeof e.cachedAtMs !== "number" || !Number.isFinite(e.cachedAtMs)) return null;
    return {
      v: 1,
      text: e.text,
      modelName: e.modelName,
      inputTokens: typeof e.inputTokens === "number" ? e.inputTokens : 0,
      outputTokens: typeof e.outputTokens === "number" ? e.outputTokens : 0,
      cachedAtMs: e.cachedAtMs,
    };
  } catch {
    return null;
  }
}

/**
 * Run `call`, using the cache when the request is eligible.
 *
 * A store failure never fails the request — it degrades to a live call and is
 * reported as `bypass:store-error`. A cache is an optimization; it must not
 * become a new way for the product to break.
 */
export async function withResponseCache(args: {
  readonly store: ResponseCacheStore;
  readonly request: CacheableRequest;
  readonly call: () => Promise<CacheableResult>;
  readonly enabled?: boolean;
  readonly ttlSeconds?: number;
  /** Reject hits older than this even if the store still holds them. */
  readonly maxAgeMs?: number;
  readonly now?: () => number;
}): Promise<CacheOutcome> {
  const now = args.now ?? Date.now;
  const bypass = cacheBypassReason(args.request, args.enabled ?? false);
  if (bypass !== null) {
    return { kind: "bypass", result: await args.call(), reason: bypass };
  }

  const key = responseCacheKey(args.request);
  const ttl = args.ttlSeconds ?? DEFAULT_TTL_SECONDS;

  let raw: string | null = null;
  try {
    raw = await args.store.get(key);
  } catch {
    return { kind: "bypass", result: await args.call(), reason: "store-error" };
  }

  if (raw !== null) {
    const envelope = parseEnvelope(raw);
    if (envelope !== null) {
      const ageMs = now() - envelope.cachedAtMs;
      const tooOld = args.maxAgeMs !== undefined && ageMs > args.maxAgeMs;
      if (!tooOld && ageMs >= 0) {
        return {
          kind: "hit",
          ageMs,
          result: {
            text: envelope.text,
            modelName: envelope.modelName,
            inputTokens: envelope.inputTokens,
            outputTokens: envelope.outputTokens,
          },
        };
      }
    }
  }

  const result = await args.call();
  const envelope: CacheEnvelope = { v: 1, ...result, cachedAtMs: now() };
  try {
    await args.store.set(key, JSON.stringify(envelope), ttl);
  } catch {
    // Write-through failure is not the caller's problem; the result is already good.
  }
  return { kind: "miss", result };
}

/* ------------------------------- stores ------------------------------- */

/** The `setex`-shaped subset of ioredis this cache needs. Keeps ioredis unimported. */
export interface RedisLikeClient {
  get(key: string): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<unknown>;
}

export function createRedisResponseCacheStore(client: RedisLikeClient): ResponseCacheStore {
  return {
    async get(key) {
      return client.get(key);
    },
    async set(key, value, ttlSeconds) {
      await client.setex(key, ttlSeconds, value);
    },
  };
}

/** In-memory store with real TTL expiry — for tests and single-process dev. */
export function createMemoryResponseCacheStore(now: () => number = Date.now): ResponseCacheStore {
  const map = new Map<string, { value: string; expiresAtMs: number }>();
  return {
    async get(key) {
      const entry = map.get(key);
      if (entry === undefined) return null;
      if (now() >= entry.expiresAtMs) {
        map.delete(key);
        return null;
      }
      return entry.value;
    },
    async set(key, value, ttlSeconds) {
      map.set(key, { value, expiresAtMs: now() + ttlSeconds * 1000 });
    },
  };
}

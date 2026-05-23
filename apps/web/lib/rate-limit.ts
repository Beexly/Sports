/**
 * ioredis-backed sliding-window rate limiter.
 *
 * Per-user, per-route. One atomic Redis pipeline per check:
 *   ZREMRANGEBYSCORE → ZADD → ZCARD → PEXPIRE
 * Each command in MULTI runs without interleaving on the server, so the
 * count returned by ZCARD reflects exactly the state after this caller's
 * ZADD. There is no read-then-write race.
 *
 * **Fail-closed by default** on credit-burning routes (e.g. anything
 * that calls Claude). The cost asymmetry favors "service unavailable"
 * over "uncapped spend" — a short Redis outage shouldn't be able to
 * exhaust the Anthropic credit balance.
 *
 * Tradeoff (documented): two simultaneous requests at count=N-1 both
 * ZADD before either ZCARDs, so post-add count is N+1 for both. Both
 * get denied even though one slot was technically free. This over-denies
 * by at most (concurrent_callers - 1) per window — the safe direction.
 */

import type { Redis } from "ioredis";

export type RateLimitFailureMode = "fail-closed" | "fail-open";

export interface RateLimitConfig {
  /** Route identifier used in the Redis key. */
  readonly route: string;
  /** Sliding-window width in milliseconds. */
  readonly windowMs: number;
  /** Maximum allowed requests in the window. */
  readonly maxRequests: number;
  /** What to return when Redis is unavailable. */
  readonly failureMode: RateLimitFailureMode;
}

export interface RateLimitResult {
  readonly allowed: boolean;
  /** Approximate slots remaining in the window after this call. */
  readonly remaining: number;
  /** Epoch ms when the oldest entry in the window will fall out. */
  readonly resetAt: number;
  /** Whether we consulted Redis or hit the failure-mode default. */
  readonly source: "redis" | "fallback";
  /** Present when source === "fallback"; the reason Redis was skipped. */
  readonly fallbackReason?: string;
}

export interface RateLimitDeps {
  /** Returns a connected client, or null when Redis is unavailable. */
  readonly getClient: () => Promise<Redis | null>;
}

let redisSingleton: Redis | null | undefined;

async function defaultGetClient(): Promise<Redis | null> {
  if (redisSingleton !== undefined) return redisSingleton;
  const url = process.env["REDIS_URL"];
  if (!url) {
    redisSingleton = null;
    return null;
  }
  try {
    const { default: Redis } = await import("ioredis");
    redisSingleton = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    await redisSingleton.connect();
    return redisSingleton;
  } catch {
    redisSingleton = null;
    return null;
  }
}

const defaultDeps: RateLimitDeps = {
  getClient: defaultGetClient,
};

/** Test-only escape hatch for vitest. */
export function __setRedisForTests(client: Redis | null | undefined): void {
  redisSingleton = client;
}

function fallback(
  cfg: RateLimitConfig,
  reason: string
): RateLimitResult {
  const allowed = cfg.failureMode === "fail-open";
  return {
    allowed,
    remaining: allowed ? cfg.maxRequests : 0,
    resetAt: Date.now() + cfg.windowMs,
    source: "fallback",
    fallbackReason: reason,
  };
}

export async function checkRateLimit(
  userId: string,
  cfg: RateLimitConfig,
  deps: RateLimitDeps = defaultDeps
): Promise<RateLimitResult> {
  if (!userId) return fallback(cfg, "missing-user-id");

  let client: Redis | null;
  try {
    client = await deps.getClient();
  } catch (err) {
    return fallback(
      cfg,
      err instanceof Error ? `client-init: ${err.message}` : "client-init"
    );
  }
  if (!client) return fallback(cfg, "no-client");

  const now = Date.now();
  const windowStart = now - cfg.windowMs;
  const key = `rl:${cfg.route}:${userId}`;
  // unique member per call so identical-timestamp adds don't collapse
  const member = `${now}:${Math.random().toString(36).slice(2, 10)}`;

  try {
    const pipe = client.multi();
    pipe.zremrangebyscore(key, 0, windowStart);
    pipe.zadd(key, now, member);
    pipe.zcard(key);
    pipe.pexpire(key, cfg.windowMs);
    const results = await pipe.exec();

    if (!results || results.length < 4) {
      return fallback(cfg, "pipeline-empty");
    }
    const cardResult = results[2];
    if (!cardResult || cardResult[0]) {
      return fallback(cfg, "zcard-failed");
    }
    const count = Number(cardResult[1]);
    if (!Number.isFinite(count)) {
      return fallback(cfg, "zcard-nonnumeric");
    }

    const allowed = count <= cfg.maxRequests;
    return {
      allowed,
      remaining: Math.max(0, cfg.maxRequests - count),
      resetAt: now + cfg.windowMs,
      source: "redis",
    };
  } catch (err) {
    return fallback(
      cfg,
      err instanceof Error ? `pipeline: ${err.message}` : "pipeline"
    );
  }
}

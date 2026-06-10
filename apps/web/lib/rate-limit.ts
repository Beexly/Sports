/**
 * Inbound rate limiting — PUBLIC API routes only (R-12).
 *
 * Minimal per-IP fixed-window limiter. Two backends, picked at call time:
 *
 *  1. Upstash/Vercel-KV REST — used ONLY when its env keys are present
 *     (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`, or the
 *     Vercel KV aliases `KV_REST_API_URL` + `KV_REST_API_TOKEN`). Plain
 *     `fetch` against the REST pipeline endpoint — no new dependency.
 *     This is the only backend that is correct across serverless
 *     instances.
 *
 *  2. In-memory Map fallback — used when no REST keys are configured.
 *     HONEST SCOPE WARNING: the Map lives in one Node process. On Vercel
 *     each lambda instance keeps its own counters, so the effective limit
 *     is per-instance, not global, and counters reset on cold start. That
 *     still stops the single-source burst/abuse case (one IP hammering
 *     one warm instance) and is strictly better than no throttle, but it
 *     is NOT a hard global guarantee. Configure the REST keys for that.
 *
 * Failure philosophy: FAIL OPEN. A broken or slow limiter must never take
 * down a healthy API — any backend error, timeout, or unexpected shape
 * logs a warning and admits the request. Only an honest over-limit count
 * produces a 429 (with a `Retry-After` header).
 *
 * Tunables (env, all optional):
 *   RATE_LIMIT_MAX_REQUESTS   — requests allowed per window per IP (default 60)
 *   RATE_LIMIT_WINDOW_SECONDS — fixed window length in seconds (default 60)
 *   RATE_LIMIT_DISABLED       — "true" disables enforcement entirely
 *
 * Scope guard: this module is for the public, unauthenticated GET surface
 * (picks, board, performance, promotions, daily-slate). Do not wire it
 * into cron/auth/admin routes — those have their own auth gates.
 */

import { NextResponse } from "next/server";

export interface RateLimitConfig {
  /** Requests allowed per IP per window. */
  readonly maxRequests: number;
  /** Fixed-window length in milliseconds. */
  readonly windowMs: number;
}

export interface RateLimitDecision {
  /** True → admit the request. False → over limit, send 429. */
  readonly ok: boolean;
  readonly limit: number;
  /** Requests left in the current window (0 when over limit). */
  readonly remaining: number;
  /** Whole seconds until the current window resets (≥ 1). */
  readonly retryAfterSeconds: number;
}

const DEFAULT_MAX_REQUESTS = 60;
const DEFAULT_WINDOW_SECONDS = 60;

/** Upper bound on tracked keys before the in-memory store sweeps stale windows. */
const MAX_TRACKED_KEYS = 10_000;

/** Timeout for the REST backend — a slow limiter must not slow the API. */
const REST_TIMEOUT_MS = 1_500;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Resolve tunables from env at call time (no module-level caching — test-friendly). */
export function resolveRateLimitConfig(
  env: Record<string, string | undefined> = process.env
): RateLimitConfig {
  return {
    maxRequests: parsePositiveInt(env["RATE_LIMIT_MAX_REQUESTS"], DEFAULT_MAX_REQUESTS),
    windowMs:
      parsePositiveInt(env["RATE_LIMIT_WINDOW_SECONDS"], DEFAULT_WINDOW_SECONDS) * 1_000,
  };
}

/**
 * Best-effort client IP. Vercel/most proxies set `x-forwarded-for`
 * (client-first); fall back to `x-real-ip`, then a shared "unknown"
 * bucket so a header-less caller is still throttled rather than exempt.
 * Tolerates an absent request (some routes are invoked argless in tests).
 */
export function getClientIp(req: Request | undefined): string {
  if (!req || typeof req.headers?.get !== "function") return "unknown";
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  return realIp || "unknown";
}

// ---------------------------------------------------------------------------
// In-memory fixed-window backend (single-instance scope — see module docstring)
// ---------------------------------------------------------------------------

interface WindowEntry {
  windowIndex: number;
  count: number;
}

const memoryStore = new Map<string, WindowEntry>();

/** Test hook: clear all in-memory counters. */
export function resetRateLimitStoreForTests(): void {
  memoryStore.clear();
}

function sweepStaleEntries(currentWindowIndex: number): void {
  if (memoryStore.size <= MAX_TRACKED_KEYS) return;
  for (const [key, entry] of memoryStore) {
    if (entry.windowIndex !== currentWindowIndex) memoryStore.delete(key);
  }
}

function secondsUntilWindowEnd(nowMs: number, windowIndex: number, windowMs: number): number {
  const windowEndMs = (windowIndex + 1) * windowMs;
  return Math.max(1, Math.ceil((windowEndMs - nowMs) / 1_000));
}

/**
 * Pure fixed-window math against the in-memory store. Exported for the
 * limiter-math unit tests (window reset, per-key isolation).
 */
export function checkRateLimitInMemory(
  key: string,
  config: RateLimitConfig,
  nowMs: number = Date.now()
): RateLimitDecision {
  const windowIndex = Math.floor(nowMs / config.windowMs);
  sweepStaleEntries(windowIndex);

  const entry = memoryStore.get(key);
  let count: number;
  if (!entry || entry.windowIndex !== windowIndex) {
    memoryStore.set(key, { windowIndex, count: 1 });
    count = 1;
  } else {
    entry.count += 1;
    count = entry.count;
  }

  return {
    ok: count <= config.maxRequests,
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - count),
    retryAfterSeconds: secondsUntilWindowEnd(nowMs, windowIndex, config.windowMs),
  };
}

// ---------------------------------------------------------------------------
// Upstash / Vercel-KV REST backend (presence-checked, plain fetch)
// ---------------------------------------------------------------------------

interface RestBackend {
  readonly url: string;
  readonly token: string;
}

/**
 * PRESENCE check only — never logs or returns values anywhere visible.
 * Supports native Upstash env names and the Vercel KV aliases.
 */
export function getRestBackend(
  env: Record<string, string | undefined> = process.env
): RestBackend | null {
  const url = env["UPSTASH_REDIS_REST_URL"] || env["KV_REST_API_URL"];
  const token = env["UPSTASH_REDIS_REST_TOKEN"] || env["KV_REST_API_TOKEN"];
  return url && token ? { url, token } : null;
}

/**
 * Fixed window via Redis: the window index is baked into the key, so a
 * plain INCR + EXPIRE (2× window, self-cleaning) is race-safe enough for
 * a public-API throttle. Throws on any unexpected response — the caller
 * fails open.
 */
async function checkRateLimitViaRest(
  key: string,
  config: RateLimitConfig,
  nowMs: number,
  backend: RestBackend
): Promise<RateLimitDecision> {
  const windowIndex = Math.floor(nowMs / config.windowMs);
  const redisKey = `rl:${key}:${windowIndex}`;
  const ttlSeconds = Math.max(2, Math.ceil((config.windowMs * 2) / 1_000));

  const res = await fetch(`${backend.url.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${backend.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", redisKey],
      ["EXPIRE", redisKey, String(ttlSeconds)],
    ]),
    signal: AbortSignal.timeout(REST_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`rate-limit REST backend responded ${res.status}`);
  }

  const payload = (await res.json()) as Array<{ result?: unknown; error?: unknown }>;
  const incrResult = payload?.[0]?.result;
  if (typeof incrResult !== "number") {
    throw new Error("rate-limit REST backend returned a non-numeric INCR result");
  }

  return {
    ok: incrResult <= config.maxRequests,
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - incrResult),
    retryAfterSeconds: secondsUntilWindowEnd(nowMs, windowIndex, config.windowMs),
  };
}

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

const FAIL_OPEN: Omit<RateLimitDecision, "limit"> = {
  ok: true,
  remaining: 0,
  retryAfterSeconds: 1,
};

/**
 * Count one hit against `key` and decide admit/deny. Picks the REST
 * backend when its keys are present, the in-memory Map otherwise.
 * NEVER throws — every failure path resolves to an admit (fail open).
 */
export async function checkRateLimit(
  key: string,
  options: {
    config?: RateLimitConfig;
    nowMs?: number;
    env?: Record<string, string | undefined>;
  } = {}
): Promise<RateLimitDecision> {
  const env = options.env ?? process.env;
  const config = options.config ?? resolveRateLimitConfig(env);
  const nowMs = options.nowMs ?? Date.now();

  try {
    const backend = getRestBackend(env);
    if (backend) {
      return await checkRateLimitViaRest(key, config, nowMs, backend);
    }
    return checkRateLimitInMemory(key, config, nowMs);
  } catch (err) {
    // Fail OPEN: a broken limiter never takes down a healthy API.
    console.warn(
      "[rate-limit] limiter error — failing open.",
      err instanceof Error ? err.message : "unknown error"
    );
    return { ...FAIL_OPEN, limit: config.maxRequests, remaining: config.maxRequests };
  }
}

/**
 * Route helper for public GETs. Returns a ready-to-send 429 NextResponse
 * (with `Retry-After` + X-RateLimit-* headers) when the caller's IP is
 * over the window limit, or `null` to proceed. Wire-in is one line:
 *
 *   const limited = await enforcePublicApiRateLimit(req, "picks");
 *   if (limited) return limited;
 */
export async function enforcePublicApiRateLimit(
  req: Request | undefined,
  routeId: string
): Promise<NextResponse | null> {
  try {
    if (process.env["RATE_LIMIT_DISABLED"] === "true") return null;

    const decision = await checkRateLimit(`${routeId}:${getClientIp(req)}`);
    if (decision.ok) return null;

    return NextResponse.json(
      {
        success: false,
        error: "rate-limited",
        message: "Too many requests. Please slow down and retry shortly.",
        retryAfterSeconds: decision.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "retry-after": String(decision.retryAfterSeconds),
          "x-ratelimit-limit": String(decision.limit),
          "x-ratelimit-remaining": String(decision.remaining),
          "cache-control": "no-store",
        },
      }
    );
  } catch (err) {
    // Belt-and-braces fail open — even helper-level bugs admit traffic.
    console.warn(
      "[rate-limit] enforcement error — failing open.",
      err instanceof Error ? err.message : "unknown error"
    );
    return null;
  }
}

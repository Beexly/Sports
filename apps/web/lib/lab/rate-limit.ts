/**
 * Galaxy Lab — per-IP rate limiting for the public, unauthenticated simulation
 * endpoints. The Lab tools run CPU-bound Monte Carlo simulations; without a
 * limit they are an abuse/DoS vector. Backed by the in-house fixed-window rate
 * limiter (`@/lib/utils/rate-limiter`) over an in-memory per-instance store.
 *
 * In-memory is intentional: it needs no external infra to ship, fails open only
 * within a single instance, and degrades gracefully. For multi-instance
 * deployments this can later swap to a shared store behind the same interface.
 */

import {
  checkFixedWindow,
  type FixedWindowState,
} from "@/lib/utils/rate-limiter";

/** Requests allowed per IP per window. */
export const LAB_RATE_LIMIT = 30;
/** Rolling window length. */
export const LAB_RATE_WINDOW_MS = 60_000;

const store = new Map<string, FixedWindowState>();
let lastSweepMs = 0;

/** Derive a best-effort client key from forwarding headers (mirrors cipher/verify). */
export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") ?? "anon";
}

export interface LabRateResult {
  allowed: boolean;
  /** Seconds the client should wait before retrying (for the Retry-After header). */
  retryAfterSec: number;
  limit: number;
  remaining: number;
}

/**
 * Check (and consume) one unit of the caller's rate budget. Sweeps expired
 * windows roughly once per window to bound memory.
 */
export function checkLabRateLimit(req: Request, nowMs = Date.now()): LabRateResult {
  if (nowMs - lastSweepMs > LAB_RATE_WINDOW_MS) {
    for (const [key, state] of store) {
      if (nowMs >= state.windowStart + state.windowMs) store.delete(key);
    }
    lastSweepMs = nowMs;
  }

  const key = clientKey(req);
  // Start a new window stamped at the actual request time (deterministic and
  // testable) rather than wall-clock Date.now().
  const existing: FixedWindowState =
    store.get(key) ?? {
      count: 0,
      windowStart: nowMs,
      windowMs: LAB_RATE_WINDOW_MS,
      limit: LAB_RATE_LIMIT,
    };
  const result = checkFixedWindow(existing, nowMs);
  store.set(key, result.state);

  return {
    allowed: result.allowed,
    retryAfterSec: Math.max(1, Math.ceil(result.resetMs / 1000)),
    limit: LAB_RATE_LIMIT,
    remaining: Math.max(0, result.state.limit - result.state.count),
  };
}

/** Test-only: reset the in-memory store so tests don't bleed into each other. */
export function __resetLabRateLimit(): void {
  store.clear();
  lastSweepMs = 0;
}

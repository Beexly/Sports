/**
 * Rate limiter utilities — pure, zero dependencies.
 *
 * Token bucket, sliding window, fixed window, leaky bucket,
 * multi-key stores, throttle/debounce decisions, and policy helpers
 * for API and service protection.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Token Bucket
// ─────────────────────────────────────────────────────────────────────────────

export type TokenBucketState = {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillRate: number; // tokens per second
};

/**
 * Create a new token bucket that starts full.
 */
export function createTokenBucket(
  capacity: number,
  refillRatePerSec: number
): TokenBucketState {
  return {
    tokens: capacity,
    lastRefill: Date.now(),
    capacity,
    refillRate: refillRatePerSec,
  };
}

/**
 * Attempt to consume tokens from the bucket.
 * Refills based on elapsed time, then tries to consume `tokens` (default 1).
 * Returns whether allowed, the updated state, and waitMs until next allowed.
 */
export function consumeToken(
  state: TokenBucketState,
  nowMs?: number,
  tokens?: number
): { allowed: boolean; state: TokenBucketState; waitMs: number } {
  const now = nowMs ?? Date.now();
  const tokensToConsume = tokens ?? 1;
  const elapsedSec = Math.max(0, (now - state.lastRefill) / 1000);
  const refilled = Math.min(
    state.capacity,
    state.tokens + elapsedSec * state.refillRate
  );

  if (refilled >= tokensToConsume) {
    return {
      allowed: true,
      state: {
        ...state,
        tokens: refilled - tokensToConsume,
        lastRefill: now,
      },
      waitMs: 0,
    };
  }

  // Not enough tokens — compute how long until we have enough
  const deficit = tokensToConsume - refilled;
  const waitSec = state.refillRate > 0 ? deficit / state.refillRate : Infinity;
  const waitMs = isFinite(waitSec) ? Math.ceil(waitSec * 1000) : Infinity;

  return {
    allowed: false,
    state: {
      ...state,
      tokens: refilled,
      lastRefill: now,
    },
    waitMs,
  };
}

/**
 * Current stats for a token bucket.
 */
export function tokenBucketStats(
  state: TokenBucketState,
  nowMs?: number
): { available: number; fillPct: number; msUntilFull: number } {
  const now = nowMs ?? Date.now();
  const elapsedSec = Math.max(0, (now - state.lastRefill) / 1000);
  const available = Math.min(
    state.capacity,
    state.tokens + elapsedSec * state.refillRate
  );
  const fillPct = state.capacity > 0 ? available / state.capacity : 1;
  const deficit = state.capacity - available;
  const msUntilFull =
    state.refillRate > 0 ? Math.ceil((deficit / state.refillRate) * 1000) : 0;

  return { available, fillPct, msUntilFull };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Sliding Window Log
// ─────────────────────────────────────────────────────────────────────────────

export type SlidingWindowState = {
  log: number[]; // timestamps of allowed requests (ms)
  windowMs: number;
  limit: number;
};

/**
 * Create a new sliding window log rate limiter.
 */
export function createSlidingWindow(
  windowMs: number,
  limit: number
): SlidingWindowState {
  return { log: [], windowMs, limit };
}

/**
 * Check if a new request is allowed under the sliding window.
 * Prunes old entries, then checks; if allowed, appends the timestamp.
 */
export function checkSlidingWindow(
  state: SlidingWindowState,
  nowMs?: number
): {
  allowed: boolean;
  state: SlidingWindowState;
  requestsInWindow: number;
  oldestMs: number | null;
} {
  const now = nowMs ?? Date.now();
  const cutoff = now - state.windowMs;
  const pruned = state.log.filter((t) => t > cutoff);

  const requestsInWindow = pruned.length;
  const oldestMs = pruned.length > 0 ? (pruned[0] ?? null) : null;

  if (requestsInWindow < state.limit) {
    const newLog = [...pruned, now];
    return {
      allowed: true,
      state: { ...state, log: newLog },
      requestsInWindow: newLog.length,
      oldestMs: newLog[0] ?? null,
    };
  }

  return {
    allowed: false,
    state: { ...state, log: pruned },
    requestsInWindow,
    oldestMs,
  };
}

/**
 * Stats for a sliding window: used, remaining, and when the oldest entry expires.
 */
export function slidingWindowStats(
  state: SlidingWindowState,
  nowMs?: number
): { used: number; remaining: number; resetMs: number } {
  const now = nowMs ?? Date.now();
  const cutoff = now - state.windowMs;
  const active = state.log.filter((t) => t > cutoff);
  const used = active.length;
  const remaining = Math.max(0, state.limit - used);
  const oldest = active[0] ?? null;
  const resetMs =
    oldest !== null ? Math.max(0, oldest + state.windowMs - now) : 0;

  return { used, remaining, resetMs };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Fixed Window
// ─────────────────────────────────────────────────────────────────────────────

export type FixedWindowState = {
  count: number;
  windowStart: number; // ms timestamp
  windowMs: number;
  limit: number;
};

/**
 * Create a new fixed window rate limiter. Window starts now.
 */
export function createFixedWindow(
  windowMs: number,
  limit: number
): FixedWindowState {
  return { count: 0, windowStart: Date.now(), windowMs, limit };
}

/**
 * Check if a request is allowed under the fixed window.
 * Resets count automatically when the window has elapsed.
 */
export function checkFixedWindow(
  state: FixedWindowState,
  nowMs?: number
): { allowed: boolean; state: FixedWindowState; resetMs: number } {
  const now = nowMs ?? Date.now();
  const windowEnd = state.windowStart + state.windowMs;

  let current = state;
  if (now >= windowEnd) {
    // Start a fresh window
    const windowsElapsed = Math.floor((now - state.windowStart) / state.windowMs);
    current = {
      ...state,
      count: 0,
      windowStart: state.windowStart + windowsElapsed * state.windowMs,
    };
  }

  const resetMs = Math.max(0, current.windowStart + current.windowMs - now);

  if (current.count < current.limit) {
    return {
      allowed: true,
      state: { ...current, count: current.count + 1 },
      resetMs,
    };
  }

  return { allowed: false, state: current, resetMs };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Leaky Bucket
// ─────────────────────────────────────────────────────────────────────────────

export type LeakyBucketState = {
  queue: number; // number of items currently queued
  capacity: number;
  leakRatePerSec: number;
  lastLeak: number; // ms timestamp
};

/**
 * Create a new leaky bucket.
 */
export function createLeakyBucket(
  capacity: number,
  leakRatePerSec: number
): LeakyBucketState {
  return { queue: 0, capacity, leakRatePerSec, lastLeak: Date.now() };
}

/**
 * Drain the leaky bucket based on elapsed time (without enqueuing).
 */
export function processLeakyBucket(
  state: LeakyBucketState,
  nowMs?: number
): LeakyBucketState {
  const now = nowMs ?? Date.now();
  const elapsedSec = Math.max(0, (now - state.lastLeak) / 1000);
  const leaked = elapsedSec * state.leakRatePerSec;
  const queue = Math.max(0, state.queue - leaked);
  return { ...state, queue, lastLeak: now };
}

/**
 * Attempt to enqueue a request into the leaky bucket.
 * Leaks first, then checks capacity.
 */
export function enqueueLeakyBucket(
  state: LeakyBucketState,
  nowMs?: number
): { queued: boolean; state: LeakyBucketState; queueSize: number } {
  const drained = processLeakyBucket(state, nowMs);

  if (drained.queue < drained.capacity) {
    const next: LeakyBucketState = { ...drained, queue: drained.queue + 1 };
    return { queued: true, state: next, queueSize: next.queue };
  }

  return { queued: false, state: drained, queueSize: drained.queue };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Throttle Utilities (pure, no timers)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stateless sliding-log check: given a list of past request timestamps,
 * determine whether a new request is allowed.
 */
export function throttleDecision(
  requests: number[],
  windowMs: number,
  limit: number,
  nowMs?: number
): { allowed: boolean; requestsInWindow: number } {
  const now = nowMs ?? Date.now();
  const cutoff = now - windowMs;
  const inWindow = requests.filter((t) => t > cutoff);
  return {
    allowed: inWindow.length < limit,
    requestsInWindow: inWindow.length,
  };
}

/**
 * Stateless debounce decision: should this call fire given last fire time?
 * Fires if nowMs - lastCallMs >= debounceMs, or if never called (null).
 */
export function debounceDecision(
  lastCallMs: number | null,
  debounceMs: number,
  nowMs?: number
): { shouldFire: boolean; nextFireMs: number } {
  const now = nowMs ?? Date.now();

  if (lastCallMs === null) {
    return { shouldFire: true, nextFireMs: now + debounceMs };
  }

  const elapsed = now - lastCallMs;
  if (elapsed >= debounceMs) {
    return { shouldFire: true, nextFireMs: now + debounceMs };
  }

  return { shouldFire: false, nextFireMs: lastCallMs + debounceMs };
}

/**
 * Build standard X-RateLimit-* HTTP response headers.
 */
export function rateLimitHeaders(state: {
  remaining: number;
  limit: number;
  resetMs: number;
}): Record<string, string> {
  const resetSec = Math.ceil(state.resetMs / 1000);
  return {
    "X-RateLimit-Limit": String(state.limit),
    "X-RateLimit-Remaining": String(Math.max(0, state.remaining)),
    "X-RateLimit-Reset": String(resetSec),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Multi-Key Rate Limiting
// ─────────────────────────────────────────────────────────────────────────────

export type MultiKeyStore<T> = Map<string, T>;

/**
 * Check/consume from a per-key token bucket, creating the entry if absent.
 */
export function checkMultiKeyTokenBucket(
  store: MultiKeyStore<TokenBucketState>,
  key: string,
  capacity: number,
  refillRatePerSec: number,
  nowMs?: number
): { allowed: boolean; store: MultiKeyStore<TokenBucketState>; waitMs: number } {
  const now = nowMs ?? Date.now();
  const existing = store.get(key) ?? createTokenBucket(capacity, refillRatePerSec);
  // Sync lastRefill to now if it was just created
  const state: TokenBucketState =
    store.has(key) ? existing : { ...existing, lastRefill: now };

  const result = consumeToken(state, now);
  const next = new Map(store);
  next.set(key, result.state);
  return { allowed: result.allowed, store: next, waitMs: result.waitMs };
}

/**
 * Check/consume from a per-key fixed window, creating the entry if absent.
 */
export function checkMultiKeyFixedWindow(
  store: MultiKeyStore<FixedWindowState>,
  key: string,
  windowMs: number,
  limit: number,
  nowMs?: number
): { allowed: boolean; store: MultiKeyStore<FixedWindowState>; resetMs: number } {
  const now = nowMs ?? Date.now();
  const existing = store.get(key) ?? { count: 0, windowStart: now, windowMs, limit };

  const result = checkFixedWindow(existing, now);
  const next = new Map(store);
  next.set(key, result.state);
  return { allowed: result.allowed, store: next, resetMs: result.resetMs };
}

/**
 * Remove all fixed-window entries whose window has fully elapsed.
 */
export function evictExpiredKeys(
  store: MultiKeyStore<FixedWindowState>,
  nowMs?: number
): MultiKeyStore<FixedWindowState> {
  const now = nowMs ?? Date.now();
  const next = new Map<string, FixedWindowState>();
  for (const [key, state] of store) {
    if (now < state.windowStart + state.windowMs) {
      next.set(key, state);
    }
  }
  return next;
}

/**
 * Return the number of keys in a multi-key store.
 */
export function storeSize(store: MultiKeyStore<unknown>): number {
  return store.size;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Rate Limit Policy Helpers
// ─────────────────────────────────────────────────────────────────────────────

export type RateLimitPolicy = {
  windowMs: number;
  limit: number;
  burst?: number; // token bucket capacity for short bursts
};

/**
 * Return the rate limit policy for a subscription tier.
 * - free:  60/min, no burst
 * - pro:   300/min, burst=30
 * - elite: 1000/min, burst=100
 */
export function tieredPolicy(tier: "free" | "pro" | "elite"): RateLimitPolicy {
  switch (tier) {
    case "free":
      return { windowMs: 60_000, limit: 60 };
    case "pro":
      return { windowMs: 60_000, limit: 300, burst: 30 };
    case "elite":
      return { windowMs: 60_000, limit: 1000, burst: 100 };
  }
}

/**
 * Return true if the current request rate exceeds the policy's limit.
 */
export function exceedsPolicy(
  requests: number[],
  policy: RateLimitPolicy,
  nowMs?: number
): boolean {
  const { allowed } = throttleDecision(requests, policy.windowMs, policy.limit, nowMs);
  return !allowed;
}

/**
 * Exponential backoff with optional deterministic jitter.
 * base=1000ms, maxBackoff=30000ms, jitter=false.
 * Deterministic jitter = base * 0.25 * (attempt % 4) / 4.
 */
export function backoffMs(
  attempt: number,
  base = 1000,
  maxBackoff = 30_000,
  jitter = false
): number {
  const exp = Math.min(base * Math.pow(2, attempt), maxBackoff);
  if (!jitter) return exp;
  const jitterAmount = base * 0.25 * ((attempt % 4) / 4);
  return Math.min(exp + jitterAmount, maxBackoff);
}

/**
 * Return the wait time (ms) until a request would be allowed,
 * dispatching to the correct algorithm based on the state's shape.
 */
export function retryAfterMs(
  state: TokenBucketState | FixedWindowState | SlidingWindowState,
  nowMs?: number
): number {
  const now = nowMs ?? Date.now();

  // TokenBucketState: has `tokens` and `refillRate`
  if ("refillRate" in state) {
    const result = consumeToken(state, now);
    return result.waitMs;
  }

  // SlidingWindowState: has `log`
  if ("log" in state) {
    const cutoff = now - state.windowMs;
    const active = state.log.filter((t) => t > cutoff);
    if (active.length < state.limit) return 0;
    const oldest = active[0] ?? null;
    if (oldest === null) return 0;
    return Math.max(0, oldest + state.windowMs - now);
  }

  // FixedWindowState: has `count` and `windowStart`
  const windowEnd = state.windowStart + state.windowMs;
  if (state.count < state.limit) return 0;
  return Math.max(0, windowEnd - now);
}

/**
 * Resilience utilities: retry with exponential backoff, circuit breaker,
 * rate limiter, bulkhead, memoization with TTL, hedged requests.
 *
 * Pure TypeScript — no npm dependencies. No `any`. All functions/classes
 * exported individually so callers can tree-shake as needed.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RetryConfig {
  /** Total attempts including the first call (default: 3) */
  maxAttempts: number;
  /** Base delay in ms for the first retry (default: 100) */
  baseDelayMs: number;
  /** Cap on computed delay; default 30000 */
  maxDelayMs?: number;
  /** Exponential multiplier applied each retry (default: 2) */
  backoffFactor?: number;
  /** Add ±20% random jitter to delays (default: false) */
  jitter?: boolean;
  /** Return true to allow a retry; default: retry on every error */
  retryOn?: (error: unknown) => boolean;
  /** Called before each retry sleep with the attempt index (1-based), the error, and delay */
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
}

export interface RetryResult<T> {
  value: T;
  attempts: number;
  totalDelayMs: number;
  errors: Error[];
}

export interface CircuitBreakerConfig {
  /** Consecutive failures before circuit OPEN (default: 5) */
  failureThreshold: number;
  /** Consecutive successes in HALF_OPEN to close circuit (default: 2) */
  successThreshold: number;
  /** Ms to wait in OPEN state before moving to HALF_OPEN (default: 60000) */
  timeout: number;
  /** Called when the state machine transitions */
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureAt?: Date;
  totalCalls: number;
  totalFailures: number;
  totalSuccesses: number;
}

export interface TimeoutConfig {
  timeoutMs: number;
  /** Custom error message (default: 'Operation timed out') */
  timeoutError?: string;
}

// ---------------------------------------------------------------------------
// Internal sleep helper
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// backoffDelay
// ---------------------------------------------------------------------------

/**
 * Compute the raw (no-random) exponential backoff delay for a given attempt.
 *
 * @param attempt      1-indexed retry number (first retry = 1)
 * @param baseDelayMs  delay for the very first retry
 * @param backoffFactor multiplier per retry step (default 2)
 * @param maxDelayMs   cap on the returned value (default 30000)
 * @param jitter       ignored in this pure function — use withJitter() instead
 */
export function backoffDelay(
  attempt: number,
  baseDelayMs: number,
  backoffFactor = 2,
  maxDelayMs = 30_000,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  jitter?: boolean,
): number {
  const raw = baseDelayMs * Math.pow(backoffFactor, attempt - 1);
  return Math.min(raw, maxDelayMs);
}

// ---------------------------------------------------------------------------
// withJitter
// ---------------------------------------------------------------------------

/**
 * Apply random ±factor jitter to a delay.
 *
 * @param delayMs base delay in milliseconds
 * @param factor  fraction to vary by (default 0.2 → ±20%)
 */
export function withJitter(delayMs: number, factor = 0.2): number {
  return delayMs * (1 - factor + Math.random() * 2 * factor);
}

// ---------------------------------------------------------------------------
// backoffSchedule
// ---------------------------------------------------------------------------

/**
 * Returns the array of delays (in ms) for retries 1 through maxAttempts-1.
 * Length is always maxAttempts-1.
 */
export function backoffSchedule(
  maxAttempts: number,
  baseDelayMs: number,
  backoffFactor = 2,
  maxDelayMs = 30_000,
): number[] {
  const delays: number[] = [];
  for (let i = 1; i < maxAttempts; i++) {
    delays.push(backoffDelay(i, baseDelayMs, backoffFactor, maxDelayMs));
  }
  return delays;
}

// ---------------------------------------------------------------------------
// retry
// ---------------------------------------------------------------------------

/**
 * Execute fn up to config.maxAttempts times with exponential backoff between
 * retries. Returns a full RetryResult with attempt count, cumulative delay, and
 * the list of errors encountered.
 *
 * Throws the last error if all attempts are exhausted.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  config?: Partial<RetryConfig>,
): Promise<RetryResult<T>> {
  const maxAttempts = config?.maxAttempts ?? 3;
  const baseDelayMs = config?.baseDelayMs ?? 100;
  const maxDelayMs = config?.maxDelayMs ?? 30_000;
  const factor = config?.backoffFactor ?? 2;
  const useJitter = config?.jitter ?? false;
  const retryOn = config?.retryOn;
  const onRetry = config?.onRetry;

  const errors: Error[] = [];
  let totalDelayMs = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const value = await fn();
      return { value, attempts: attempt, totalDelayMs, errors };
    } catch (err: unknown) {
      const errObj = err instanceof Error ? err : new Error(String(err));
      errors.push(errObj);

      const isLast = attempt === maxAttempts;
      const shouldRetry = retryOn ? retryOn(err) : true;

      if (isLast || !shouldRetry) {
        throw errObj;
      }

      const delay = backoffDelay(attempt, baseDelayMs, factor, maxDelayMs);
      const actualDelay = useJitter ? withJitter(delay) : delay;

      onRetry?.(attempt, err, actualDelay);
      totalDelayMs += actualDelay;
      await sleep(actualDelay);
    }
  }

  // Should never reach here, but TypeScript needs this
  throw errors[errors.length - 1] ?? new Error("retry: no attempts made");
}

// ---------------------------------------------------------------------------
// retrySimple
// ---------------------------------------------------------------------------

/**
 * Simpler retry that just returns T (throws on exhaustion).
 */
export async function retrySimple<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 100,
): Promise<T> {
  const result = await retry(fn, { maxAttempts, baseDelayMs });
  return result.value;
}

// ---------------------------------------------------------------------------
// TimeoutError
// ---------------------------------------------------------------------------

export class TimeoutError extends Error {
  readonly isTimeout = true as const;

  constructor(message = "Operation timed out") {
    super(message);
    this.name = "TimeoutError";
  }
}

// ---------------------------------------------------------------------------
// withTimeout
// ---------------------------------------------------------------------------

/**
 * Races fn() against a timeout. Rejects with TimeoutError if the timeout
 * fires first.
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  config: TimeoutConfig,
): Promise<T> {
  const message = config.timeoutError ?? "Operation timed out";

  return new Promise<T>((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new TimeoutError(message));
      }
    }, config.timeoutMs);

    fn().then(
      (value) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(value);
        }
      },
      (err: unknown) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      },
    );
  });
}

// ---------------------------------------------------------------------------
// retryWithTimeout
// ---------------------------------------------------------------------------

/**
 * Retry fn with a per-attempt timeout. Each individual attempt is wrapped in
 * withTimeout; the overall retry config controls how many attempts are made.
 */
export async function retryWithTimeout<T>(
  fn: () => Promise<T>,
  retryConfig?: Partial<RetryConfig>,
  timeoutMs?: number,
): Promise<T> {
  const wrappedFn =
    timeoutMs !== undefined
      ? () => withTimeout(fn, { timeoutMs })
      : fn;

  const result = await retry(wrappedFn, retryConfig);
  return result.value;
}

// ---------------------------------------------------------------------------
// retryWithFallback
// ---------------------------------------------------------------------------

/**
 * Like retry, but returns a fallback value instead of throwing when all
 * attempts fail.
 */
export async function retryWithFallback<T>(
  fn: () => Promise<T>,
  fallback: T | (() => T | Promise<T>),
  config?: Partial<RetryConfig>,
): Promise<T> {
  try {
    const result = await retry(fn, config);
    return result.value;
  } catch {
    return typeof fallback === "function"
      ? await (fallback as () => T | Promise<T>)()
      : fallback;
  }
}

// ---------------------------------------------------------------------------
// CircuitOpenError
// ---------------------------------------------------------------------------

export class CircuitOpenError extends Error {
  readonly circuitName: string;

  constructor(name: string) {
    super(`Circuit breaker '${name}' is OPEN`);
    this.name = "CircuitOpenError";
    this.circuitName = name;
  }
}

// ---------------------------------------------------------------------------
// CircuitBreaker
// ---------------------------------------------------------------------------

export class CircuitBreaker {
  private readonly _name: string;
  private readonly _failureThreshold: number;
  private readonly _successThreshold: number;
  private readonly _timeout: number;
  private readonly _onStateChange?: (from: CircuitState, to: CircuitState) => void;

  private _state: CircuitState = "CLOSED";
  private _failures = 0;
  private _successes = 0;
  private _lastFailureAt?: Date;
  private _openedAt?: number;
  private _totalCalls = 0;
  private _totalFailures = 0;
  private _totalSuccesses = 0;

  constructor(name: string, config?: Partial<CircuitBreakerConfig>) {
    this._name = name;
    this._failureThreshold = config?.failureThreshold ?? 5;
    this._successThreshold = config?.successThreshold ?? 2;
    this._timeout = config?.timeout ?? 60_000;
    this._onStateChange = config?.onStateChange;
  }

  get state(): CircuitState {
    return this._state;
  }

  get stats(): CircuitBreakerStats {
    return {
      state: this._state,
      failures: this._failures,
      successes: this._successes,
      lastFailureAt: this._lastFailureAt,
      totalCalls: this._totalCalls,
      totalFailures: this._totalFailures,
      totalSuccesses: this._totalSuccesses,
    };
  }

  reset(): void {
    const prev = this._state;
    this._state = "CLOSED";
    this._failures = 0;
    this._successes = 0;
    this._openedAt = undefined;
    if (prev !== "CLOSED") this._onStateChange?.(prev, "CLOSED");
  }

  trip(): void {
    const prev = this._state;
    this._state = "OPEN";
    this._openedAt = Date.now();
    this._failures = this._failureThreshold; // mark as at threshold
    if (prev !== "OPEN") this._onStateChange?.(prev, "OPEN");
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this._totalCalls++;

    // Check if OPEN → maybe transition to HALF_OPEN
    if (this._state === "OPEN") {
      const elapsed = Date.now() - (this._openedAt ?? 0);
      if (elapsed >= this._timeout) {
        this._transition("OPEN", "HALF_OPEN");
        this._successes = 0;
      } else {
        throw new CircuitOpenError(this._name);
      }
    }

    try {
      const value = await fn();
      this._totalSuccesses++;

      if (this._state === "HALF_OPEN") {
        this._successes++;
        if (this._successes >= this._successThreshold) {
          this._transition("HALF_OPEN", "CLOSED");
          this._failures = 0;
          this._successes = 0;
        }
      } else {
        // CLOSED — reset failure streak on success
        this._failures = 0;
      }

      return value;
    } catch (err: unknown) {
      this._totalFailures++;
      this._failures++;
      this._lastFailureAt = new Date();

      if (this._state === "HALF_OPEN") {
        this._successes = 0;
        this._transition("HALF_OPEN", "OPEN");
        this._openedAt = Date.now();
      } else if (this._failures >= this._failureThreshold) {
        this._transition("CLOSED", "OPEN");
        this._openedAt = Date.now();
      }

      throw err;
    }
  }

  private _transition(from: CircuitState, to: CircuitState): void {
    this._state = to;
    this._onStateChange?.(from, to);
  }
}

// ---------------------------------------------------------------------------
// RateLimiter (token bucket)
// ---------------------------------------------------------------------------

export class RateLimiter {
  private readonly _maxRequests: number;
  private readonly _windowMs: number;
  private _tokens: number;
  private _windowStart: number;
  private _queue: Array<() => void> = [];

  constructor(maxRequests: number, windowMs: number) {
    this._maxRequests = maxRequests;
    this._windowMs = windowMs;
    this._tokens = maxRequests;
    this._windowStart = Date.now();
  }

  private _refill(): void {
    const now = Date.now();
    if (now - this._windowStart >= this._windowMs) {
      this._tokens = this._maxRequests;
      this._windowStart = now;
    }
  }

  get availableTokens(): number {
    this._refill();
    return this._tokens;
  }

  tryAcquire(): boolean {
    this._refill();
    if (this._tokens > 0) {
      this._tokens--;
      return true;
    }
    return false;
  }

  async acquire(): Promise<void> {
    if (this.tryAcquire()) return;

    return new Promise<void>((resolve) => {
      this._queue.push(resolve);

      const tryDequeue = (): void => {
        if (this._queue.length === 0) return;
        if (this.tryAcquire()) {
          const next = this._queue.shift();
          next?.();
        } else {
          const remaining = this._windowMs - (Date.now() - this._windowStart);
          setTimeout(tryDequeue, Math.max(remaining, 0));
        }
      };

      const remaining = this._windowMs - (Date.now() - this._windowStart);
      setTimeout(tryDequeue, Math.max(remaining, 0));
    });
  }

  reset(): void {
    this._tokens = this._maxRequests;
    this._windowStart = Date.now();
    // drain queue
    const queued = this._queue.splice(0, this._maxRequests);
    for (const resolve of queued) {
      this._tokens--;
      resolve();
    }
  }
}

// ---------------------------------------------------------------------------
// BulkheadRejectedError
// ---------------------------------------------------------------------------

export class BulkheadRejectedError extends Error {
  constructor() {
    super("Bulkhead queue is full — request rejected");
    this.name = "BulkheadRejectedError";
  }
}

// ---------------------------------------------------------------------------
// Bulkhead (concurrency limiter)
// ---------------------------------------------------------------------------

export class Bulkhead {
  private readonly _maxConcurrent: number;
  private readonly _maxQueue: number;
  private _active = 0;
  private _queued = 0;
  private readonly _waitQueue: Array<() => void> = [];

  constructor(maxConcurrent: number, maxQueue?: number) {
    this._maxConcurrent = maxConcurrent;
    this._maxQueue = maxQueue ?? Infinity;
  }

  get active(): number {
    return this._active;
  }

  get queued(): number {
    return this._queued;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this._active < this._maxConcurrent) {
      this._active++;
      try {
        return await fn();
      } finally {
        this._active--;
        this._drain();
      }
    }

    // Need to queue
    if (this._queued >= this._maxQueue) {
      throw new BulkheadRejectedError();
    }

    this._queued++;
    await new Promise<void>((resolve) => {
      this._waitQueue.push(resolve);
    });
    this._queued--;

    this._active++;
    try {
      return await fn();
    } finally {
      this._active--;
      this._drain();
    }
  }

  private _drain(): void {
    const next = this._waitQueue.shift();
    next?.();
  }
}

// ---------------------------------------------------------------------------
// memoizeAsync
// ---------------------------------------------------------------------------

interface CacheEntry<V> {
  value: V;
  createdAt: number;
  revalidating?: boolean;
}

/**
 * Memoize an async function with optional TTL, stale-while-revalidate, LRU
 * eviction, and in-flight deduplication.
 */
export function memoizeAsync<K, V>(
  fn: (key: K) => Promise<V>,
  options?: {
    ttlMs?: number;
    staleMs?: number;
    maxSize?: number;
    cacheKey?: (key: K) => string;
  },
): (key: K) => Promise<V> {
  const cache = new Map<string, CacheEntry<V>>();
  const inFlight = new Map<string, Promise<V>>();
  const accessOrder: string[] = [];

  const getKey = options?.cacheKey ?? ((k: K) => JSON.stringify(k));
  const ttlMs = options?.ttlMs;
  const staleMs = options?.staleMs;
  const maxSize = options?.maxSize;

  function evictIfNeeded(): void {
    if (maxSize !== undefined) {
      while (cache.size > maxSize && accessOrder.length > 0) {
        const oldest = accessOrder.shift();
        if (oldest !== undefined) cache.delete(oldest);
      }
    }
  }

  function touch(k: string): void {
    const idx = accessOrder.indexOf(k);
    if (idx !== -1) accessOrder.splice(idx, 1);
    accessOrder.push(k);
  }

  function isExpired(entry: CacheEntry<V>): boolean {
    if (ttlMs === undefined) return false;
    return Date.now() - entry.createdAt > ttlMs;
  }

  function isStale(entry: CacheEntry<V>): boolean {
    if (staleMs === undefined) return false;
    return Date.now() - entry.createdAt > staleMs;
  }

  return async function memoized(key: K): Promise<V> {
    const k = getKey(key);
    const existing = cache.get(k);

    if (existing !== undefined && !isExpired(existing)) {
      touch(k);
      if (isStale(existing) && !existing.revalidating) {
        existing.revalidating = true;
        // Revalidate in background
        fn(key)
          .then((fresh) => {
            cache.set(k, { value: fresh, createdAt: Date.now() });
          })
          .catch(() => {
            // Keep stale value on background error
          })
          .finally(() => {
            const entry = cache.get(k);
            if (entry) entry.revalidating = false;
          });
      }
      return existing.value;
    }

    // Check in-flight deduplication
    const inFlightPromise = inFlight.get(k);
    if (inFlightPromise !== undefined) return inFlightPromise;

    const promise = fn(key)
      .then((value) => {
        cache.set(k, { value, createdAt: Date.now() });
        touch(k);
        evictIfNeeded();
        return value;
      })
      .finally(() => {
        inFlight.delete(k);
      });

    inFlight.set(k, promise);
    return promise;
  };
}

// ---------------------------------------------------------------------------
// hedgedRequest
// ---------------------------------------------------------------------------

/**
 * Run multiple async functions, optionally staggered, and return the first
 * successful result. If all fail, throws the last error.
 */
export async function hedgedRequest<T>(
  fns: Array<() => Promise<T>>,
  options?: {
    delayMs?: number;
    timeout?: number;
  },
): Promise<T> {
  if (fns.length === 0) throw new Error("hedgedRequest: no functions provided");

  const delayMs = options?.delayMs ?? 0;
  const timeoutMs = options?.timeout;

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    let launched = 0;
    const errors: unknown[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;

    const done = (value: T): void => {
      if (!settled) {
        settled = true;
        if (timer !== null) clearTimeout(timer);
        resolve(value);
      }
    };

    const fail = (err: unknown): void => {
      errors.push(err);
      if (errors.length === fns.length && !settled) {
        settled = true;
        if (timer !== null) clearTimeout(timer);
        reject(errors[errors.length - 1]);
      }
    };

    const launch = (i: number): void => {
      launched++;
      const fn = fns[i];
      if (fn === undefined) return;
      fn().then(done, fail);
    };

    if (timeoutMs !== undefined) {
      timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new TimeoutError("hedgedRequest timed out"));
        }
      }, timeoutMs);
    }

    if (delayMs === 0) {
      for (let i = 0; i < fns.length; i++) launch(i);
    } else {
      launch(0);
      for (let i = 1; i < fns.length; i++) {
        const idx = i;
        setTimeout(() => {
          if (!settled) launch(idx);
        }, delayMs * idx);
      }
    }

    void launched; // suppress unused-var warning
  });
}

// ---------------------------------------------------------------------------
// withResilience
// ---------------------------------------------------------------------------

/**
 * Compose circuit breaker → timeout → retry → fallback in a single call.
 */
export async function withResilience<T>(
  fn: () => Promise<T>,
  options: {
    retry?: Partial<RetryConfig>;
    timeout?: number;
    fallback?: T;
    circuitBreaker?: CircuitBreaker;
  },
): Promise<T> {
  const { retry: retryConfig, timeout: timeoutMs, fallback, circuitBreaker } = options;

  // Build the innermost function (with optional per-attempt timeout)
  const withOptionalTimeout: () => Promise<T> =
    timeoutMs !== undefined
      ? () => withTimeout(fn, { timeoutMs })
      : fn;

  // Wrap in retry
  const withOptionalRetry: () => Promise<T> = retryConfig !== undefined
    ? async () => {
        const result = await retry(withOptionalTimeout, retryConfig);
        return result.value;
      }
    : withOptionalTimeout;

  // Wrap in circuit breaker
  const withOptionalCB: () => Promise<T> = circuitBreaker !== undefined
    ? () => circuitBreaker.execute(withOptionalRetry)
    : withOptionalRetry;

  try {
    return await withOptionalCB();
  } catch (err: unknown) {
    if (fallback !== undefined) return fallback;
    throw err;
  }
}

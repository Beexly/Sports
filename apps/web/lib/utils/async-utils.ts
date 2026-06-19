/**
 * Pure TypeScript async utilities for Galaxy Sports Edge.
 * No npm dependencies. No `any`. Tree-shakeable named exports.
 */

// ---------------------------------------------------------------------------
// TimeoutError
// ---------------------------------------------------------------------------

export class TimeoutError extends Error {
  constructor(message?: string) {
    super(message ?? "Operation timed out");
    this.name = "TimeoutError";
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

// ---------------------------------------------------------------------------
// Debounce
// ---------------------------------------------------------------------------

type AnyFn = (...args: unknown[]) => unknown;

export function debounce<T extends AnyFn>(
  fn: T,
  delayMs: number,
  opts?: { leading?: boolean; trailing?: boolean }
): T & { cancel(): void; flush(): ReturnType<T> | undefined } {
  const leading = opts?.leading ?? false;
  const trailing = opts?.trailing ?? true;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let pendingCall: (() => ReturnType<T>) | null = null;
  let leadingFired = false;

  function invoke(): ReturnType<T> {
    const result = (pendingCall as () => ReturnType<T>)();
    lastArgs = null;
    pendingCall = null;
    return result;
  }

  function debounced(this: unknown, ...args: Parameters<T>): ReturnType<T> | undefined {
    lastArgs = args;
    pendingCall = () => fn.apply(this, args as Parameters<T>) as ReturnType<T>;

    const isFirstCall = timer === null && !leadingFired;

    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }

    if (leading && isFirstCall) {
      leadingFired = true;
      const result = invoke();
      if (!trailing) return result;
    }

    timer = setTimeout(() => {
      timer = null;
      leadingFired = false;
      if (trailing && lastArgs !== null) {
        invoke();
      }
    }, delayMs);

    return undefined;
  }

  debounced.cancel = function () {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    lastArgs = null;
    pendingCall = null;
    leadingFired = false;
  };

  debounced.flush = function (): ReturnType<T> | undefined {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
      leadingFired = false;
      if (lastArgs !== null) {
        return invoke();
      }
    }
    return undefined;
  };

  return debounced as T & { cancel(): void; flush(): ReturnType<T> | undefined };
}

// ---------------------------------------------------------------------------
// Throttle
// ---------------------------------------------------------------------------

export function throttle<T extends AnyFn>(
  fn: T,
  intervalMs: number,
  opts?: { leading?: boolean; trailing?: boolean }
): T & { cancel(): void } {
  const leading = opts?.leading ?? true;
  const trailing = opts?.trailing ?? true;

  let lastCall = -Infinity; // not 0 so leading=false doesn't fire on first call
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingCall: (() => ReturnType<T>) | null = null;
  let cancelled = false;

  function invoke(): ReturnType<T> {
    lastCall = Date.now();
    return (pendingCall as () => ReturnType<T>)();
  }

  function throttled(this: unknown, ...args: Parameters<T>): ReturnType<T> | undefined {
    if (cancelled) return undefined;
    pendingCall = () => fn.apply(this, args as Parameters<T>) as ReturnType<T>;

    const now = Date.now();
    const elapsed = now - lastCall;
    const remaining = intervalMs - elapsed;

    if (elapsed >= intervalMs) {
      if (!leading && lastCall === -Infinity) {
        // leading=false: skip the very first call, set up trailing timer
        if (timer === null && trailing) {
          timer = setTimeout(() => {
            timer = null;
            if (!cancelled) {
              invoke();
            }
          }, intervalMs);
        }
        return undefined;
      }
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      return invoke();
    }

    if (trailing && timer === null) {
      timer = setTimeout(() => {
        timer = null;
        if (!cancelled) {
          invoke();
        }
      }, remaining);
    }

    return undefined;
  }

  throttled.cancel = function () {
    cancelled = true;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    pendingCall = null;
    lastCall = 0;
  };

  return throttled as T & { cancel(): void };
}

// ---------------------------------------------------------------------------
// delay
// ---------------------------------------------------------------------------

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// timeout
// ---------------------------------------------------------------------------

export function timeout<T>(promise: Promise<T>, ms: number, message?: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(message));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

// ---------------------------------------------------------------------------
// retry
// ---------------------------------------------------------------------------

export async function retry<T>(
  fn: () => Promise<T>,
  opts?: {
    attempts?: number;
    delayMs?: number;
    backoff?: number;
    onError?: (err: unknown, attempt: number) => void;
  }
): Promise<T> {
  const attempts = opts?.attempts ?? 3;
  const delayMs = opts?.delayMs ?? 0;
  const backoff = opts?.backoff ?? 1;
  const onError = opts?.onError;

  let lastErr: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (onError) onError(err, i);
      if (i < attempts && delayMs > 0) {
        await delay(delayMs * Math.pow(backoff, i - 1));
      }
    }
  }
  throw lastErr;
}

// ---------------------------------------------------------------------------
// race
// ---------------------------------------------------------------------------

export function race<T>(promises: Promise<T>[]): Promise<T> {
  if (promises.length === 0) {
    return Promise.reject(new Error("race: empty array"));
  }
  return Promise.race(promises);
}

// ---------------------------------------------------------------------------
// allSettledResults
// ---------------------------------------------------------------------------

export function allSettledResults<T>(
  promises: Promise<T>[]
): Promise<Array<{ status: "fulfilled"; value: T } | { status: "rejected"; reason: unknown }>> {
  return Promise.allSettled(promises) as Promise<
    Array<{ status: "fulfilled"; value: T } | { status: "rejected"; reason: unknown }>
  >;
}

// ---------------------------------------------------------------------------
// any
// ---------------------------------------------------------------------------

export function any<T>(promises: Promise<T>[]): Promise<T> {
  if (promises.length === 0) {
    return Promise.reject(new AggregateError([], "any: empty array"));
  }
  // Use native Promise.any if available (ES2021), else polyfill
  if (typeof (Promise as { any?: unknown }).any === "function") {
    return (Promise as unknown as { any: (p: Promise<T>[]) => Promise<T> }).any(promises);
  }

  return new Promise<T>((resolve, reject) => {
    const errors: unknown[] = new Array(promises.length);
    let rejected = 0;
    promises.forEach((p, i) => {
      p.then(resolve, (err) => {
        errors[i] = err;
        rejected++;
        if (rejected === promises.length) {
          reject(new AggregateError(errors, "All promises were rejected"));
        }
      });
    });
  });
}

// ---------------------------------------------------------------------------
// mapConcurrent
// ---------------------------------------------------------------------------

export async function mapConcurrent<T, U>(
  items: T[],
  fn: (item: T, index: number) => Promise<U>,
  concurrency: number
): Promise<U[]> {
  const results: U[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i], i);
    }
  }

  const workers: Promise<void>[] = [];
  const limit = Math.min(concurrency, items.length);
  for (let i = 0; i < limit; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------------
// mapSerial
// ---------------------------------------------------------------------------

export async function mapSerial<T, U>(
  items: T[],
  fn: (item: T, index: number) => Promise<U>
): Promise<U[]> {
  const results: U[] = [];
  for (let i = 0; i < items.length; i++) {
    results.push(await fn(items[i], i));
  }
  return results;
}

// ---------------------------------------------------------------------------
// filterAsync
// ---------------------------------------------------------------------------

export async function filterAsync<T>(
  items: T[],
  predicate: (item: T) => Promise<boolean>
): Promise<T[]> {
  const results: T[] = [];
  for (const item of items) {
    if (await predicate(item)) {
      results.push(item);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// reduceAsync
// ---------------------------------------------------------------------------

export async function reduceAsync<T, U>(
  items: T[],
  fn: (acc: U, item: T, index: number) => Promise<U>,
  initial: U
): Promise<U> {
  let acc = initial;
  for (let i = 0; i < items.length; i++) {
    acc = await fn(acc, items[i], i);
  }
  return acc;
}

// ---------------------------------------------------------------------------
// Semaphore
// ---------------------------------------------------------------------------

export class Semaphore {
  private _permits: number;
  private _queue: Array<() => void> = [];

  constructor(permits: number) {
    if (permits < 1) throw new RangeError("Semaphore: permits must be >= 1");
    this._permits = permits;
  }

  acquire(): Promise<void> {
    if (this._permits > 0) {
      this._permits--;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this._queue.push(resolve);
    });
  }

  release(): void {
    if (this._queue.length > 0) {
      const next = this._queue.shift()!;
      next();
    } else {
      this._permits++;
    }
  }

  get available(): number {
    return this._permits;
  }

  get queue(): number {
    return this._queue.length;
  }
}

// ---------------------------------------------------------------------------
// AsyncQueue
// ---------------------------------------------------------------------------

export class AsyncQueue<T> {
  private _items: T[] = [];
  private _waiters: Array<(item: T) => void> = [];
  private readonly _maxSize: number;

  constructor(opts?: { maxSize?: number }) {
    this._maxSize = opts?.maxSize ?? Infinity;
  }

  enqueue(item: T): void {
    if (this._items.length >= this._maxSize) {
      throw new Error("AsyncQueue: queue is full");
    }
    if (this._waiters.length > 0) {
      const resolve = this._waiters.shift()!;
      resolve(item);
    } else {
      this._items.push(item);
    }
  }

  dequeue(): Promise<T> {
    if (this._items.length > 0) {
      return Promise.resolve(this._items.shift()!);
    }
    return new Promise<T>((resolve) => {
      this._waiters.push(resolve);
    });
  }

  get size(): number {
    return this._items.length;
  }

  get isEmpty(): boolean {
    return this._items.length === 0;
  }

  drain(): Promise<void> {
    if (this._items.length === 0 && this._waiters.length === 0) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      const check = (): void => {
        if (this._items.length === 0) {
          resolve();
        } else {
          // Poll until empty
          const interval = setInterval(() => {
            if (this._items.length === 0) {
              clearInterval(interval);
              resolve();
            }
          }, 0);
        }
      };
      check();
    });
  }
}

// ---------------------------------------------------------------------------
// AsyncPool
// ---------------------------------------------------------------------------

export class AsyncPool<T> {
  private readonly _concurrency: number;
  private _active = 0;
  private _queue: Array<{ fn: () => Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void }> = [];
  private _drainWaiters: Array<() => void> = [];

  constructor(concurrency: number) {
    if (concurrency < 1) throw new RangeError("AsyncPool: concurrency must be >= 1");
    this._concurrency = concurrency;
  }

  add(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this._queue.push({ fn, resolve, reject });
      this._tick();
    });
  }

  private _tick(): void {
    while (this._active < this._concurrency && this._queue.length > 0) {
      const entry = this._queue.shift()!;
      this._active++;
      entry.fn().then(
        (value) => {
          this._active--;
          entry.resolve(value);
          this._tick();
          this._checkDrain();
        },
        (err) => {
          this._active--;
          entry.reject(err);
          this._tick();
          this._checkDrain();
        }
      );
    }
  }

  private _checkDrain(): void {
    if (this._active === 0 && this._queue.length === 0) {
      const waiters = this._drainWaiters.splice(0);
      for (const w of waiters) w();
    }
  }

  drain(): Promise<void> {
    if (this._active === 0 && this._queue.length === 0) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this._drainWaiters.push(resolve);
    });
  }
}

// ---------------------------------------------------------------------------
// memoizeAsync
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  value: T | undefined;
  promise: Promise<T> | undefined;
  expiresAt: number;
  insertOrder: number;
}

export function memoizeAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  opts?: {
    ttlMs?: number;
    keyFn?: (...args: Parameters<T>) => string;
    maxSize?: number;
  }
): T & { invalidate(...args: Parameters<T>): void; clear(): void; size(): number } {
  const ttlMs = opts?.ttlMs ?? Infinity;
  const keyFn = opts?.keyFn ?? ((...args: Parameters<T>) => JSON.stringify(args));
  const maxSize = opts?.maxSize ?? Infinity;

  const cache = new Map<string, CacheEntry<ReturnType<T>>>();
  let orderCounter = 0;

  function evictLRU(): void {
    if (maxSize === Infinity || cache.size <= maxSize) return;
    // Find oldest by insertOrder
    let oldestKey = "";
    let oldestOrder = Infinity;
    for (const [key, entry] of cache) {
      if (entry.insertOrder < oldestOrder) {
        oldestOrder = entry.insertOrder;
        oldestKey = key;
      }
    }
    if (oldestKey) cache.delete(oldestKey);
  }

  function memoized(this: unknown, ...args: Parameters<T>): ReturnType<T> {
    const key = keyFn(...args);
    const now = Date.now();
    const existing = cache.get(key);

    if (existing) {
      if (now < existing.expiresAt) {
        // Return in-flight promise or resolved value
        if (existing.promise !== undefined) {
          return existing.promise as ReturnType<T>;
        }
        return Promise.resolve(existing.value) as ReturnType<T>;
      } else {
        cache.delete(key);
      }
    }

    const entry: CacheEntry<ReturnType<T>> = {
      value: undefined,
      promise: undefined,
      expiresAt: ttlMs === Infinity ? Infinity : now + ttlMs,
      insertOrder: orderCounter++,
    };
    cache.set(key, entry);
    evictLRU();

    const promise = (fn.apply(this, args) as Promise<ReturnType<T>>).then(
      (value) => {
        const e = cache.get(key);
        if (e) {
          e.value = value;
          e.promise = undefined;
        }
        return value;
      },
      (err) => {
        // Remove failed entries so next call retries
        cache.delete(key);
        throw err;
      }
    );

    entry.promise = promise;

    return promise as ReturnType<T>;
  }

  memoized.invalidate = function (...args: Parameters<T>): void {
    const key = keyFn(...args);
    cache.delete(key);
  };

  memoized.clear = function (): void {
    cache.clear();
  };

  memoized.size = function (): number {
    return cache.size;
  };

  return memoized as T & { invalidate(...args: Parameters<T>): void; clear(): void; size(): number };
}

// ---------------------------------------------------------------------------
// waitFor
// ---------------------------------------------------------------------------

export function waitFor(
  check: () => boolean | Promise<boolean>,
  opts?: { intervalMs?: number; timeoutMs?: number }
): Promise<void> {
  const intervalMs = opts?.intervalMs ?? 50;
  const timeoutMs = opts?.timeoutMs ?? 5000;

  return new Promise<void>((resolve, reject) => {
    const start = Date.now();
    let running = true;

    function tryCheck(): void {
      if (!running) return;
      const elapsed = Date.now() - start;
      if (elapsed >= timeoutMs) {
        running = false;
        reject(new TimeoutError("waitFor: condition not met within timeout"));
        return;
      }

      Promise.resolve(check()).then(
        (result) => {
          if (!running) return;
          if (result) {
            running = false;
            resolve();
          } else {
            setTimeout(tryCheck, intervalMs);
          }
        },
        (err) => {
          if (!running) return;
          running = false;
          reject(err);
        }
      );
    }

    tryCheck();
  });
}

// ---------------------------------------------------------------------------
// once
// ---------------------------------------------------------------------------

export function once<T>(
  emitterOn: (cb: (value: T) => void) => void,
  emitterOff: (cb: (value: T) => void) => void
): Promise<T> {
  return new Promise<T>((resolve) => {
    const handler = (value: T): void => {
      emitterOff(handler);
      resolve(value);
    };
    emitterOn(handler);
  });
}

// ---------------------------------------------------------------------------
// PriorityTaskRunner
// ---------------------------------------------------------------------------

export interface Task<T> {
  id: string;
  fn: () => Promise<T>;
  priority?: number;
}

export class PriorityTaskRunner<T> {
  private _tasks: Task<T>[] = [];

  add(task: Task<T>): void {
    this._tasks.push(task);
  }

  async run(
    concurrency = 1
  ): Promise<Array<{ id: string; result: T | null; error: unknown | null }>> {
    // Sort by priority descending (higher priority first)
    const sorted = [...this._tasks].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    const outcomes: Array<{ id: string; result: T | null; error: unknown | null }> = [];
    const orderMap = new Map<string, number>();
    sorted.forEach((t, i) => orderMap.set(t.id, i));

    await mapConcurrent(
      sorted,
      async (task) => {
        try {
          const result = await task.fn();
          outcomes.push({ id: task.id, result, error: null });
        } catch (err) {
          outcomes.push({ id: task.id, result: null, error: err });
        }
      },
      concurrency
    );

    // Restore priority order
    outcomes.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
    return outcomes;
  }
}

// ---------------------------------------------------------------------------
// CancelToken
// ---------------------------------------------------------------------------

export class CancelToken {
  private _cancelled = false;
  private _reason: string | undefined;
  private _callbacks: Array<() => void> = [];

  get cancelled(): boolean {
    return this._cancelled;
  }

  cancel(reason?: string): void {
    if (this._cancelled) return;
    this._cancelled = true;
    this._reason = reason;
    const cbs = this._callbacks.splice(0);
    for (const cb of cbs) cb();
  }

  throwIfCancelled(): void {
    if (this._cancelled) {
      throw new Error(`Cancelled${this._reason ? ": " + this._reason : ""}`);
    }
  }

  onCancel(cb: () => void): void {
    if (this._cancelled) {
      cb();
    } else {
      this._callbacks.push(cb);
    }
  }
}

export function withCancellation<T>(
  fn: (token: CancelToken) => Promise<T>
): { promise: Promise<T>; cancel: (reason?: string) => void } {
  const token = new CancelToken();
  const promise = fn(token);
  return {
    promise,
    cancel: (reason?: string) => token.cancel(reason),
  };
}

// ---------------------------------------------------------------------------
// RateLimiter
// ---------------------------------------------------------------------------

export class RateLimiter {
  private readonly _maxCalls: number;
  private readonly _windowMs: number;
  private _calls: number[] = [];
  private _queue: Array<() => void> = [];

  constructor(opts: { maxCalls: number; windowMs: number }) {
    this._maxCalls = opts.maxCalls;
    this._windowMs = opts.windowMs;
  }

  private _prune(): void {
    const cutoff = Date.now() - this._windowMs;
    while (this._calls.length > 0 && this._calls[0] <= cutoff) {
      this._calls.shift();
    }
  }

  acquire(): Promise<void> {
    this._prune();
    if (this._calls.length < this._maxCalls) {
      this._calls.push(Date.now());
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this._queue.push(() => {
        this._calls.push(Date.now());
        resolve();
      });
      this._scheduleNext();
    });
  }

  private _scheduleNext(): void {
    if (this._queue.length === 0) return;
    this._prune();
    const oldest = this._calls[0];
    if (oldest === undefined) return;
    const waitMs = oldest + this._windowMs - Date.now();
    setTimeout(() => {
      this._prune();
      while (this._queue.length > 0 && this._calls.length < this._maxCalls) {
        const next = this._queue.shift()!;
        next();
        this._prune();
      }
      if (this._queue.length > 0) {
        this._scheduleNext();
      }
    }, Math.max(0, waitMs));
  }

  tryAcquire(): boolean {
    this._prune();
    if (this._calls.length < this._maxCalls) {
      this._calls.push(Date.now());
      return true;
    }
    return false;
  }

  get remaining(): number {
    this._prune();
    return Math.max(0, this._maxCalls - this._calls.length);
  }
}

// ---------------------------------------------------------------------------
// Async iterator utilities
// ---------------------------------------------------------------------------

export async function* asyncMap<T, U>(
  iterable: AsyncIterable<T>,
  fn: (item: T) => Promise<U>
): AsyncGenerator<U> {
  for await (const item of iterable) {
    yield fn(item);
  }
}

export async function* asyncFilter<T>(
  iterable: AsyncIterable<T>,
  predicate: (item: T) => Promise<boolean>
): AsyncGenerator<T> {
  for await (const item of iterable) {
    if (await predicate(item)) {
      yield item;
    }
  }
}

export async function* asyncTake<T>(
  iterable: AsyncIterable<T>,
  n: number
): AsyncGenerator<T> {
  let count = 0;
  for await (const item of iterable) {
    if (count >= n) break;
    yield item;
    count++;
  }
}

export async function* fromArray<T>(arr: T[]): AsyncGenerator<T> {
  for (const item of arr) {
    yield item;
  }
}

export async function toArray<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const results: T[] = [];
  for await (const item of iterable) {
    results.push(item);
  }
  return results;
}

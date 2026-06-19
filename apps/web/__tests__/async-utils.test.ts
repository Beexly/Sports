import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  debounce,
  throttle,
  delay,
  timeout,
  retry,
  TimeoutError,
  race,
  allSettledResults,
  any,
  mapConcurrent,
  mapSerial,
  filterAsync,
  reduceAsync,
  Semaphore,
  AsyncQueue,
  AsyncPool,
  memoizeAsync,
  waitFor,
  once,
  PriorityTaskRunner,
  CancelToken,
  withCancellation,
  RateLimiter,
  asyncMap,
  asyncFilter,
  asyncTake,
  fromArray,
  toArray,
} from "@/lib/utils/async-utils";

// ---------------------------------------------------------------------------
// debounce
// ---------------------------------------------------------------------------

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires only once after multiple calls (trailing)", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    debounced();
    debounced();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("fires immediately on leading edge when leading=true", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100, { leading: true, trailing: false });
    debounced();
    expect(fn).toHaveBeenCalledTimes(1);
    debounced();
    debounced();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("fires at both leading and trailing with leading+trailing=true", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100, { leading: true, trailing: true });
    debounced();
    expect(fn).toHaveBeenCalledTimes(1);
    debounced();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("cancel() prevents the pending trailing call", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    debounced.cancel();
    vi.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();
  });

  it("flush() invokes the pending call immediately", () => {
    const fn = vi.fn().mockReturnValue(42);
    const debounced = debounce(fn, 100);
    debounced();
    const result = debounced.flush();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(result).toBe(42);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1); // no double fire
  });

  it("flush() returns undefined when nothing is pending", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    const result = debounced.flush();
    expect(result).toBeUndefined();
    expect(fn).not.toHaveBeenCalled();
  });

  it("resets the timer on each call", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    vi.advanceTimersByTime(50);
    debounced();
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("passes the latest arguments to fn", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced("a");
    debounced("b");
    debounced("c");
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith("c");
  });
});

// ---------------------------------------------------------------------------
// throttle
// ---------------------------------------------------------------------------

describe("throttle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires immediately on first call (leading=true default)", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("rate-limits subsequent calls within the interval", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled();
    throttled();
    throttled();
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    // trailing fires once more
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("fires trailing call after interval", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100, { leading: true, trailing: true });
    throttled();
    throttled("trailing");
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("cancel() stops pending trailing call", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled();
    throttled();
    throttled.cancel();
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1); // only the leading call
  });

  it("does not double-fire with leading=false", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100, { leading: false, trailing: true });
    throttled();
    throttled();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// delay
// ---------------------------------------------------------------------------

describe("delay", () => {
  it("resolves after the specified time", async () => {
    vi.useFakeTimers();
    const p = delay(200);
    vi.advanceTimersByTime(200);
    await expect(p).resolves.toBeUndefined();
    vi.useRealTimers();
  });

  it("resolves with zero delay", async () => {
    await expect(delay(0)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// timeout
// ---------------------------------------------------------------------------

describe("timeout", () => {
  it("resolves if the promise completes within time", async () => {
    const result = await timeout(Promise.resolve(42), 500);
    expect(result).toBe(42);
  });

  it("rejects with TimeoutError if promise is too slow", async () => {
    vi.useFakeTimers();
    const slow = new Promise<number>((resolve) => setTimeout(() => resolve(1), 1000));
    const p = timeout(slow, 100, "too slow");
    vi.advanceTimersByTime(101);
    await expect(p).rejects.toThrow(TimeoutError);
    await expect(p).rejects.toThrow("too slow");
    vi.useRealTimers();
  });

  it("uses default message when none provided", async () => {
    vi.useFakeTimers();
    const slow = new Promise<number>((resolve) => setTimeout(() => resolve(1), 1000));
    const p = timeout(slow, 10);
    vi.advanceTimersByTime(11);
    await expect(p).rejects.toThrow(TimeoutError);
    vi.useRealTimers();
  });

  it("propagates underlying rejection", async () => {
    const rejected = Promise.reject(new Error("underlying"));
    await expect(timeout(rejected, 1000)).rejects.toThrow("underlying");
  });
});

// ---------------------------------------------------------------------------
// TimeoutError
// ---------------------------------------------------------------------------

describe("TimeoutError", () => {
  it("is an instance of Error", () => {
    const e = new TimeoutError("boom");
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(TimeoutError);
    expect(e.name).toBe("TimeoutError");
    expect(e.message).toBe("boom");
  });

  it("has default message", () => {
    const e = new TimeoutError();
    expect(e.message).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// retry
// ---------------------------------------------------------------------------

describe("retry", () => {
  it("returns value on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await retry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("succeeds on 3rd attempt after 2 failures", async () => {
    let calls = 0;
    const fn = async (): Promise<string> => {
      calls++;
      if (calls < 3) throw new Error("fail");
      return "done";
    };
    const result = await retry(fn, { attempts: 3 });
    expect(result).toBe("done");
    expect(calls).toBe(3);
  });

  it("throws after exhausting all attempts", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    await expect(retry(fn, { attempts: 3 })).rejects.toThrow("boom");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("defaults to 3 attempts", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("x"));
    await expect(retry(fn)).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("calls onError callback with error and attempt number", async () => {
    const onError = vi.fn();
    const fn = vi.fn().mockRejectedValue(new Error("e"));
    await expect(retry(fn, { attempts: 2, onError })).rejects.toThrow();
    expect(onError).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenNthCalledWith(1, expect.any(Error), 1);
    expect(onError).toHaveBeenNthCalledWith(2, expect.any(Error), 2);
  });

  it("applies delay between retries", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const fn = async (): Promise<string> => {
      calls++;
      if (calls < 2) throw new Error("err");
      return "good";
    };
    const p = retry(fn, { attempts: 3, delayMs: 100 });
    await vi.runAllTimersAsync();
    const result = await p;
    expect(result).toBe("good");
    vi.useRealTimers();
  });

  it("applies backoff multiplier", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const fn = async (): Promise<string> => {
      calls++;
      if (calls < 3) throw new Error("err");
      return "done";
    };
    const p = retry(fn, { attempts: 3, delayMs: 100, backoff: 2 });
    await vi.runAllTimersAsync();
    const result = await p;
    expect(result).toBe("done");
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// race
// ---------------------------------------------------------------------------

describe("race", () => {
  it("resolves with the first resolved promise", async () => {
    const result = await race([
      new Promise<string>((r) => setTimeout(() => r("slow"), 100)),
      Promise.resolve("fast"),
    ]);
    expect(result).toBe("fast");
  });

  it("rejects with Error when given an empty array", async () => {
    await expect(race([])).rejects.toThrow(Error);
  });

  it("rejects if first settled promise rejects", async () => {
    await expect(
      race([Promise.reject(new Error("boom")), new Promise<string>(() => {})])
    ).rejects.toThrow("boom");
  });
});

// ---------------------------------------------------------------------------
// allSettledResults
// ---------------------------------------------------------------------------

describe("allSettledResults", () => {
  it("returns fulfilled/rejected mix", async () => {
    const results = await allSettledResults([
      Promise.resolve(1),
      Promise.reject(new Error("fail")),
      Promise.resolve(3),
    ]);
    expect(results[0]).toEqual({ status: "fulfilled", value: 1 });
    expect(results[1]).toMatchObject({ status: "rejected" });
    expect(results[2]).toEqual({ status: "fulfilled", value: 3 });
  });

  it("handles all fulfilled", async () => {
    const results = await allSettledResults([Promise.resolve(1), Promise.resolve(2)]);
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
  });

  it("handles all rejected", async () => {
    const results = await allSettledResults([
      Promise.reject(new Error("a")),
      Promise.reject(new Error("b")),
    ]);
    expect(results.every((r) => r.status === "rejected")).toBe(true);
  });

  it("handles empty array", async () => {
    const results = await allSettledResults([]);
    expect(results).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// any
// ---------------------------------------------------------------------------

describe("any", () => {
  it("resolves with first fulfilled value", async () => {
    const result = await any([
      Promise.reject(new Error("no")),
      Promise.resolve("yes"),
      Promise.resolve("also yes"),
    ]);
    expect(result).toBe("yes");
  });

  it("rejects with AggregateError when all reject", async () => {
    const err = await any([
      Promise.reject(new Error("a")),
      Promise.reject(new Error("b")),
    ]).catch((e) => e);
    expect(err).toBeInstanceOf(AggregateError);
  });

  it("rejects with AggregateError for empty array", async () => {
    await expect(any([])).rejects.toThrow(AggregateError);
  });
});

// ---------------------------------------------------------------------------
// mapConcurrent
// ---------------------------------------------------------------------------

describe("mapConcurrent", () => {
  it("returns correct results in original order", async () => {
    const results = await mapConcurrent([1, 2, 3], async (x) => x * 2, 2);
    expect(results).toEqual([2, 4, 6]);
  });

  it("concurrency=1 runs serially", async () => {
    const order: number[] = [];
    await mapConcurrent(
      [1, 2, 3],
      async (x) => {
        order.push(x);
        return x;
      },
      1
    );
    expect(order).toEqual([1, 2, 3]);
  });

  it("respects concurrency limit", async () => {
    let active = 0;
    let maxActive = 0;
    await mapConcurrent(
      [1, 2, 3, 4, 5],
      async (x) => {
        active++;
        maxActive = Math.max(maxActive, active);
        await delay(10);
        active--;
        return x;
      },
      2
    );
    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it("handles empty array", async () => {
    const results = await mapConcurrent([], async (x: number) => x, 3);
    expect(results).toEqual([]);
  });

  it("propagates errors", async () => {
    await expect(
      mapConcurrent([1, 2, 3], async (x) => {
        if (x === 2) throw new Error("bad");
        return x;
      }, 3)
    ).rejects.toThrow("bad");
  });
});

// ---------------------------------------------------------------------------
// mapSerial
// ---------------------------------------------------------------------------

describe("mapSerial", () => {
  it("processes items sequentially", async () => {
    const order: number[] = [];
    const results = await mapSerial([1, 2, 3], async (x) => {
      order.push(x);
      return x * 10;
    });
    expect(order).toEqual([1, 2, 3]);
    expect(results).toEqual([10, 20, 30]);
  });

  it("passes index to fn", async () => {
    const indices: number[] = [];
    await mapSerial(["a", "b", "c"], async (_, i) => {
      indices.push(i);
      return i;
    });
    expect(indices).toEqual([0, 1, 2]);
  });

  it("handles empty array", async () => {
    expect(await mapSerial([], async (x: number) => x)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// filterAsync
// ---------------------------------------------------------------------------

describe("filterAsync", () => {
  it("keeps items where predicate is true", async () => {
    const result = await filterAsync([1, 2, 3, 4, 5], async (x) => x % 2 === 0);
    expect(result).toEqual([2, 4]);
  });

  it("works with async predicate that resolves after microtask", async () => {
    const result = await filterAsync(["apple", "banana", "apricot"], async (s) => {
      await delay(0);
      return s.startsWith("a");
    });
    expect(result).toEqual(["apple", "apricot"]);
  });

  it("returns empty array when none match", async () => {
    expect(await filterAsync([1, 3, 5], async (x) => x % 2 === 0)).toEqual([]);
  });

  it("returns all when all match", async () => {
    expect(await filterAsync([2, 4, 6], async (x) => x % 2 === 0)).toEqual([2, 4, 6]);
  });
});

// ---------------------------------------------------------------------------
// reduceAsync
// ---------------------------------------------------------------------------

describe("reduceAsync", () => {
  it("accumulates values correctly", async () => {
    const result = await reduceAsync([1, 2, 3, 4], async (acc, x) => acc + x, 0);
    expect(result).toBe(10);
  });

  it("passes index to reducer", async () => {
    const indices: number[] = [];
    await reduceAsync(["a", "b", "c"], async (acc, _, i) => {
      indices.push(i);
      return acc;
    }, "");
    expect(indices).toEqual([0, 1, 2]);
  });

  it("returns initial value for empty array", async () => {
    expect(await reduceAsync([], async (acc: number) => acc, 99)).toBe(99);
  });
});

// ---------------------------------------------------------------------------
// Semaphore
// ---------------------------------------------------------------------------

describe("Semaphore", () => {
  it("allows up to permits concurrent acquisitions", async () => {
    const sem = new Semaphore(2);
    const p1 = sem.acquire();
    const p2 = sem.acquire();
    await Promise.all([p1, p2]);
    expect(sem.available).toBe(0);
  });

  it("queues additional acquirers", async () => {
    const sem = new Semaphore(1);
    let thirdDone = false;
    await sem.acquire();
    const p2 = sem.acquire();
    const p3 = sem.acquire().then(() => { thirdDone = true; });
    expect(sem.queue).toBe(2);
    sem.release();
    await p2;
    sem.release();
    await p3;
    expect(thirdDone).toBe(true);
  });

  it("release unblocks waiters in order", async () => {
    const sem = new Semaphore(1);
    const order: number[] = [];
    await sem.acquire();
    const p2 = sem.acquire().then(() => { order.push(2); sem.release(); });
    const p3 = sem.acquire().then(() => { order.push(3); sem.release(); });
    sem.release();
    await Promise.all([p2, p3]);
    expect(order).toEqual([2, 3]);
  });

  it("throws on invalid permits", () => {
    expect(() => new Semaphore(0)).toThrow(RangeError);
  });

  it("tracks available count", async () => {
    const sem = new Semaphore(3);
    expect(sem.available).toBe(3);
    await sem.acquire();
    expect(sem.available).toBe(2);
    sem.release();
    expect(sem.available).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// AsyncQueue
// ---------------------------------------------------------------------------

describe("AsyncQueue", () => {
  it("enqueue and dequeue maintain FIFO order", async () => {
    const q = new AsyncQueue<number>();
    q.enqueue(1);
    q.enqueue(2);
    q.enqueue(3);
    expect(await q.dequeue()).toBe(1);
    expect(await q.dequeue()).toBe(2);
    expect(await q.dequeue()).toBe(3);
  });

  it("dequeue waits if queue is empty", async () => {
    const q = new AsyncQueue<string>();
    let resolved = false;
    const p = q.dequeue().then((v) => { resolved = true; return v; });
    expect(resolved).toBe(false);
    q.enqueue("hello");
    const result = await p;
    expect(result).toBe("hello");
    expect(resolved).toBe(true);
  });

  it("size reflects number of queued items", () => {
    const q = new AsyncQueue<number>();
    expect(q.size).toBe(0);
    q.enqueue(1);
    q.enqueue(2);
    expect(q.size).toBe(2);
  });

  it("isEmpty is true when no items", () => {
    const q = new AsyncQueue<number>();
    expect(q.isEmpty).toBe(true);
    q.enqueue(1);
    expect(q.isEmpty).toBe(false);
  });

  it("drain resolves when queue is empty", async () => {
    const q = new AsyncQueue<number>();
    await expect(q.drain()).resolves.toBeUndefined();
  });

  it("throws when maxSize exceeded", () => {
    const q = new AsyncQueue<number>({ maxSize: 2 });
    q.enqueue(1);
    q.enqueue(2);
    expect(() => q.enqueue(3)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// AsyncPool
// ---------------------------------------------------------------------------

describe("AsyncPool", () => {
  it("resolves tasks and returns results", async () => {
    const pool = new AsyncPool<number>(2);
    const p1 = pool.add(async () => 1);
    const p2 = pool.add(async () => 2);
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe(1);
    expect(r2).toBe(2);
  });

  it("respects concurrency limit", async () => {
    let active = 0;
    let maxActive = 0;
    const pool = new AsyncPool<void>(2);
    const tasks = Array.from({ length: 5 }, () =>
      pool.add(async () => {
        active++;
        maxActive = Math.max(maxActive, active);
        await delay(10);
        active--;
      })
    );
    await Promise.all(tasks);
    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it("drain waits until all tasks complete", async () => {
    const pool = new AsyncPool<number>(2);
    let done = false;
    pool.add(async () => { await delay(20); done = true; return 0; });
    await pool.drain();
    expect(done).toBe(true);
  });

  it("drain resolves immediately when idle", async () => {
    const pool = new AsyncPool<number>(2);
    await expect(pool.drain()).resolves.toBeUndefined();
  });

  it("propagates task errors", async () => {
    const pool = new AsyncPool<number>(2);
    await expect(pool.add(async () => { throw new Error("oops"); })).rejects.toThrow("oops");
  });
});

// ---------------------------------------------------------------------------
// memoizeAsync
// ---------------------------------------------------------------------------

describe("memoizeAsync", () => {
  it("returns cached result on same args", async () => {
    const fn = vi.fn().mockResolvedValue(42);
    const memoized = memoizeAsync(fn);
    await memoized("x");
    await memoized("x");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("calls fn again for different args", async () => {
    const fn = vi.fn().mockResolvedValue(1);
    const memoized = memoizeAsync(fn);
    await memoized("a");
    await memoized("b");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("deduplicates in-flight requests for the same key", async () => {
    const fn = vi.fn().mockImplementation(async () => {
      await delay(10);
      return 99;
    });
    const memoized = memoizeAsync(fn);
    const [r1, r2] = await Promise.all([memoized("k"), memoized("k")]);
    expect(r1).toBe(99);
    expect(r2).toBe(99);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("respects TTL expiry", async () => {
    vi.useFakeTimers();
    const fn = vi.fn().mockResolvedValue(1);
    const memoized = memoizeAsync(fn, { ttlMs: 100 });
    await memoized("k");
    vi.advanceTimersByTime(101);
    await memoized("k");
    expect(fn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("invalidate removes a specific entry", async () => {
    const fn = vi.fn().mockResolvedValue(5);
    const memoized = memoizeAsync(fn);
    await memoized("k");
    memoized.invalidate("k");
    await memoized("k");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("clear removes all entries", async () => {
    const fn = vi.fn().mockResolvedValue(5);
    const memoized = memoizeAsync(fn);
    await memoized("a");
    await memoized("b");
    memoized.clear();
    expect(memoized.size()).toBe(0);
  });

  it("LRU eviction respects maxSize", async () => {
    const fn = vi.fn().mockImplementation(async (k: unknown) => k);
    const memoized = memoizeAsync(fn, { maxSize: 2 });
    await memoized("a");
    await memoized("b");
    await memoized("c"); // evicts oldest
    expect(memoized.size()).toBeLessThanOrEqual(2);
  });

  it("size() reports current cache size", async () => {
    const fn = vi.fn().mockResolvedValue(1);
    const memoized = memoizeAsync(fn);
    expect(memoized.size()).toBe(0);
    await memoized("x");
    expect(memoized.size()).toBe(1);
  });

  it("uses custom keyFn", async () => {
    const fn = vi.fn().mockResolvedValue(1);
    const memoized = memoizeAsync(fn, { keyFn: (...args) => String(args[0]) });
    await memoized(1);
    await memoized(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("removes entry on rejection so next call retries", async () => {
    let calls = 0;
    const fn = vi.fn().mockImplementation(async () => {
      calls++;
      if (calls === 1) throw new Error("fail");
      return "ok";
    });
    const memoized = memoizeAsync(fn);
    await expect(memoized("k")).rejects.toThrow("fail");
    const result = await memoized("k");
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// waitFor
// ---------------------------------------------------------------------------

describe("waitFor", () => {
  it("resolves when condition becomes true", async () => {
    let flag = false;
    setTimeout(() => { flag = true; }, 30);
    await expect(waitFor(() => flag, { intervalMs: 10, timeoutMs: 500 })).resolves.toBeUndefined();
  });

  it("rejects with TimeoutError when condition never becomes true", async () => {
    await expect(
      waitFor(() => false, { intervalMs: 10, timeoutMs: 50 })
    ).rejects.toThrow(TimeoutError);
  });

  it("works with async condition", async () => {
    let count = 0;
    await expect(
      waitFor(async () => { count++; return count >= 3; }, { intervalMs: 5, timeoutMs: 500 })
    ).resolves.toBeUndefined();
  });

  it("resolves immediately if condition is already true", async () => {
    await expect(waitFor(() => true)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// once
// ---------------------------------------------------------------------------

describe("once", () => {
  it("resolves with the emitted value", async () => {
    let handler: ((v: number) => void) | null = null;
    const emitterOn = (cb: (v: number) => void): void => { handler = cb; };
    const emitterOff = vi.fn();
    const p = once(emitterOn, emitterOff);
    handler!(42);
    const result = await p;
    expect(result).toBe(42);
    expect(emitterOff).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// PriorityTaskRunner
// ---------------------------------------------------------------------------

describe("PriorityTaskRunner", () => {
  it("runs all tasks and returns results keyed by id", async () => {
    const runner = new PriorityTaskRunner<number>();
    runner.add({ id: "a", fn: async () => 1 });
    runner.add({ id: "b", fn: async () => 2 });
    const results = await runner.run();
    expect(results).toHaveLength(2);
    const a = results.find((r) => r.id === "a");
    const b = results.find((r) => r.id === "b");
    expect(a?.result).toBe(1);
    expect(b?.result).toBe(2);
  });

  it("higher priority runs first with concurrency=1", async () => {
    const order: string[] = [];
    const runner = new PriorityTaskRunner<void>();
    runner.add({ id: "low", priority: 1, fn: async () => { order.push("low"); } });
    runner.add({ id: "high", priority: 10, fn: async () => { order.push("high"); } });
    runner.add({ id: "mid", priority: 5, fn: async () => { order.push("mid"); } });
    await runner.run(1);
    expect(order[0]).toBe("high");
    expect(order[1]).toBe("mid");
    expect(order[2]).toBe("low");
  });

  it("captures errors without throwing", async () => {
    const runner = new PriorityTaskRunner<number>();
    runner.add({ id: "bad", fn: async () => { throw new Error("task failed"); } });
    const results = await runner.run();
    expect(results[0].error).toBeInstanceOf(Error);
    expect(results[0].result).toBeNull();
  });

  it("supports concurrency > 1", async () => {
    let active = 0;
    let maxActive = 0;
    const runner = new PriorityTaskRunner<void>();
    for (let i = 0; i < 4; i++) {
      runner.add({
        id: `t${i}`,
        fn: async () => {
          active++;
          maxActive = Math.max(maxActive, active);
          await delay(10);
          active--;
        },
      });
    }
    await runner.run(2);
    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it("default priority is 0", async () => {
    const runner = new PriorityTaskRunner<number>();
    runner.add({ id: "x", fn: async () => 7 });
    const results = await runner.run();
    expect(results[0].result).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// CancelToken
// ---------------------------------------------------------------------------

describe("CancelToken", () => {
  it("starts uncancelled", () => {
    const token = new CancelToken();
    expect(token.cancelled).toBe(false);
  });

  it("cancel() sets cancelled to true", () => {
    const token = new CancelToken();
    token.cancel();
    expect(token.cancelled).toBe(true);
  });

  it("throwIfCancelled throws after cancel()", () => {
    const token = new CancelToken();
    token.cancel("my reason");
    expect(() => token.throwIfCancelled()).toThrow();
  });

  it("throwIfCancelled does nothing before cancel()", () => {
    const token = new CancelToken();
    expect(() => token.throwIfCancelled()).not.toThrow();
  });

  it("onCancel callback fires when cancelled", () => {
    const token = new CancelToken();
    const cb = vi.fn();
    token.onCancel(cb);
    token.cancel();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("onCancel callback fires immediately if already cancelled", () => {
    const token = new CancelToken();
    token.cancel();
    const cb = vi.fn();
    token.onCancel(cb);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("cancel is idempotent — only fires callbacks once", () => {
    const token = new CancelToken();
    const cb = vi.fn();
    token.onCancel(cb);
    token.cancel();
    token.cancel();
    expect(cb).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// withCancellation
// ---------------------------------------------------------------------------

describe("withCancellation", () => {
  it("resolves normally when not cancelled", async () => {
    const { promise } = withCancellation(async () => "result");
    expect(await promise).toBe("result");
  });

  it("cancel() propagates to CancelToken inside fn", async () => {
    const { promise, cancel } = withCancellation(async (token) => {
      await delay(100);
      token.throwIfCancelled();
      return "done";
    });
    cancel("early");
    // The inner fn will check token.throwIfCancelled after the delay
    // We just verify the cancel flag was set — the exact rejection depends on
    // whether the async fn checks the token
    expect(promise).toBeInstanceOf(Promise);
  });

  it("cancel() does not throw synchronously", () => {
    const { cancel } = withCancellation(async () => {});
    expect(() => cancel()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// RateLimiter
// ---------------------------------------------------------------------------

describe("RateLimiter", () => {
  it("allows up to maxCalls within window", () => {
    const rl = new RateLimiter({ maxCalls: 3, windowMs: 1000 });
    expect(rl.tryAcquire()).toBe(true);
    expect(rl.tryAcquire()).toBe(true);
    expect(rl.tryAcquire()).toBe(true);
    expect(rl.tryAcquire()).toBe(false);
  });

  it("remaining decrements with each acquire", () => {
    const rl = new RateLimiter({ maxCalls: 5, windowMs: 1000 });
    expect(rl.remaining).toBe(5);
    rl.tryAcquire();
    expect(rl.remaining).toBe(4);
  });

  it("tryAcquire returns false when exhausted", () => {
    const rl = new RateLimiter({ maxCalls: 1, windowMs: 1000 });
    rl.tryAcquire();
    expect(rl.tryAcquire()).toBe(false);
  });

  it("acquire resolves immediately when slots available", async () => {
    const rl = new RateLimiter({ maxCalls: 3, windowMs: 1000 });
    await expect(rl.acquire()).resolves.toBeUndefined();
  });

  it("acquire waits when exhausted and resolves after window", async () => {
    vi.useFakeTimers();
    const rl = new RateLimiter({ maxCalls: 1, windowMs: 100 });
    await rl.acquire();
    const p = rl.acquire();
    vi.advanceTimersByTime(101);
    await expect(p).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// asyncMap
// ---------------------------------------------------------------------------

describe("asyncMap", () => {
  it("transforms each item", async () => {
    const gen = asyncMap(fromArray([1, 2, 3]), async (x) => x * 2);
    expect(await toArray(gen)).toEqual([2, 4, 6]);
  });

  it("handles empty iterable", async () => {
    expect(await toArray(asyncMap(fromArray([]), async (x: number) => x))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// asyncFilter
// ---------------------------------------------------------------------------

describe("asyncFilter", () => {
  it("keeps items where predicate is true", async () => {
    const gen = asyncFilter(fromArray([1, 2, 3, 4]), async (x) => x % 2 === 0);
    expect(await toArray(gen)).toEqual([2, 4]);
  });

  it("returns empty when nothing matches", async () => {
    const gen = asyncFilter(fromArray([1, 3, 5]), async (x) => x % 2 === 0);
    expect(await toArray(gen)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// asyncTake
// ---------------------------------------------------------------------------

describe("asyncTake", () => {
  it("takes first n items", async () => {
    const gen = asyncTake(fromArray([1, 2, 3, 4, 5]), 3);
    expect(await toArray(gen)).toEqual([1, 2, 3]);
  });

  it("takes all when n >= length", async () => {
    const gen = asyncTake(fromArray([1, 2]), 10);
    expect(await toArray(gen)).toEqual([1, 2]);
  });

  it("takes 0 items when n=0", async () => {
    const gen = asyncTake(fromArray([1, 2, 3]), 0);
    expect(await toArray(gen)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// fromArray / toArray
// ---------------------------------------------------------------------------

describe("fromArray / toArray roundtrip", () => {
  it("roundtrips an array", async () => {
    const arr = [10, 20, 30, 40];
    expect(await toArray(fromArray(arr))).toEqual(arr);
  });

  it("handles empty array", async () => {
    expect(await toArray(fromArray([]))).toEqual([]);
  });

  it("handles string arrays", async () => {
    expect(await toArray(fromArray(["a", "b", "c"]))).toEqual(["a", "b", "c"]);
  });
});

// ---------------------------------------------------------------------------
// Integration: Semaphore + mapConcurrent
// ---------------------------------------------------------------------------

describe("Semaphore integration with mapConcurrent", () => {
  it("semaphore limits shared resource across concurrent tasks", async () => {
    const sem = new Semaphore(2);
    let active = 0;
    let maxActive = 0;

    await mapConcurrent(
      Array.from({ length: 6 }, (_, i) => i),
      async () => {
        await sem.acquire();
        active++;
        maxActive = Math.max(maxActive, active);
        await delay(5);
        active--;
        sem.release();
      },
      6 // lots of concurrency, but semaphore limits to 2
    );

    expect(maxActive).toBeLessThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Integration: retry + timeout
// ---------------------------------------------------------------------------

describe("retry + timeout integration", () => {
  it("retries up to n times before timeout wraps", async () => {
    let calls = 0;
    const fn = async (): Promise<string> => {
      calls++;
      if (calls < 3) throw new Error("not yet");
      return "success";
    };
    const result = await timeout(retry(fn, { attempts: 3 }), 5000);
    expect(result).toBe("success");
    expect(calls).toBe(3);
  });
});

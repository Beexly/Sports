/**
 * Tests for retry-utils.ts — retry, backoff, circuit breaker, rate limiter,
 * bulkhead, memoizeAsync, hedgedRequest, withResilience.
 *
 * Vitest with fake timers for timing-sensitive tests.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  backoffDelay,
  backoffSchedule,
  withJitter,
  retry,
  retrySimple,
  retryWithTimeout,
  retryWithFallback,
  withTimeout,
  TimeoutError,
  CircuitBreaker,
  CircuitOpenError,
  RateLimiter,
  Bulkhead,
  BulkheadRejectedError,
  memoizeAsync,
  hedgedRequest,
  withResilience,
} from "@/lib/utils/retry-utils";
import type {
  RetryConfig,
  RetryResult,
  CircuitBreakerStats,
  CircuitState,
} from "@/lib/utils/retry-utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFailThenSucceed<T>(
  failCount: number,
  successValue: T,
  errorMessage = "Transient error",
): () => Promise<T> {
  let calls = 0;
  return async () => {
    calls++;
    if (calls <= failCount) throw new Error(errorMessage);
    return successValue;
  };
}

function makeAlwaysFail(message = "Always fails"): () => Promise<never> {
  return async () => {
    throw new Error(message);
  };
}

function makeAlwaysSucceed<T>(value: T): () => Promise<T> {
  return async () => value;
}

// ---------------------------------------------------------------------------
// backoffDelay
// ---------------------------------------------------------------------------

describe("backoffDelay", () => {
  it("returns baseDelayMs for attempt 1", () => {
    expect(backoffDelay(1, 100)).toBe(100);
  });

  it("doubles for attempt 2 with default factor=2", () => {
    expect(backoffDelay(2, 100)).toBe(200);
  });

  it("quadruples for attempt 3", () => {
    expect(backoffDelay(3, 100)).toBe(400);
  });

  it("applies custom backoffFactor", () => {
    expect(backoffDelay(2, 100, 3)).toBe(300);
    expect(backoffDelay(3, 100, 3)).toBe(900);
  });

  it("caps at maxDelayMs", () => {
    expect(backoffDelay(10, 100, 2, 500)).toBe(500);
  });

  it("caps exactly at maxDelayMs when computed equals cap", () => {
    // 100 * 2^2 = 400; cap 400 → 400
    expect(backoffDelay(3, 100, 2, 400)).toBe(400);
  });

  it("handles attempt=1 with large base", () => {
    expect(backoffDelay(1, 5000, 2, 30000)).toBe(5000);
  });

  it("uses default maxDelayMs of 30000", () => {
    // 100 * 2^20 >> 30000 → should cap
    expect(backoffDelay(21, 100)).toBe(30_000);
  });

  it("jitter parameter is accepted but does not change the pure output", () => {
    const d1 = backoffDelay(2, 100, 2, 30000, false);
    const d2 = backoffDelay(2, 100, 2, 30000, true);
    // Both should be deterministic 200ms — jitter is not applied here
    expect(d1).toBe(200);
    expect(d2).toBe(200);
  });

  it("returns 0 for baseDelayMs=0", () => {
    expect(backoffDelay(3, 0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// withJitter
// ---------------------------------------------------------------------------

describe("withJitter", () => {
  it("returns a value within ±20% by default", () => {
    for (let i = 0; i < 50; i++) {
      const result = withJitter(1000);
      expect(result).toBeGreaterThanOrEqual(800);
      expect(result).toBeLessThanOrEqual(1200);
    }
  });

  it("respects custom factor", () => {
    for (let i = 0; i < 50; i++) {
      const result = withJitter(1000, 0.1);
      expect(result).toBeGreaterThanOrEqual(900);
      expect(result).toBeLessThanOrEqual(1100);
    }
  });

  it("returns exactly the input when factor=0", () => {
    expect(withJitter(500, 0)).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// backoffSchedule
// ---------------------------------------------------------------------------

describe("backoffSchedule", () => {
  it("returns empty array for maxAttempts=1", () => {
    expect(backoffSchedule(1, 100)).toEqual([]);
  });

  it("returns one element for maxAttempts=2", () => {
    expect(backoffSchedule(2, 100)).toEqual([100]);
  });

  it("returns correct array for maxAttempts=4", () => {
    // attempt 1: 100, attempt 2: 200, attempt 3: 400
    expect(backoffSchedule(4, 100)).toEqual([100, 200, 400]);
  });

  it("length is always maxAttempts-1", () => {
    for (const n of [1, 2, 3, 5, 10]) {
      expect(backoffSchedule(n, 50).length).toBe(n - 1);
    }
  });

  it("respects maxDelayMs cap", () => {
    const schedule = backoffSchedule(5, 100, 2, 300);
    // attempt 1: 100, attempt 2: 200, attempt 3: 400→300, attempt 4: 800→300
    expect(schedule).toEqual([100, 200, 300, 300]);
  });

  it("respects custom backoffFactor", () => {
    expect(backoffSchedule(3, 100, 3)).toEqual([100, 300]);
  });
});

// ---------------------------------------------------------------------------
// retry — success cases
// ---------------------------------------------------------------------------

describe("retry — success", () => {
  it("succeeds on the first try", async () => {
    const fn = makeAlwaysSucceed(42);
    const result = await retry(fn);
    expect(result.value).toBe(42);
    expect(result.attempts).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(result.totalDelayMs).toBe(0);
  });

  it("succeeds after 1 failure with default config", async () => {
    vi.useFakeTimers();
    const fn = makeFailThenSucceed(1, "hello");
    const p = retry(fn);
    await vi.runAllTimersAsync();
    const result = await p;
    expect(result.value).toBe("hello");
    expect(result.attempts).toBe(2);
    expect(result.errors).toHaveLength(1);
    vi.useRealTimers();
  });

  it("succeeds after 2 failures with maxAttempts=3", async () => {
    vi.useFakeTimers();
    const fn = makeFailThenSucceed(2, "ok");
    const p = retry(fn, { maxAttempts: 3, baseDelayMs: 50 });
    await vi.runAllTimersAsync();
    const result = await p;
    expect(result.value).toBe("ok");
    expect(result.attempts).toBe(3);
    expect(result.errors).toHaveLength(2);
    vi.useRealTimers();
  });

  it("tracks totalDelayMs", async () => {
    vi.useFakeTimers();
    const fn = makeFailThenSucceed(1, "x");
    const p = retry(fn, { maxAttempts: 3, baseDelayMs: 100 });
    await vi.runAllTimersAsync();
    const result = await p;
    // After 1 failure: delay is backoffDelay(1, 100) = 100ms
    expect(result.totalDelayMs).toBe(100);
    vi.useRealTimers();
  });

  it("accumulates errors in result.errors", async () => {
    vi.useFakeTimers();
    const fn = makeFailThenSucceed(2, "done");
    const p = retry(fn, { maxAttempts: 5, baseDelayMs: 10 });
    await vi.runAllTimersAsync();
    const result = await p;
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toBeInstanceOf(Error);
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// retry — failure cases
// ---------------------------------------------------------------------------

describe("retry — failure / exhaustion", () => {
  it("throws after maxAttempts exhausted", async () => {
    vi.useFakeTimers();
    const fn = makeAlwaysFail("boom");
    const p = retry(fn, { maxAttempts: 3, baseDelayMs: 10 });
    // Attach handler before advancing timers so rejection is always handled
    const result = expect(p).rejects.toThrow("boom");
    await vi.runAllTimersAsync();
    await result;
    vi.useRealTimers();
  });

  it("throws last error (not first) on exhaustion", async () => {
    vi.useFakeTimers();
    let count = 0;
    const fn = async (): Promise<number> => {
      count++;
      throw new Error(`error-${count}`);
    };
    const p = retry(fn, { maxAttempts: 3, baseDelayMs: 10 });
    const result = expect(p).rejects.toThrow("error-3");
    await vi.runAllTimersAsync();
    await result;
    vi.useRealTimers();
  });

  it("makes exactly maxAttempts calls on total failure", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const fn = async (): Promise<void> => {
      calls++;
      throw new Error("x");
    };
    const p = retry(fn, { maxAttempts: 4, baseDelayMs: 10 });
    const result = p.catch(() => null);
    await vi.runAllTimersAsync();
    await result;
    expect(calls).toBe(4);
    vi.useRealTimers();
  });

  it("does not retry when maxAttempts=1", async () => {
    let calls = 0;
    const fn = async (): Promise<void> => {
      calls++;
      throw new Error("instant fail");
    };
    await expect(retry(fn, { maxAttempts: 1 })).rejects.toThrow("instant fail");
    expect(calls).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// retry — retryOn
// ---------------------------------------------------------------------------

describe("retry — retryOn", () => {
  it("does not retry when retryOn returns false", async () => {
    let calls = 0;
    const fn = async (): Promise<void> => {
      calls++;
      throw new Error("not retryable");
    };
    const retryOn = (_err: unknown) => false;
    await expect(
      retry(fn, { maxAttempts: 5, retryOn }),
    ).rejects.toThrow("not retryable");
    expect(calls).toBe(1);
  });

  it("retries only when retryOn returns true", async () => {
    vi.useFakeTimers();
    let calls = 0;
    class TransientError extends Error {}
    const fn = async (): Promise<string> => {
      calls++;
      if (calls < 3) throw new TransientError("transient");
      return "success";
    };
    const retryOn = (err: unknown) => err instanceof TransientError;
    const p = retry(fn, { maxAttempts: 5, baseDelayMs: 10, retryOn });
    await vi.runAllTimersAsync();
    const result = await p;
    expect(result.value).toBe("success");
    expect(calls).toBe(3);
    vi.useRealTimers();
  });

  it("stops on non-retryable error even mid-sequence", async () => {
    vi.useFakeTimers();
    let calls = 0;
    class Fatal extends Error {}
    const fn = async (): Promise<void> => {
      calls++;
      if (calls === 1) throw new Error("retryable");
      throw new Fatal("fatal");
    };
    const retryOn = (err: unknown) => !(err instanceof Fatal);
    const p = retry(fn, { maxAttempts: 5, baseDelayMs: 10, retryOn });
    const result = expect(p).rejects.toBeInstanceOf(Fatal);
    await vi.runAllTimersAsync();
    await result;
    expect(calls).toBe(2);
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// retry — onRetry callback
// ---------------------------------------------------------------------------

describe("retry — onRetry callback", () => {
  it("calls onRetry with correct attempt number and error", async () => {
    vi.useFakeTimers();
    const calls: Array<{ attempt: number; error: unknown; delayMs: number }> = [];
    const fn = makeFailThenSucceed(2, "ok");
    const onRetry = (attempt: number, error: unknown, delayMs: number): void => {
      calls.push({ attempt, error, delayMs });
    };
    const p = retry(fn, { maxAttempts: 5, baseDelayMs: 100, onRetry });
    await vi.runAllTimersAsync();
    await p;
    expect(calls).toHaveLength(2);
    expect(calls[0].attempt).toBe(1);
    expect(calls[1].attempt).toBe(2);
    expect(calls[0].error).toBeInstanceOf(Error);
    vi.useRealTimers();
  });

  it("provides correct delay in onRetry", async () => {
    vi.useFakeTimers();
    const delays: number[] = [];
    const fn = makeFailThenSucceed(2, 0);
    const p = retry(fn, {
      maxAttempts: 5,
      baseDelayMs: 100,
      backoffFactor: 2,
      onRetry: (_a, _e, d) => delays.push(d),
    });
    await vi.runAllTimersAsync();
    await p;
    // attempt 1 → delay = 100ms, attempt 2 → delay = 200ms
    expect(delays[0]).toBe(100);
    expect(delays[1]).toBe(200);
    vi.useRealTimers();
  });

  it("does not call onRetry on the final failing attempt", async () => {
    vi.useFakeTimers();
    const retryCalls: number[] = [];
    const fn = makeAlwaysFail();
    const p = retry(fn, {
      maxAttempts: 3,
      baseDelayMs: 10,
      onRetry: (a) => retryCalls.push(a),
    });
    const settled = p.catch(() => null);
    await vi.runAllTimersAsync();
    await settled;
    // 3 attempts → 2 retries → onRetry called twice
    expect(retryCalls).toHaveLength(2);
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// retry — jitter
// ---------------------------------------------------------------------------

describe("retry — jitter", () => {
  it("applies jitter so delay differs from pure backoff", async () => {
    vi.useFakeTimers();
    const delays: number[] = [];
    const fn = makeFailThenSucceed(2, 0);
    const p = retry(fn, {
      maxAttempts: 5,
      baseDelayMs: 1000,
      jitter: true,
      onRetry: (_a, _e, d) => delays.push(d),
    });
    await vi.runAllTimersAsync();
    await p;
    // With jitter, delays should be in range [800,1200] and [1600,2400]
    expect(delays[0]).toBeGreaterThanOrEqual(800);
    expect(delays[0]).toBeLessThanOrEqual(1200);
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// retrySimple
// ---------------------------------------------------------------------------

describe("retrySimple", () => {
  it("returns value on success", async () => {
    const result = await retrySimple(makeAlwaysSucceed(99));
    expect(result).toBe(99);
  });

  it("throws on exhaustion", async () => {
    vi.useFakeTimers();
    const p = retrySimple(makeAlwaysFail("oops"), 3, 10);
    const result = expect(p).rejects.toThrow("oops");
    await vi.runAllTimersAsync();
    await result;
    vi.useRealTimers();
  });

  it("uses default maxAttempts=3", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const fn = async (): Promise<void> => {
      calls++;
      throw new Error("x");
    };
    const p = retrySimple(fn);
    const settled = p.catch(() => null);
    await vi.runAllTimersAsync();
    await settled;
    expect(calls).toBe(3);
    vi.useRealTimers();
  });

  it("succeeds after N-1 failures", async () => {
    vi.useFakeTimers();
    const fn = makeFailThenSucceed(2, "yes");
    const p = retrySimple(fn, 5, 10);
    await vi.runAllTimersAsync();
    const value = await p;
    expect(value).toBe("yes");
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// TimeoutError
// ---------------------------------------------------------------------------

describe("TimeoutError", () => {
  it("is an Error instance", () => {
    const err = new TimeoutError();
    expect(err).toBeInstanceOf(Error);
  });

  it("has isTimeout=true", () => {
    expect(new TimeoutError().isTimeout).toBe(true);
  });

  it("uses default message", () => {
    expect(new TimeoutError().message).toBe("Operation timed out");
  });

  it("accepts custom message", () => {
    expect(new TimeoutError("too slow").message).toBe("too slow");
  });

  it("has name=TimeoutError", () => {
    expect(new TimeoutError().name).toBe("TimeoutError");
  });
});

// ---------------------------------------------------------------------------
// withTimeout
// ---------------------------------------------------------------------------

describe("withTimeout", () => {
  it("resolves with fn's value before timeout", async () => {
    vi.useFakeTimers();
    const fn = async () => {
      await new Promise<void>((r) => setTimeout(r, 100));
      return "done";
    };
    const p = withTimeout(fn, { timeoutMs: 500 });
    await vi.advanceTimersByTimeAsync(200);
    const result = await p;
    expect(result).toBe("done");
    vi.useRealTimers();
  });

  it("rejects with TimeoutError if fn is too slow", async () => {
    vi.useFakeTimers();
    const fn = async () => {
      await new Promise<void>((r) => setTimeout(r, 1000));
      return "too late";
    };
    const p = withTimeout(fn, { timeoutMs: 100 });
    const result = expect(p).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(200);
    await result;
    vi.useRealTimers();
  });

  it("uses custom timeoutError message", async () => {
    vi.useFakeTimers();
    const fn = async () => {
      await new Promise<void>((r) => setTimeout(r, 1000));
      return 0;
    };
    const p = withTimeout(fn, { timeoutMs: 50, timeoutError: "too slow!" });
    const result = expect(p).rejects.toThrow("too slow!");
    await vi.advanceTimersByTimeAsync(100);
    await result;
    vi.useRealTimers();
  });

  it("propagates fn's own error without wrapping", async () => {
    const fn = async () => {
      throw new Error("fn error");
    };
    await expect(withTimeout(fn, { timeoutMs: 1000 })).rejects.toThrow("fn error");
  });

  it("resolves immediately for synchronous-ish fn", async () => {
    const fn = async () => 42;
    const result = await withTimeout(fn, { timeoutMs: 5000 });
    expect(result).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// retryWithTimeout
// ---------------------------------------------------------------------------

describe("retryWithTimeout", () => {
  it("succeeds when fn resolves in time", async () => {
    vi.useFakeTimers();
    const fn = makeAlwaysSucceed("fast");
    const p = retryWithTimeout(fn, { maxAttempts: 3 }, 1000);
    await vi.runAllTimersAsync();
    const result = await p;
    expect(result).toBe("fast");
    vi.useRealTimers();
  });

  it("retries on timeout per attempt", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const fn = async (): Promise<string> => {
      calls++;
      if (calls < 3) {
        await new Promise<void>((r) => setTimeout(r, 500));
        return "slow";
      }
      return "fast";
    };
    const p = retryWithTimeout(fn, { maxAttempts: 5, baseDelayMs: 10 }, 100);
    await vi.runAllTimersAsync();
    const result = await p;
    expect(result).toBe("fast");
    expect(calls).toBeGreaterThanOrEqual(3);
    vi.useRealTimers();
  });

  it("exhausts retries if every attempt times out", async () => {
    vi.useFakeTimers();
    const fn = async (): Promise<string> => {
      await new Promise<void>((r) => setTimeout(r, 1000));
      return "never";
    };
    const p = retryWithTimeout(fn, { maxAttempts: 2, baseDelayMs: 10 }, 50);
    const result = expect(p).rejects.toBeInstanceOf(TimeoutError);
    await vi.runAllTimersAsync();
    await result;
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// retryWithFallback
// ---------------------------------------------------------------------------

describe("retryWithFallback", () => {
  it("returns fn's value on success", async () => {
    const result = await retryWithFallback(makeAlwaysSucceed("ok"), "fallback");
    expect(result).toBe("ok");
  });

  it("returns fallback value on exhaustion", async () => {
    vi.useFakeTimers();
    const p = retryWithFallback(makeAlwaysFail(), "default");
    await vi.runAllTimersAsync();
    const result = await p;
    expect(result).toBe("default");
    vi.useRealTimers();
  });

  it("returns fallback=0 correctly (falsy fallback)", async () => {
    vi.useFakeTimers();
    const p = retryWithFallback(makeAlwaysFail(), 0);
    await vi.runAllTimersAsync();
    const result = await p;
    expect(result).toBe(0);
    vi.useRealTimers();
  });

  it("calls fallback function if fallback is a function", async () => {
    vi.useFakeTimers();
    let fallbackCalled = false;
    const fallbackFn = (): string => {
      fallbackCalled = true;
      return "computed";
    };
    const p = retryWithFallback(makeAlwaysFail(), fallbackFn);
    await vi.runAllTimersAsync();
    const result = await p;
    expect(result).toBe("computed");
    expect(fallbackCalled).toBe(true);
    vi.useRealTimers();
  });

  it("calls async fallback function", async () => {
    vi.useFakeTimers();
    const fallbackFn = async (): Promise<number> => 999;
    const p = retryWithFallback(makeAlwaysFail(), fallbackFn);
    await vi.runAllTimersAsync();
    const result = await p;
    expect(result).toBe(999);
    vi.useRealTimers();
  });

  it("respects maxAttempts before falling back", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const fn = async (): Promise<void> => {
      calls++;
      throw new Error("fail");
    };
    const p = retryWithFallback(fn, "fb", { maxAttempts: 4, baseDelayMs: 5 });
    await vi.runAllTimersAsync();
    const result = await p;
    expect(result).toBe("fb");
    expect(calls).toBe(4);
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// CircuitOpenError
// ---------------------------------------------------------------------------

describe("CircuitOpenError", () => {
  it("is an Error", () => {
    expect(new CircuitOpenError("test")).toBeInstanceOf(Error);
  });

  it("stores circuitName", () => {
    const err = new CircuitOpenError("my-cb");
    expect(err.circuitName).toBe("my-cb");
  });

  it("has descriptive message", () => {
    expect(new CircuitOpenError("api").message).toContain("api");
  });
});

// ---------------------------------------------------------------------------
// CircuitBreaker — basic state
// ---------------------------------------------------------------------------

describe("CircuitBreaker — initial state", () => {
  it("starts in CLOSED state", () => {
    const cb = new CircuitBreaker("test");
    expect(cb.state).toBe("CLOSED");
  });

  it("stats reflect initial values", () => {
    const cb = new CircuitBreaker("test");
    const stats = cb.stats;
    expect(stats.state).toBe("CLOSED");
    expect(stats.failures).toBe(0);
    expect(stats.successes).toBe(0);
    expect(stats.totalCalls).toBe(0);
    expect(stats.lastFailureAt).toBeUndefined();
  });

  it("executes fn in CLOSED state", async () => {
    const cb = new CircuitBreaker("test");
    const result = await cb.execute(makeAlwaysSucceed(7));
    expect(result).toBe(7);
  });

  it("increments totalSuccesses on success", async () => {
    const cb = new CircuitBreaker("test");
    await cb.execute(makeAlwaysSucceed(1));
    await cb.execute(makeAlwaysSucceed(2));
    expect(cb.stats.totalSuccesses).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// CircuitBreaker — opens on threshold failures
// ---------------------------------------------------------------------------

describe("CircuitBreaker — opens after threshold", () => {
  it("opens after failureThreshold consecutive failures", async () => {
    const cb = new CircuitBreaker("test", { failureThreshold: 3 });
    for (let i = 0; i < 3; i++) {
      await cb.execute(makeAlwaysFail()).catch(() => null);
    }
    expect(cb.state).toBe("OPEN");
  });

  it("throws CircuitOpenError when OPEN", async () => {
    const cb = new CircuitBreaker("test", { failureThreshold: 2 });
    await cb.execute(makeAlwaysFail()).catch(() => null);
    await cb.execute(makeAlwaysFail()).catch(() => null);
    await expect(cb.execute(makeAlwaysSucceed(1))).rejects.toBeInstanceOf(CircuitOpenError);
  });

  it("calls onStateChange when transitioning CLOSED→OPEN", async () => {
    const changes: Array<[CircuitState, CircuitState]> = [];
    const cb = new CircuitBreaker("test", {
      failureThreshold: 2,
      onStateChange: (from, to) => changes.push([from, to]),
    });
    await cb.execute(makeAlwaysFail()).catch(() => null);
    await cb.execute(makeAlwaysFail()).catch(() => null);
    expect(changes).toContainEqual(["CLOSED", "OPEN"]);
  });

  it("tracks totalFailures", async () => {
    const cb = new CircuitBreaker("test", { failureThreshold: 10 });
    for (let i = 0; i < 3; i++) {
      await cb.execute(makeAlwaysFail()).catch(() => null);
    }
    expect(cb.stats.totalFailures).toBe(3);
  });

  it("records lastFailureAt", async () => {
    const cb = new CircuitBreaker("test", { failureThreshold: 5 });
    const before = new Date();
    await cb.execute(makeAlwaysFail()).catch(() => null);
    const after = new Date();
    expect(cb.stats.lastFailureAt?.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(cb.stats.lastFailureAt?.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it("resets failure streak on success in CLOSED", async () => {
    const cb = new CircuitBreaker("test", { failureThreshold: 3 });
    await cb.execute(makeAlwaysFail()).catch(() => null);
    await cb.execute(makeAlwaysFail()).catch(() => null);
    await cb.execute(makeAlwaysSucceed("ok")); // resets streak
    await cb.execute(makeAlwaysFail()).catch(() => null);
    // Still only 1 consecutive failure — not yet OPEN
    expect(cb.state).toBe("CLOSED");
  });
});

// ---------------------------------------------------------------------------
// CircuitBreaker — HALF_OPEN behavior
// ---------------------------------------------------------------------------

describe("CircuitBreaker — HALF_OPEN", () => {
  it("moves to HALF_OPEN after timeout elapses", async () => {
    vi.useFakeTimers();
    const cb = new CircuitBreaker("test", {
      failureThreshold: 2,
      timeout: 1000,
    });
    await cb.execute(makeAlwaysFail()).catch(() => null);
    await cb.execute(makeAlwaysFail()).catch(() => null);
    expect(cb.state).toBe("OPEN");

    await vi.advanceTimersByTimeAsync(1001);
    // Try a call to trigger the OPEN→HALF_OPEN check
    await cb.execute(makeAlwaysSucceed("probe")).catch(() => null);
    // Should now be CLOSED or HALF_OPEN depending on successThreshold
    expect(["CLOSED", "HALF_OPEN"]).toContain(cb.state);
    vi.useRealTimers();
  });

  it("closes after successThreshold successes in HALF_OPEN", async () => {
    vi.useFakeTimers();
    const cb = new CircuitBreaker("test", {
      failureThreshold: 2,
      successThreshold: 2,
      timeout: 100,
    });
    await cb.execute(makeAlwaysFail()).catch(() => null);
    await cb.execute(makeAlwaysFail()).catch(() => null);

    await vi.advanceTimersByTimeAsync(200);

    await cb.execute(makeAlwaysSucceed("s1"));
    await cb.execute(makeAlwaysSucceed("s2"));
    expect(cb.state).toBe("CLOSED");
    vi.useRealTimers();
  });

  it("returns to OPEN on failure in HALF_OPEN", async () => {
    vi.useFakeTimers();
    const cb = new CircuitBreaker("test", {
      failureThreshold: 2,
      successThreshold: 3,
      timeout: 100,
    });
    await cb.execute(makeAlwaysFail()).catch(() => null);
    await cb.execute(makeAlwaysFail()).catch(() => null);

    await vi.advanceTimersByTimeAsync(200);
    await cb.execute(makeAlwaysFail()).catch(() => null);
    expect(cb.state).toBe("OPEN");
    vi.useRealTimers();
  });

  it("calls onStateChange for OPEN→HALF_OPEN transition", async () => {
    vi.useFakeTimers();
    const changes: Array<[CircuitState, CircuitState]> = [];
    const cb = new CircuitBreaker("test", {
      failureThreshold: 2,
      timeout: 100,
      onStateChange: (f, t) => changes.push([f, t]),
    });
    await cb.execute(makeAlwaysFail()).catch(() => null);
    await cb.execute(makeAlwaysFail()).catch(() => null);

    await vi.advanceTimersByTimeAsync(200);
    await cb.execute(makeAlwaysSucceed("probe")).catch(() => null);

    expect(changes).toContainEqual(["OPEN", "HALF_OPEN"]);
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// CircuitBreaker — reset and trip
// ---------------------------------------------------------------------------

describe("CircuitBreaker — reset and trip", () => {
  it("reset() sets state to CLOSED", async () => {
    const cb = new CircuitBreaker("test", { failureThreshold: 1 });
    await cb.execute(makeAlwaysFail()).catch(() => null);
    expect(cb.state).toBe("OPEN");
    cb.reset();
    expect(cb.state).toBe("CLOSED");
  });

  it("reset() clears failure count", async () => {
    const cb = new CircuitBreaker("test", { failureThreshold: 3 });
    await cb.execute(makeAlwaysFail()).catch(() => null);
    cb.reset();
    expect(cb.stats.failures).toBe(0);
  });

  it("trip() sets state to OPEN immediately", () => {
    const cb = new CircuitBreaker("test");
    cb.trip();
    expect(cb.state).toBe("OPEN");
  });

  it("after trip(), execute throws CircuitOpenError", async () => {
    const cb = new CircuitBreaker("test");
    cb.trip();
    await expect(cb.execute(makeAlwaysSucceed(1))).rejects.toBeInstanceOf(CircuitOpenError);
  });

  it("reset() after trip() allows execution again", async () => {
    const cb = new CircuitBreaker("test");
    cb.trip();
    cb.reset();
    const result = await cb.execute(makeAlwaysSucceed(42));
    expect(result).toBe(42);
  });

  it("reset() calls onStateChange", () => {
    const changes: Array<[CircuitState, CircuitState]> = [];
    const cb = new CircuitBreaker("test", {
      failureThreshold: 1,
      onStateChange: (f, t) => changes.push([f, t]),
    });
    cb.trip();
    cb.reset();
    expect(changes).toContainEqual(["OPEN", "CLOSED"]);
  });
});

// ---------------------------------------------------------------------------
// RateLimiter
// ---------------------------------------------------------------------------

describe("RateLimiter", () => {
  it("allows maxRequests requests", () => {
    const rl = new RateLimiter(3, 1000);
    expect(rl.tryAcquire()).toBe(true);
    expect(rl.tryAcquire()).toBe(true);
    expect(rl.tryAcquire()).toBe(true);
  });

  it("blocks when tokens exhausted", () => {
    const rl = new RateLimiter(2, 1000);
    rl.tryAcquire();
    rl.tryAcquire();
    expect(rl.tryAcquire()).toBe(false);
  });

  it("availableTokens decrements correctly", () => {
    const rl = new RateLimiter(5, 1000);
    expect(rl.availableTokens).toBe(5);
    rl.tryAcquire();
    expect(rl.availableTokens).toBe(4);
  });

  it("reset() restores tokens to max", () => {
    const rl = new RateLimiter(3, 1000);
    rl.tryAcquire();
    rl.tryAcquire();
    rl.tryAcquire();
    expect(rl.availableTokens).toBe(0);
    rl.reset();
    expect(rl.availableTokens).toBe(3);
  });

  it("refills after window expires", async () => {
    vi.useFakeTimers();
    const rl = new RateLimiter(2, 100);
    rl.tryAcquire();
    rl.tryAcquire();
    expect(rl.availableTokens).toBe(0);
    await vi.advanceTimersByTimeAsync(110);
    expect(rl.availableTokens).toBe(2);
    vi.useRealTimers();
  });

  it("acquire() resolves after window reset", async () => {
    vi.useFakeTimers();
    const rl = new RateLimiter(1, 100);
    rl.tryAcquire(); // exhaust
    let resolved = false;
    const p = rl.acquire().then(() => {
      resolved = true;
    });
    expect(resolved).toBe(false);
    await vi.advanceTimersByTimeAsync(200);
    await p;
    expect(resolved).toBe(true);
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// Bulkhead
// ---------------------------------------------------------------------------

describe("Bulkhead", () => {
  it("executes fn within concurrency limit", async () => {
    const bh = new Bulkhead(3);
    const results = await Promise.all([
      bh.execute(makeAlwaysSucceed(1)),
      bh.execute(makeAlwaysSucceed(2)),
      bh.execute(makeAlwaysSucceed(3)),
    ]);
    expect(results).toEqual([1, 2, 3]);
  });

  it("queues excess requests when at capacity", async () => {
    vi.useFakeTimers();
    const bh = new Bulkhead(1);
    const order: number[] = [];

    const slow = async (): Promise<void> => {
      await new Promise<void>((r) => setTimeout(r, 100));
      order.push(1);
    };
    const fast = async (): Promise<void> => {
      order.push(2);
    };

    const p1 = bh.execute(slow);
    const p2 = bh.execute(fast);
    await vi.runAllTimersAsync();
    await Promise.all([p1, p2]);
    expect(order).toEqual([1, 2]);
    vi.useRealTimers();
  });

  it("throws BulkheadRejectedError when queue is full", async () => {
    vi.useFakeTimers();
    const bh = new Bulkhead(1, 1);

    // Fill active slot
    const slow = () => new Promise<void>((r) => setTimeout(r, 500));
    const p1 = bh.execute(slow);
    // Fill queue
    const p2 = bh.execute(slow);
    // This should be rejected
    await expect(bh.execute(slow)).rejects.toBeInstanceOf(BulkheadRejectedError);

    await vi.runAllTimersAsync();
    await Promise.all([p1, p2]).catch(() => null);
    vi.useRealTimers();
  });

  it("active count stays within maxConcurrent", async () => {
    vi.useFakeTimers();
    const bh = new Bulkhead(2);
    let maxObserved = 0;

    const task = async (): Promise<void> => {
      maxObserved = Math.max(maxObserved, bh.active);
      await new Promise<void>((r) => setTimeout(r, 50));
    };

    const all = Promise.all([
      bh.execute(task),
      bh.execute(task),
      bh.execute(task),
    ]);
    await vi.runAllTimersAsync();
    await all;
    expect(maxObserved).toBeLessThanOrEqual(2);
    vi.useRealTimers();
  });

  it("queued count increments while waiting", async () => {
    vi.useFakeTimers();
    const bh = new Bulkhead(1);
    const slow = () => new Promise<void>((r) => setTimeout(r, 200));

    const p1 = bh.execute(slow);
    const p2Promise = bh.execute(slow);

    // After launching both, queued should be 1
    expect(bh.queued).toBe(1);

    await vi.runAllTimersAsync();
    await Promise.all([p1, p2Promise]);
    vi.useRealTimers();
  });

  it("BulkheadRejectedError is an Error", () => {
    expect(new BulkheadRejectedError()).toBeInstanceOf(Error);
  });
});

// ---------------------------------------------------------------------------
// memoizeAsync
// ---------------------------------------------------------------------------

describe("memoizeAsync", () => {
  it("caches successful results", async () => {
    let calls = 0;
    const fn = async (key: string): Promise<string> => {
      calls++;
      return key.toUpperCase();
    };
    const memoized = memoizeAsync(fn);
    const a = await memoized("hello");
    const b = await memoized("hello");
    expect(a).toBe("HELLO");
    expect(b).toBe("HELLO");
    expect(calls).toBe(1);
  });

  it("deduplicates in-flight requests", async () => {
    let calls = 0;
    const fn = async (key: number): Promise<number> => {
      calls++;
      await new Promise<void>((r) => setTimeout(r, 50));
      return key * 2;
    };
    vi.useFakeTimers();
    const memoized = memoizeAsync(fn);
    const p1 = memoized(5);
    const p2 = memoized(5);
    await vi.runAllTimersAsync();
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe(10);
    expect(r2).toBe(10);
    expect(calls).toBe(1);
    vi.useRealTimers();
  });

  it("does not cache errors", async () => {
    let calls = 0;
    const fn = async (_key: string): Promise<string> => {
      calls++;
      if (calls === 1) throw new Error("first call error");
      return "ok";
    };
    const memoized = memoizeAsync(fn);
    await memoized("x").catch(() => null);
    const result = await memoized("x");
    expect(result).toBe("ok");
    expect(calls).toBe(2);
  });

  it("respects ttlMs expiry", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const fn = async (key: string): Promise<string> => {
      calls++;
      return key;
    };
    const memoized = memoizeAsync(fn, { ttlMs: 100 });
    await memoized("k");
    await vi.advanceTimersByTimeAsync(200);
    await memoized("k");
    expect(calls).toBe(2);
    vi.useRealTimers();
  });

  it("evicts LRU when maxSize exceeded", async () => {
    let calls = 0;
    const fn = async (key: string): Promise<string> => {
      calls++;
      return key;
    };
    const memoized = memoizeAsync(fn, { maxSize: 2 });
    await memoized("a");
    await memoized("b");
    await memoized("c"); // evicts "a"
    calls = 0;
    await memoized("a"); // should re-fetch
    expect(calls).toBe(1);
  });

  it("uses custom cacheKey", async () => {
    let calls = 0;
    const fn = async (key: { id: number }): Promise<number> => {
      calls++;
      return key.id;
    };
    const memoized = memoizeAsync(fn, { cacheKey: (k) => String(k.id) });
    await memoized({ id: 1 });
    await memoized({ id: 1 });
    expect(calls).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// hedgedRequest
// ---------------------------------------------------------------------------

describe("hedgedRequest", () => {
  it("returns the fastest successful result", async () => {
    vi.useFakeTimers();
    const slow = async (): Promise<string> => {
      await new Promise<void>((r) => setTimeout(r, 500));
      return "slow";
    };
    const fast = async (): Promise<string> => {
      await new Promise<void>((r) => setTimeout(r, 50));
      return "fast";
    };
    const p = hedgedRequest([slow, fast]);
    await vi.runAllTimersAsync();
    const result = await p;
    expect(result).toBe("fast");
    vi.useRealTimers();
  });

  it("throws last error when all fns fail", async () => {
    const fns = [makeAlwaysFail("e1"), makeAlwaysFail("e2"), makeAlwaysFail("e3")];
    await expect(hedgedRequest(fns)).rejects.toThrow("e3");
  });

  it("throws when no fns provided", async () => {
    await expect(hedgedRequest([])).rejects.toThrow();
  });

  it("staggered start with delayMs", async () => {
    vi.useFakeTimers();
    const order: number[] = [];
    const fns = [0, 1, 2].map((i) => async (): Promise<number> => {
      order.push(i);
      return i;
    });
    const p = hedgedRequest(fns, { delayMs: 100 });
    await vi.runAllTimersAsync();
    await p;
    // First fn starts immediately
    expect(order[0]).toBe(0);
    vi.useRealTimers();
  });

  it("respects overall timeout option", async () => {
    vi.useFakeTimers();
    const slow = async (): Promise<string> => {
      await new Promise<void>((r) => setTimeout(r, 5000));
      return "too late";
    };
    const p = hedgedRequest([slow, slow], { timeout: 100 });
    const result = expect(p).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(200);
    await result;
    vi.useRealTimers();
  });

  it("works with a single fn", async () => {
    const result = await hedgedRequest([makeAlwaysSucceed("only")]);
    expect(result).toBe("only");
  });
});

// ---------------------------------------------------------------------------
// withResilience
// ---------------------------------------------------------------------------

describe("withResilience", () => {
  it("passes through a simple success", async () => {
    const result = await withResilience(makeAlwaysSucceed("ok"), {});
    expect(result).toBe("ok");
  });

  it("uses fallback when fn always fails and no retry/timeout", async () => {
    const result = await withResilience(makeAlwaysFail(), { fallback: "fb" });
    expect(result).toBe("fb");
  });

  it("applies retry config", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const fn = async (): Promise<string> => {
      calls++;
      if (calls < 3) throw new Error("try again");
      return "success";
    };
    const p = withResilience(fn, { retry: { maxAttempts: 5, baseDelayMs: 10 } });
    await vi.runAllTimersAsync();
    const result = await p;
    expect(result).toBe("success");
    expect(calls).toBe(3);
    vi.useRealTimers();
  });

  it("applies circuit breaker", async () => {
    const cb = new CircuitBreaker("resilience-test", { failureThreshold: 2 });
    await cb.execute(makeAlwaysFail()).catch(() => null);
    await cb.execute(makeAlwaysFail()).catch(() => null);
    // CB is now OPEN
    await expect(
      withResilience(makeAlwaysSucceed("unreachable"), { circuitBreaker: cb }),
    ).rejects.toBeInstanceOf(CircuitOpenError);
  });

  it("applies timeout and retries on timeout", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const fn = async (): Promise<string> => {
      calls++;
      if (calls === 1) {
        await new Promise<void>((r) => setTimeout(r, 500));
      }
      return "ok";
    };
    const p = withResilience(fn, {
      retry: { maxAttempts: 3, baseDelayMs: 10 },
      timeout: 100,
    });
    await vi.runAllTimersAsync();
    const result = await p;
    expect(result).toBe("ok");
    vi.useRealTimers();
  });

  it("applies fallback after retry exhaustion", async () => {
    vi.useFakeTimers();
    const p = withResilience(makeAlwaysFail(), {
      retry: { maxAttempts: 2, baseDelayMs: 5 },
      fallback: "default",
    });
    await vi.runAllTimersAsync();
    const result = await p;
    expect(result).toBe("default");
    vi.useRealTimers();
  });

  it("throws if all patterns fail and no fallback", async () => {
    vi.useFakeTimers();
    const p = withResilience(makeAlwaysFail("boom"), {
      retry: { maxAttempts: 2, baseDelayMs: 5 },
    });
    const result = expect(p).rejects.toThrow("boom");
    await vi.runAllTimersAsync();
    await result;
    vi.useRealTimers();
  });
});

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  sleep,
  exponentialBackoff,
  withTimeout,
  fetchWithRetry,
  fetchJson,
  fetchText,
  buildQueryString,
  buildUrl,
  parseRateLimit,
  isNetworkError,
  createAbortController,
} from "@/lib/utils/fetch-utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFetchResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  const bodyStr =
    typeof body === "string" ? body : JSON.stringify(body);
  return new Response(bodyStr, {
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: new Headers(headers),
  });
}

// ---------------------------------------------------------------------------
// sleep
// ---------------------------------------------------------------------------

describe("sleep", () => {
  it("resolves after approximately the specified time", async () => {
    vi.useFakeTimers();
    const start = Date.now();
    let resolved = false;

    const p = sleep(1000).then(() => {
      resolved = true;
    });

    expect(resolved).toBe(false);
    vi.advanceTimersByTime(1000);
    await p;
    expect(resolved).toBe(true);

    vi.useRealTimers();
  });

  it("resolves immediately for 0ms", async () => {
    vi.useFakeTimers();
    const p = sleep(0);
    vi.advanceTimersByTime(0);
    await p;
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// exponentialBackoff
// ---------------------------------------------------------------------------

describe("exponentialBackoff", () => {
  it("attempt=0 returns close to baseMs (within jitter range)", () => {
    // jitter=0 means deterministic
    const result = exponentialBackoff(0, 500, 30000, 0);
    expect(result).toBe(500);
  });

  it("attempt=1 returns close to 2*baseMs with jitter=0", () => {
    const result = exponentialBackoff(1, 500, 30000, 0);
    expect(result).toBe(1000);
  });

  it("attempt=2 returns 4*baseMs with jitter=0", () => {
    const result = exponentialBackoff(2, 500, 30000, 0);
    expect(result).toBe(2000);
  });

  it("caps at maxMs", () => {
    const result = exponentialBackoff(20, 500, 1000, 0);
    expect(result).toBe(1000);
  });

  it("jitter=0 is deterministic across calls", () => {
    const a = exponentialBackoff(3, 100, 10000, 0);
    const b = exponentialBackoff(3, 100, 10000, 0);
    expect(a).toBe(b);
  });

  it("jitter > 0 adds randomness above base value", () => {
    // With jitter=1, value should be in range [base, 2*base]
    const results = Array.from({ length: 20 }, () =>
      exponentialBackoff(0, 500, 30000, 1),
    );
    // All values >= 500 (the base) and <= 1000 (base * 2)
    for (const r of results) {
      expect(r).toBeGreaterThanOrEqual(500);
      expect(r).toBeLessThanOrEqual(1001); // tiny float tolerance
    }
  });
});

// ---------------------------------------------------------------------------
// buildQueryString
// ---------------------------------------------------------------------------

describe("buildQueryString", () => {
  it("returns empty string for empty object", () => {
    expect(buildQueryString({})).toBe("");
  });

  it("returns ?foo=bar for single string param", () => {
    expect(buildQueryString({ foo: "bar" })).toBe("?foo=bar");
  });

  it("handles multiple params", () => {
    const qs = buildQueryString({ a: 1, b: "x" });
    expect(qs).toBe("?a=1&b=x");
  });

  it("skips null values", () => {
    expect(buildQueryString({ a: "yes", b: null })).toBe("?a=yes");
  });

  it("skips undefined values", () => {
    expect(buildQueryString({ a: "yes", b: undefined })).toBe("?a=yes");
  });

  it("includes boolean values as-is", () => {
    expect(buildQueryString({ enabled: true })).toBe("?enabled=true");
    expect(buildQueryString({ enabled: false })).toBe("?enabled=false");
  });

  it("includes numeric 0 as value", () => {
    expect(buildQueryString({ limit: 0 })).toBe("?limit=0");
  });

  it("URL-encodes special characters", () => {
    const qs = buildQueryString({ q: "hello world" });
    expect(qs).toBe("?q=hello%20world");
  });

  it("returns empty string when all values are null/undefined", () => {
    expect(buildQueryString({ a: null, b: undefined })).toBe("");
  });
});

// ---------------------------------------------------------------------------
// buildUrl
// ---------------------------------------------------------------------------

describe("buildUrl", () => {
  it("combines base and path", () => {
    expect(buildUrl("https://api.example.com", "/data")).toBe(
      "https://api.example.com/data",
    );
  });

  it("strips trailing slash on base before joining", () => {
    expect(buildUrl("https://api.example.com/", "/data")).toBe(
      "https://api.example.com/data",
    );
  });

  it("adds leading slash to path if missing", () => {
    expect(buildUrl("https://api.example.com", "data")).toBe(
      "https://api.example.com/data",
    );
  });

  it("appends query string when params given", () => {
    const result = buildUrl("https://api.example.com", "/search", { q: "nfl" });
    expect(result).toBe("https://api.example.com/search?q=nfl");
  });

  it("omits query string when no params", () => {
    expect(buildUrl("https://api.example.com", "/health")).toBe(
      "https://api.example.com/health",
    );
  });

  it("omits query string when params object is empty", () => {
    expect(buildUrl("https://api.example.com", "/health", {})).toBe(
      "https://api.example.com/health",
    );
  });

  it("skips null params in query string", () => {
    const result = buildUrl("https://api.example.com", "/q", {
      sport: "nfl",
      week: null,
    });
    expect(result).toBe("https://api.example.com/q?sport=nfl");
  });
});

// ---------------------------------------------------------------------------
// parseRateLimit
// ---------------------------------------------------------------------------

describe("parseRateLimit", () => {
  it("parses X-RateLimit-Remaining header", () => {
    const res = makeFetchResponse(200, "", {
      "X-RateLimit-Remaining": "42",
    });
    const { remaining } = parseRateLimit(res);
    expect(remaining).toBe(42);
  });

  it("parses X-RateLimit-Reset as unix timestamp to Date", () => {
    const unix = 1700000000;
    const res = makeFetchResponse(200, "", {
      "X-RateLimit-Reset": String(unix),
    });
    const { reset } = parseRateLimit(res);
    expect(reset).toBeInstanceOf(Date);
    expect(reset!.getTime()).toBe(unix * 1000);
  });

  it("parses X-RateLimit-Limit header", () => {
    const res = makeFetchResponse(200, "", {
      "X-RateLimit-Limit": "100",
    });
    const { limit } = parseRateLimit(res);
    expect(limit).toBe(100);
  });

  it("returns null for missing headers", () => {
    const res = makeFetchResponse(200, "");
    const { remaining, reset, limit } = parseRateLimit(res);
    expect(remaining).toBeNull();
    expect(reset).toBeNull();
    expect(limit).toBeNull();
  });

  it("returns null for unparseable header values", () => {
    const res = makeFetchResponse(200, "", {
      "X-RateLimit-Remaining": "not-a-number",
      "X-RateLimit-Reset": "bad-date",
      "X-RateLimit-Limit": "??",
    });
    const { remaining, reset, limit } = parseRateLimit(res);
    expect(remaining).toBeNull();
    expect(reset).toBeNull();
    expect(limit).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isNetworkError
// ---------------------------------------------------------------------------

describe("isNetworkError", () => {
  it("TypeError with 'Failed to fetch' → true", () => {
    expect(isNetworkError(new TypeError("Failed to fetch"))).toBe(true);
  });

  it("TypeError with 'fetch' in message → true", () => {
    expect(isNetworkError(new TypeError("fetch error occurred"))).toBe(true);
  });

  it("TypeError with 'network' in message → true", () => {
    expect(isNetworkError(new TypeError("network request failed"))).toBe(true);
  });

  it("AbortError → false (intentional cancellation)", () => {
    const err = new DOMException("Aborted", "AbortError");
    expect(isNetworkError(err)).toBe(false);
  });

  it("regular Error → false", () => {
    expect(isNetworkError(new Error("something went wrong"))).toBe(false);
  });

  it("non-Error value → false", () => {
    expect(isNetworkError("string error")).toBe(false);
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError(42)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// fetchJson — mock global fetch
// ---------------------------------------------------------------------------

describe("fetchJson", () => {
  const globalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = globalFetch;
    vi.restoreAllMocks();
  });

  it("returns ok:true with data on 200 response", async () => {
    const payload = { picks: [{ id: 1 }] };
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      makeFetchResponse(200, payload),
    );

    const result = await fetchJson<typeof payload>("https://api.example.com/picks");
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.data).toEqual(payload);
    expect(result.error).toBeNull();
  });

  it("returns ok:false with status on 404 response", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      makeFetchResponse(404, "Not Found"),
    );

    const result = await fetchJson("https://api.example.com/missing");
    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it("returns ok:false with status 0 on network error", async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(
      new TypeError("Failed to fetch"),
    );

    const result = await fetchJson("https://api.example.com/picks", undefined, {
      maxAttempts: 1,
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
    expect(result.error).toContain("fetch");
  });

  it("returns ok:false on invalid JSON response", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      makeFetchResponse(200, "not json {{{"),
    );
    // The raw response body is "not json {{{" which isn't valid JSON
    // Use a manually crafted Response that returns invalid JSON
    const badResponse = new Response("not-valid-json!!!", {
      status: 200,
      statusText: "OK",
    });
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(badResponse);

    const result = await fetchJson("https://api.example.com/bad");
    expect(result.ok).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// fetchText
// ---------------------------------------------------------------------------

describe("fetchText", () => {
  const globalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = globalFetch;
    vi.restoreAllMocks();
  });

  it("returns ok:true with text on 200 response", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      makeFetchResponse(200, "hello world"),
    );

    const result = await fetchText("https://api.example.com/text");
    expect(result.ok).toBe(true);
    expect(result.text).toBe("hello world");
    expect(result.status).toBe(200);
    expect(result.error).toBeNull();
  });

  it("returns ok:false on HTTP error response", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      makeFetchResponse(500, "Internal Server Error"),
    );

    const result = await fetchText("https://api.example.com/fail", undefined, {
      maxAttempts: 1,
    });
    expect(result.ok).toBe(false);
    expect(result.text).toBeNull();
    expect(result.status).toBe(500);
  });

  it("returns ok:false with status 0 on network error", async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(
      new TypeError("Failed to fetch"),
    );

    const result = await fetchText("https://api.example.com/fail", undefined, {
      maxAttempts: 1,
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
    expect(result.error).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// fetchWithRetry — mock global fetch
// ---------------------------------------------------------------------------

describe("fetchWithRetry", () => {
  const globalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    globalThis.fetch = globalFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("retries on 503 up to maxAttempts", async () => {
    vi.mocked(globalThis.fetch)
      .mockResolvedValue(makeFetchResponse(503, "Service Unavailable"));

    const promise = fetchWithRetry("https://api.example.com/data", undefined, {
      maxAttempts: 3,
      baseDelayMs: 100,
      jitter: 0,
    });

    // Advance timers for retries
    await vi.runAllTimersAsync();
    const res = await promise;

    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(3);
    expect(res.status).toBe(503);
  });

  it("does not retry on 404 (client error not in retryableStatuses)", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      makeFetchResponse(404, "Not Found"),
    );

    const promise = fetchWithRetry("https://api.example.com/missing", undefined, {
      maxAttempts: 3,
    });

    await vi.runAllTimersAsync();
    const res = await promise;

    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(404);
  });

  it("calls onRetry on each retry with attempt number and delay", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      makeFetchResponse(503, "Service Unavailable"),
    );

    const onRetry = vi.fn();
    const promise = fetchWithRetry("https://api.example.com/data", undefined, {
      maxAttempts: 3,
      baseDelayMs: 100,
      jitter: 0,
      onRetry,
    });

    await vi.runAllTimersAsync();
    await promise;

    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, expect.any(Number), expect.any(Error));
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.any(Number), expect.any(Error));
  });

  it("succeeds if server recovers on second attempt", async () => {
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce(makeFetchResponse(503, "Service Unavailable"))
      .mockResolvedValueOnce(makeFetchResponse(200, { ok: true }));

    const promise = fetchWithRetry("https://api.example.com/data", undefined, {
      maxAttempts: 3,
      baseDelayMs: 100,
      jitter: 0,
    });

    await vi.runAllTimersAsync();
    const res = await promise;

    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(200);
  });

  it("does not retry on network error after maxAttempts, then throws", async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(
      new TypeError("Failed to fetch"),
    );

    // Capture rejection immediately to avoid unhandled-rejection warning
    let caughtError: unknown;
    const promise = fetchWithRetry("https://api.example.com/data", undefined, {
      maxAttempts: 2,
      baseDelayMs: 50,
      jitter: 0,
    }).catch((e: unknown) => {
      caughtError = e;
    });

    await vi.runAllTimersAsync();
    await promise;

    expect(caughtError).toBeInstanceOf(TypeError);
    expect((caughtError as TypeError).message).toContain("Failed to fetch");
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(2);
  });

  it("succeeds on first attempt without any retries", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      makeFetchResponse(200, { data: "ok" }),
    );

    const promise = fetchWithRetry("https://api.example.com/data");
    await vi.runAllTimersAsync();
    const res = await promise;

    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
  });

  it("retries on 429 (rate limit) by default", async () => {
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce(makeFetchResponse(429, "Too Many Requests"))
      .mockResolvedValueOnce(makeFetchResponse(200, { data: "ok" }));

    const promise = fetchWithRetry("https://api.example.com/data", undefined, {
      maxAttempts: 3,
      baseDelayMs: 100,
      jitter: 0,
    });

    await vi.runAllTimersAsync();
    const res = await promise;

    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// createAbortController
// ---------------------------------------------------------------------------

describe("createAbortController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a controller and clear function", () => {
    const { controller, clear } = createAbortController();
    expect(controller).toBeInstanceOf(AbortController);
    expect(clear).toBeTypeOf("function");
    clear(); // should not throw
  });

  it("auto-aborts after timeoutMs", () => {
    const { controller } = createAbortController(500);
    expect(controller.signal.aborted).toBe(false);
    vi.advanceTimersByTime(500);
    expect(controller.signal.aborted).toBe(true);
  });

  it("clear() prevents auto-abort", () => {
    const { controller, clear } = createAbortController(500);
    clear();
    vi.advanceTimersByTime(1000);
    expect(controller.signal.aborted).toBe(false);
  });

  it("no timeout when timeoutMs is undefined", () => {
    const { controller } = createAbortController();
    vi.advanceTimersByTime(100000);
    expect(controller.signal.aborted).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// withTimeout
// ---------------------------------------------------------------------------

describe("withTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves with the promise value if it resolves before timeout", async () => {
    const p = Promise.resolve(42);
    const result = await withTimeout(p, 1000);
    expect(result).toBe(42);
  });

  it("rejects with timeout error if promise does not resolve in time", async () => {
    const never = new Promise<never>(() => {/* never resolves */});
    const promise = withTimeout(never, 500);
    vi.advanceTimersByTime(500);
    await expect(promise).rejects.toThrow("Request timed out");
  });

  it("rejects immediately if signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const p = Promise.resolve(1);
    await expect(withTimeout(p, 1000, controller.signal)).rejects.toBeDefined();
  });
});

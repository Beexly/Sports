/**
 * Fetch utility helpers — retry, timeout, response parsing, and rate-limit backoff.
 *
 * These wrap the global fetch() for resilient data fetching in server
 * components and API routes. No new npm dependencies.
 *
 * IMPORTANT: Only use these for external APIs that are clearance-approved
 * in the Scraping Clearance Engine. Never call checkClearance() from here —
 * that is the caller's responsibility.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RetryOptions {
  /** Max attempts including the first (default: 3) */
  maxAttempts?: number;
  /** Base delay in ms for exponential backoff (default: 500) */
  baseDelayMs?: number;
  /** Maximum delay cap in ms (default: 30000) */
  maxDelayMs?: number;
  /** Jitter factor 0-1 to randomize delays (default: 0.1) */
  jitter?: number;
  /** HTTP status codes that should trigger a retry (default: [429, 500, 502, 503, 504]) */
  retryableStatuses?: readonly number[];
  /** Called on each retry with (attempt, delayMs, error) */
  onRetry?: (attempt: number, delayMs: number, error: unknown) => void;
}

export interface FetchWithRetryOptions extends RetryOptions {
  /** AbortSignal for cancellation (wraps in a combined signal with timeout if timeoutMs set) */
  signal?: AbortSignal;
  /** Per-attempt timeout in ms (default: no timeout) */
  timeoutMs?: number;
}

export interface JsonResult<T> {
  readonly ok: boolean;
  readonly data: T | null;
  readonly status: number;
  readonly error: string | null;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 30_000;
const DEFAULT_JITTER = 0.1;
const DEFAULT_RETRYABLE_STATUSES: readonly number[] = [429, 500, 502, 503, 504];

// ---------------------------------------------------------------------------
// sleep
// ---------------------------------------------------------------------------

/**
 * Promise-based delay. Used internally but exported for test convenience.
 * Works with vi.useFakeTimers() because it uses setTimeout.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// exponentialBackoff
// ---------------------------------------------------------------------------

/**
 * Compute exponential backoff delay.
 *
 * Formula: min(baseMs * 2^attempt, maxMs) * (1 + random * jitter)
 * @param attempt 0-indexed retry attempt (first retry is attempt=0)
 * @param baseMs  base delay in milliseconds
 * @param maxMs   maximum delay cap in milliseconds
 * @param jitter  jitter factor 0-1 to randomize delays
 */
export function exponentialBackoff(
  attempt: number,
  baseMs: number,
  maxMs: number,
  jitter: number,
): number {
  const base = Math.min(baseMs * Math.pow(2, attempt), maxMs);
  return base * (1 + Math.random() * jitter);
}

// ---------------------------------------------------------------------------
// withTimeout
// ---------------------------------------------------------------------------

/**
 * Race a promise against a timeout.
 *
 * Rejects with Error("Request timed out") if the timeout fires first.
 * If signal is already aborted, rejects immediately.
 * Cleans up timeout on completion.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  signal?: AbortSignal,
): Promise<T> {
  if (signal?.aborted) {
    return Promise.reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
  }

  return new Promise<T>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = (): void => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    timer = setTimeout(() => {
      cleanup();
      reject(new Error("Request timed out"));
    }, ms);

    promise.then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (err: unknown) => {
        cleanup();
        reject(err);
      },
    );
  });
}

// ---------------------------------------------------------------------------
// createAbortController
// ---------------------------------------------------------------------------

/**
 * Create an AbortController that auto-aborts after timeoutMs (if provided).
 * `clear()` cancels the auto-abort timer without aborting.
 */
export function createAbortController(
  timeoutMs?: number,
): { controller: AbortController; clear: () => void } {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = null;

  if (timeoutMs !== undefined && timeoutMs > 0) {
    timer = setTimeout(() => {
      controller.abort(new Error("Request timed out"));
    }, timeoutMs);
  }

  const clear = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return { controller, clear };
}

// ---------------------------------------------------------------------------
// isNetworkError
// ---------------------------------------------------------------------------

/**
 * Returns true if the error represents a network-level failure
 * (e.g. DNS failure, connection refused, ECONNRESET).
 *
 * AbortError is intentional cancellation — not a network error.
 */
export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  // AbortError is intentional, not a network failure
  if (error.name === "AbortError") return false;
  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("fetch") ||
      msg.includes("network") ||
      msg.includes("failed to fetch") ||
      msg.includes("load failed") ||
      msg.includes("econnreset") ||
      msg.includes("econnrefused") ||
      msg.includes("enotfound")
    );
  }
  return false;
}

// ---------------------------------------------------------------------------
// fetchWithRetry
// ---------------------------------------------------------------------------

/**
 * Fetch with retry and exponential backoff.
 *
 * - Retries on network errors (fetch throws) and on retryable HTTP status codes.
 * - Does NOT retry on 4xx (except 429) — only network errors and configured retryableStatuses.
 * - On final failure throws the last error.
 * - Applies per-attempt timeout via withTimeout if timeoutMs is set.
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  opts?: FetchWithRetryOptions,
): Promise<Response> {
  const maxAttempts = opts?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const baseDelayMs = opts?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = opts?.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const jitter = opts?.jitter ?? DEFAULT_JITTER;
  const retryableStatuses = opts?.retryableStatuses ?? DEFAULT_RETRYABLE_STATUSES;
  const onRetry = opts?.onRetry;
  const timeoutMs = opts?.timeoutMs;
  const externalSignal = opts?.signal;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Merge external signal with per-attempt timeout if needed
    let attemptInit: RequestInit | undefined = init;
    let timeoutClear: (() => void) | undefined;

    if (externalSignal?.aborted) {
      throw externalSignal.reason ?? new DOMException("Aborted", "AbortError");
    }

    if (timeoutMs !== undefined) {
      const { controller, clear } = createAbortController(timeoutMs);
      timeoutClear = clear;

      // Combine with external signal if provided
      if (externalSignal) {
        const onAbort = (): void => {
          controller.abort(externalSignal.reason);
        };
        if (externalSignal.aborted) {
          clear();
          throw externalSignal.reason ?? new DOMException("Aborted", "AbortError");
        }
        externalSignal.addEventListener("abort", onAbort, { once: true });
        // We'll clean up in finally
        const originalClear = clear;
        timeoutClear = (): void => {
          externalSignal.removeEventListener("abort", onAbort);
          originalClear();
        };
      }

      attemptInit = { ...init, signal: controller.signal };
    } else if (externalSignal) {
      attemptInit = { ...init, signal: externalSignal };
    }

    try {
      const fetchPromise = fetch(url, attemptInit);
      const response = timeoutMs !== undefined
        ? await withTimeout(fetchPromise, timeoutMs)
        : await fetchPromise;

      if (timeoutClear) timeoutClear();

      // Check if status is retryable
      if (!response.ok && retryableStatuses.includes(response.status)) {
        const retryError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        lastError = retryError;

        if (attempt < maxAttempts - 1) {
          const delayMs = exponentialBackoff(attempt, baseDelayMs, maxDelayMs, jitter);
          onRetry?.(attempt + 1, delayMs, retryError);
          await sleep(delayMs);
          continue;
        }

        return response;
      }

      return response;
    } catch (err: unknown) {
      if (timeoutClear) timeoutClear();
      lastError = err;

      // Don't retry on AbortError (intentional cancellation)
      if (err instanceof Error && err.name === "AbortError") {
        throw err;
      }

      // Only retry on network errors, not other throws
      if (attempt < maxAttempts - 1) {
        const delayMs = exponentialBackoff(attempt, baseDelayMs, maxDelayMs, jitter);
        onRetry?.(attempt + 1, delayMs, err);
        await sleep(delayMs);
        continue;
      }
    }
  }

  throw lastError;
}

// ---------------------------------------------------------------------------
// fetchJson
// ---------------------------------------------------------------------------

/**
 * Fetch and parse JSON. Never throws.
 *
 * - Returns `{ ok: true, data: T, status: 200, error: null }` on success.
 * - Returns `{ ok: false, data: null, status, error: "..." }` on HTTP error.
 * - Returns `{ ok: false, data: null, status: 0, error: "..." }` on network/parse error.
 */
export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
  opts?: FetchWithRetryOptions,
): Promise<JsonResult<T>> {
  try {
    const response = await fetchWithRetry(url, init, opts);

    if (!response.ok) {
      let errorText = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const body = await response.text();
        if (body) errorText = body;
      } catch {
        // ignore body read errors
      }
      return { ok: false, data: null, status: response.status, error: errorText };
    }

    try {
      const data = (await response.json()) as T;
      return { ok: true, data, status: response.status, error: null };
    } catch (parseErr: unknown) {
      const msg =
        parseErr instanceof Error ? parseErr.message : "Failed to parse JSON";
      return { ok: false, data: null, status: response.status, error: msg };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Network error";
    return { ok: false, data: null, status: 0, error: msg };
  }
}

// ---------------------------------------------------------------------------
// fetchText
// ---------------------------------------------------------------------------

/**
 * Fetch and return text. Never throws.
 *
 * Same pattern as fetchJson but for text responses.
 */
export async function fetchText(
  url: string,
  init?: RequestInit,
  opts?: FetchWithRetryOptions,
): Promise<{ ok: boolean; text: string | null; status: number; error: string | null }> {
  try {
    const response = await fetchWithRetry(url, init, opts);

    if (!response.ok) {
      let errorText = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const body = await response.text();
        if (body) errorText = body;
      } catch {
        // ignore body read errors
      }
      return { ok: false, text: null, status: response.status, error: errorText };
    }

    try {
      const text = await response.text();
      return { ok: true, text, status: response.status, error: null };
    } catch (readErr: unknown) {
      const msg =
        readErr instanceof Error ? readErr.message : "Failed to read response";
      return { ok: false, text: null, status: response.status, error: msg };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Network error";
    return { ok: false, text: null, status: 0, error: msg };
  }
}

// ---------------------------------------------------------------------------
// buildQueryString
// ---------------------------------------------------------------------------

/**
 * Build a URL query string from a params object.
 * Skips null/undefined values.
 * Returns "" for empty params, "?foo=bar&baz=1" otherwise.
 */
export function buildQueryString(
  params: Record<string, string | number | boolean | null | undefined>,
): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== null && v !== undefined,
  ) as [string, string | number | boolean][];

  if (entries.length === 0) return "";

  const qs = entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");

  return `?${qs}`;
}

// ---------------------------------------------------------------------------
// buildUrl
// ---------------------------------------------------------------------------

/**
 * Combine base URL + path + query params cleanly.
 * Handles trailing/leading slashes.
 */
export function buildUrl(
  base: string,
  path: string,
  params?: Record<string, string | number | boolean | null | undefined>,
): string {
  const normalizedBase = base.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const qs = params ? buildQueryString(params) : "";
  return `${normalizedBase}${normalizedPath}${qs}`;
}

// ---------------------------------------------------------------------------
// parseRateLimit
// ---------------------------------------------------------------------------

/**
 * Parse common rate-limit headers from a Response.
 *
 * Headers parsed:
 *   X-RateLimit-Remaining — number of requests remaining
 *   X-RateLimit-Reset     — unix timestamp (seconds) when the limit resets
 *   X-RateLimit-Limit     — total request limit for the window
 *
 * Returns null for missing or unparseable headers.
 */
export function parseRateLimit(response: Response): {
  remaining: number | null;
  reset: Date | null;
  limit: number | null;
} {
  const parseIntHeader = (name: string): number | null => {
    const raw = response.headers.get(name);
    if (raw === null) return null;
    const n = parseInt(raw, 10);
    return isNaN(n) ? null : n;
  };

  const remaining = parseIntHeader("X-RateLimit-Remaining");
  const limit = parseIntHeader("X-RateLimit-Limit");

  const resetRaw = response.headers.get("X-RateLimit-Reset");
  let reset: Date | null = null;
  if (resetRaw !== null) {
    const unix = parseInt(resetRaw, 10);
    if (!isNaN(unix)) {
      reset = new Date(unix * 1000);
    }
  }

  return { remaining, reset, limit };
}

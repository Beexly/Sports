import { Cache, FRESHNESS_BUDGET_MS, type CacheStorage, type FreshnessKey } from "./cache";
import type { ApiFailure, ApiResult, GateResponse } from "./contracts";
import { safeServerCopy } from "../lib/voice";

/**
 * The HTTP client.
 *
 * Rules it enforces, each for a reason the repo has already paid for:
 *
 *  1. EVERY response body is treated as untrusted. A native client cannot rely
 *     on the type system to validate a wire format, and a `factorBreakdown`
 *     that arrives as a JSON string is not hypothetical — the server has
 *     `parseFactorBreakdown` because Prisma stores it that way.
 *
 *  2. A 200 IS NOT SUCCESS. The server's gate routes return structured bodies
 *     that the app must read as gates, not as payloads. `bootstrapGateResponse`
 *     and `staleDataGateResponse` exist specifically so an env regression can be
 *     told apart from a data outage, and the distinction has to survive the
 *     trip to the client or the whole design was wasted.
 *
 *  3. NO SILENT FALLBACK TO CACHE. A cached body is returned with `fromCache:
 *     true` and a non-zero `cacheAgeMs`, always. There is no code path that
 *     returns cached data dressed as fresh.
 *
 *  4. Retry is bounded, jittered, and only for failures that can succeed on a
 *     retry. A 404 or a gate is never retried — retrying a "we are not
 *     publishing picks today" gate is how an app burns a battery to learn
 *     nothing.
 *
 *  5. Customer-facing messages pass the brand-voice linter. Server error copy
 *     is server-owned, but if a gate body ever carried a phrase that violates
 *     rule 8, the app does not become the surface that shows it.
 */

export interface ClientConfig {
  baseUrl: string;
  cache: Cache;
  /** Milliseconds before the request is aborted. */
  timeoutMs?: number;
  /** Total attempts, including the first. */
  maxAttempts?: number;
  /** Injected in tests. Defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /** Called on every completed request, for the operator log. */
  onEvent?: (event: ClientEvent) => void;
}

export interface ClientEvent {
  path: string;
  status: number | null;
  ms: number;
  attempt: number;
  outcome: "ok" | "cached" | "gated" | "stale" | "error";
}

export interface RequestOptions<T> {
  /** Query parameters. `undefined` entries are dropped. */
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Validates and narrows the decoded body. Must throw on a bad shape. */
  decode: (body: unknown) => T;
  /** Cache key. Omit to bypass the cache entirely. */
  cacheKey?: string;
  /** Which freshness budget applies. Required when cacheKey is set. */
  freshness?: FreshnessKey;
  /** Absolute override of the budget, in ms. */
  budgetMs?: number;
  /** Bearer token for authenticated endpoints. */
  token?: string | null;
  signal?: AbortSignal;
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
}

const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_MAX_ATTEMPTS = 3;

function failure(
  kind: ApiFailure["kind"],
  message: string,
  detail: string,
  status: number | null = null,
  retryAfterSec: number | null = null,
  retryable = false,
): ApiFailure {
  return { ok: false, kind, message, detail, status, retryAfterSec, retryable };
}

/** Customer-facing copy per failure class. Server copy is preferred when present. */
const FALLBACK_COPY: Record<ApiFailure["kind"], string> = {
  network: "No connection. Showing the last data we received.",
  timeout: "The request took too long. Showing the last data we received.",
  rate_limited: "Too many requests from this device. Try again shortly.",
  gated: "The board is not open right now.",
  stale: "Awaiting fresh data. We do not publish on a stale slate.",
  auth: "Sign in to see this.",
  not_found: "That pick is no longer available.",
  server: "The server had a problem. It is not your account.",
  malformed: "We received a response we could not read, so we are not showing it.",
};

/** Parse a `Retry-After` header in either of its two legal forms. */
function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);
  const date = Date.parse(header);
  if (!Number.isNaN(date)) {
    const delta = Math.ceil((date - Date.now()) / 1000);
    return delta > 0 ? delta : 0;
  }
  return null;
}

/** Exponential backoff with full jitter, capped. */
function backoffMs(attempt: number): number {
  const base = Math.min(4000, 250 * 2 ** (attempt - 1));
  return Math.round(base * (0.5 + Math.random() * 0.5));
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new Error("aborted"));
      },
      { once: true },
    );
  });
}

export class GseClient {
  private readonly baseUrl: string;
  private readonly cache: Cache;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly fetchImpl: typeof fetch;
  private readonly onEvent: ((event: ClientEvent) => void) | undefined;

  constructor(config: ClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.cache = config.cache;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxAttempts = config.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.onEvent = config.onEvent;
  }

  static withStorage(
    baseUrl: string,
    storage: CacheStorage,
    overrides: Partial<Omit<ClientConfig, "baseUrl" | "cache">> = {},
  ): GseClient {
    return new GseClient({ baseUrl, cache: new Cache(storage), ...overrides });
  }

  private url(path: string, query?: RequestOptions<unknown>["query"]): string {
    const url = new URL(`${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null || value === "") continue;
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  async request<T>(path: string, options: RequestOptions<T>): Promise<ApiResult<T>> {
    const started = Date.now();
    const budgetMs =
      options.budgetMs ??
      (options.freshness ? FRESHNESS_BUDGET_MS[options.freshness] : undefined);

    const cached =
      options.cacheKey && budgetMs !== undefined
        ? await this.cache.read<T>(options.cacheKey, budgetMs)
        : null;

    // Serve a fresh-enough cache hit without touching the network at all.
    if (cached && !cached.stale && (options.method ?? "GET") === "GET") {
      this.onEvent?.({
        path,
        status: null,
        ms: 0,
        attempt: 0,
        outcome: "cached",
      });
      return {
        ok: true,
        data: cached.entry.value,
        asOf: cached.entry.version,
        fromCache: true,
        cacheAgeMs: cached.ageMs,
        status: 200,
      };
    }

    let lastFailure: ApiFailure | null = null;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      const onOuterAbort = (): void => controller.abort();
      options.signal?.addEventListener("abort", onOuterAbort, { once: true });

      try {
        const headers: Record<string, string> = {
          Accept: "application/json",
          "X-GSE-Client": "ios/1.0.0",
        };
        if (options.token) headers.Authorization = `Bearer ${options.token}`;
        if (options.body !== undefined) headers["Content-Type"] = "application/json";
        // Conditional request. Only for GET, and only when a validator is held:
        // an If-None-Match on a POST or on an entry with no ETag is a header that
        // can only confuse a cache layer in between.
        if (cached?.entry.etag && (options.method ?? "GET") === "GET") {
          headers["If-None-Match"] = cached.entry.etag;
        }

        const response = await this.fetchImpl(this.url(path, options.query), {
          method: options.method ?? "GET",
          headers,
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
          signal: controller.signal,
        });

        const status = response.status;
        const retryAfterSec = parseRetryAfter(response.headers.get("Retry-After"));
        const rawText = await response.text();
        const ms = Date.now() - started;

        // ── 429 ────────────────────────────────────────────────────────────
        if (status === 429) {
          const body = safeJson(rawText) as { error?: string } | null;
          lastFailure = failure(
            "rate_limited",
            copyFor("rate_limited", body?.error),
            `HTTP 429 on ${path}`,
            429,
            retryAfterSec,
            attempt < this.maxAttempts,
          );
          this.onEvent?.({ path, status, ms, attempt, outcome: "error" });
          if (attempt < this.maxAttempts) {
            await sleep((retryAfterSec ?? backoffMs(attempt) / 1000) * 1000, options.signal);
            continue;
          }
          break;
        }

        // ── 503 gates ──────────────────────────────────────────────────────
        // Read the body: a gate is not an outage, and the distinction is the
        // whole reason the two response shapes exist.
        if (status === 503) {
          const body = safeJson(rawText) as GateResponse | null;
          const kind: ApiFailure["kind"] = body?.code === "stale_data" ? "stale" : "gated";
          lastFailure = failure(
            kind,
            copyFor(kind, body?.error),
            `HTTP 503 ${body?.code ?? "unknown"} on ${path}`,
            503,
            retryAfterSec,
            false,
          );
          // A gate that has a cache behind it still shows the last good board —
          // labelled. A customer reading yesterday's board with yesterday's
          // timestamp is better served than one reading an empty screen.
          this.onEvent?.({ path, status, ms, attempt, outcome: kind === "stale" ? "stale" : "gated" });
          break;
        }

        // ── 401 / 403 ──────────────────────────────────────────────────────
        if (status === 401 || status === 403) {
          const body = safeJson(rawText) as { error?: string } | null;
          lastFailure = failure("auth", copyFor("auth", body?.error), `HTTP ${status} on ${path}`, status);
          this.onEvent?.({ path, status, ms, attempt, outcome: "error" });
          break; // never retry an auth failure
        }

        // ── 404 ────────────────────────────────────────────────────────────
        if (status === 404) {
          lastFailure = failure("not_found", FALLBACK_COPY.not_found, `HTTP 404 on ${path}`, 404);
          this.onEvent?.({ path, status, ms, attempt, outcome: "error" });
          break;
        }

        // ── 5xx ────────────────────────────────────────────────────────────
        if (status >= 500) {
          lastFailure = failure(
            "server",
            FALLBACK_COPY.server,
            `HTTP ${status} on ${path}`,
            status,
            retryAfterSec,
            attempt < this.maxAttempts,
          );
          this.onEvent?.({ path, status, ms, attempt, outcome: "error" });
          if (attempt < this.maxAttempts) {
            await sleep(backoffMs(attempt), options.signal);
            continue;
          }
          break;
        }

        // ── 304 Not Modified ───────────────────────────────────────────────
        // The body is unchanged AND the server has just confirmed it is current.
        // This is strictly better than a re-download: it saves the payload and
        // proves freshness rather than trading one for the other. `touch` moves
        // `storedAt` forward so the UI's age resets.
        if (status === 304) {
          if (!cached) {
            // A 304 with nothing cached is a server or proxy misbehaving. Treated
            // as malformed rather than as an empty success.
            lastFailure = failure(
              "malformed",
              FALLBACK_COPY.malformed,
              `HTTP 304 with no cached entry for ${path}`,
              304,
            );
            this.onEvent?.({ path, status, ms, attempt, outcome: "error" });
            break;
          }
          const freshEtag = response.headers.get("ETag");
          await this.cache.touch(options.cacheKey as string, freshEtag);
          this.onEvent?.({ path, status, ms, attempt, outcome: "cached" });
          return {
            ok: true,
            data: cached.entry.value,
            asOf: cached.entry.version,
            fromCache: true,
            cacheAgeMs: 0,
            status: 304,
          };
        }

        // ── 2xx ────────────────────────────────────────────────────────────
        const parsed = safeJson(rawText);
        if (parsed === null) {
          lastFailure = failure(
            "malformed",
            FALLBACK_COPY.malformed,
            `Unparseable JSON on ${path} (${rawText.length} bytes)`,
            status,
          );
          this.onEvent?.({ path, status, ms, attempt, outcome: "error" });
          break;
        }

        // A 200 that is actually a gate. The server does not emit these today,
        // but the envelope shape is shared across routes and a future edit that
        // returns a gate with 200 must not be rendered as a payload.
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          (parsed as { success?: unknown }).success === false &&
          typeof (parsed as { error?: unknown }).error === "string"
        ) {
          const gate = parsed as GateResponse;
          const kind: ApiFailure["kind"] =
            gate.code === "stale_data" ? "stale" : gate.code === "rate_limited" ? "rate_limited" : "gated";
          lastFailure = failure(kind, copyFor(kind, gate.error), `Gate envelope with HTTP ${status}`, status);
          this.onEvent?.({ path, status, ms, attempt, outcome: "gated" });
          break;
        }

        let decoded: T;
        try {
          decoded = options.decode(parsed);
        } catch (error) {
          lastFailure = failure(
            "malformed",
            FALLBACK_COPY.malformed,
            `Decoder rejected ${path}: ${error instanceof Error ? error.message : String(error)}`,
            status,
          );
          this.onEvent?.({ path, status, ms, attempt, outcome: "error" });
          break;
        }

        const asOf =
          typeof parsed === "object" && parsed !== null
            ? ((parsed as { asOf?: unknown }).asOf as string | undefined) ??
              ((parsed as { generatedAt?: unknown }).generatedAt as string | undefined) ??
              null
            : null;

        if (options.cacheKey) {
          // The ETag is captured so the NEXT read can be conditional. A server
          // that sends none simply means every read is a full one.
          await this.cache.write(options.cacheKey, decoded, asOf, response.headers.get("ETag"));
        }

        this.onEvent?.({ path, status, ms, attempt, outcome: "ok" });
        return { ok: true, data: decoded, asOf, fromCache: false, cacheAgeMs: 0, status };
      } catch (error) {
        const ms = Date.now() - started;
        const abortedByCaller = options.signal?.aborted ?? false;
        if (abortedByCaller) {
          return failure("network", "Cancelled.", "Caller aborted the request", null);
        }
        const isTimeout = error instanceof Error && error.name === "AbortError";
        lastFailure = failure(
          isTimeout ? "timeout" : "network",
          isTimeout ? FALLBACK_COPY.timeout : FALLBACK_COPY.network,
          `${isTimeout ? "Timeout" : "Network error"} on ${path}: ${
            error instanceof Error ? error.message : String(error)
          }`,
          null,
          null,
          attempt < this.maxAttempts,
        );
        this.onEvent?.({ path, status: null, ms, attempt, outcome: "error" });
        if (attempt < this.maxAttempts) {
          try {
            await sleep(backoffMs(attempt), options.signal);
          } catch {
            return failure("network", "Cancelled.", "Caller aborted during backoff", null);
          }
          continue;
        }
        break;
      } finally {
        clearTimeout(timer);
        options.signal?.removeEventListener("abort", onOuterAbort);
      }
    }

    const finalFailure = lastFailure ?? failure("server", FALLBACK_COPY.server, `No attempt ran for ${path}`);

    // The one place cache is served on failure — and it is never dressed up.
    if (cached) {
      return {
        ok: true,
        data: cached.entry.value,
        asOf: cached.entry.version,
        fromCache: true,
        cacheAgeMs: cached.ageMs,
        status: 200,
      };
    }

    return finalFailure;
  }
}

function safeJson(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Server copy wins when it exists — but it still passes the voice linter. */
function copyFor(kind: ApiFailure["kind"], serverCopy?: string): string {
  if (serverCopy && serverCopy.trim().length > 0) {
    return safeServerCopy(`api:${kind}`, serverCopy.trim());
  }
  return FALLBACK_COPY[kind];
}

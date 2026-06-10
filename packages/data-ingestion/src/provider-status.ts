/**
 * Provider job-truth status contract + error classifier.
 *
 * Phase 2 fail-closed trust fix. A single source of truth for the status
 * vocabulary the ingestion pipeline reports up to monitoring, and a pure
 * function that maps an HTTP status / fetch failure onto that vocabulary.
 *
 * The classifier is deliberately pure and side-effect free: no I/O, no env
 * reads, no secrets. It only inspects an HTTP status code and (optionally) the
 * response headers / a caught error, and returns a status string. This makes it
 * trivially unit-testable and impossible to leak credentials through.
 *
 * IMPORTANT (founder/internal-only): the classified reason is precise on
 * purpose so operators can see *why* a pull failed (auth vs quota vs upstream).
 * Public-facing copy must never surface the raw reason — it stays calm.
 */

/**
 * The canonical job-truth status vocabulary.
 *
 * `LIVE` / `DEGRADED` / `STALE` describe the freshness/health surface;
 * `PROVIDER_*` / `DB_UNAVAILABLE` / `NO_CURRENT_SNAPSHOT` / `DISABLED_BY_CONFIG`
 * describe concrete failure causes; `UNKNOWN` is the safe fallback.
 *
 * Kept as a const object (not a TS `enum`) so it is RSC-safe and erases
 * cleanly — no runtime enum object is emitted into any client bundle.
 */
export const PROVIDER_JOB_STATUS = {
  LIVE: "LIVE",
  DEGRADED: "DEGRADED",
  STALE: "STALE",
  PROVIDER_AUTH_FAILED: "PROVIDER_AUTH_FAILED",
  PROVIDER_QUOTA_EXHAUSTED: "PROVIDER_QUOTA_EXHAUSTED",
  PROVIDER_RATE_LIMITED: "PROVIDER_RATE_LIMITED",
  PROVIDER_UNAVAILABLE: "PROVIDER_UNAVAILABLE",
  DB_UNAVAILABLE: "DB_UNAVAILABLE",
  NO_CURRENT_SNAPSHOT: "NO_CURRENT_SNAPSHOT",
  DISABLED_BY_CONFIG: "DISABLED_BY_CONFIG",
  UNKNOWN: "UNKNOWN",
} as const;

export type ProviderJobStatus =
  (typeof PROVIDER_JOB_STATUS)[keyof typeof PROVIDER_JOB_STATUS];

/**
 * The subset of statuses that represent a *provider* (upstream data source)
 * failure — i.e. the pull did not produce trustworthy fresh data. Used by the
 * job-truth contract to decide whether an IngestionRun may be recorded SUCCESS.
 */
export const PROVIDER_FAILURE_STATUSES: readonly ProviderJobStatus[] = [
  PROVIDER_JOB_STATUS.PROVIDER_AUTH_FAILED,
  PROVIDER_JOB_STATUS.PROVIDER_QUOTA_EXHAUSTED,
  PROVIDER_JOB_STATUS.PROVIDER_RATE_LIMITED,
  PROVIDER_JOB_STATUS.PROVIDER_UNAVAILABLE,
];

/**
 * True when a status means "do NOT trust this pull as fresh data".
 * Any status other than LIVE is treated as untrusted by callers that must
 * fail closed — but this helper specifically flags the provider-failure cases.
 */
export function isProviderFailureStatus(
  status: ProviderJobStatus
): boolean {
  return PROVIDER_FAILURE_STATUSES.includes(status);
}

/**
 * Minimal header accessor so the classifier can work against either a real
 * `Headers` object or a plain record (as seen in tests / serialized errors).
 */
export type HeaderLike =
  | Headers
  | { get(name: string): string | null }
  | Record<string, string | string[] | undefined>
  | null
  | undefined;

function readHeader(headers: HeaderLike, name: string): string | null {
  if (!headers) return null;
  const lower = name.toLowerCase();
  // `Headers` and anything with a `.get()` method.
  if (typeof (headers as { get?: unknown }).get === "function") {
    const value = (headers as { get(n: string): string | null }).get(name);
    return value ?? null;
  }
  // Plain record — do a case-insensitive lookup.
  const record = headers as Record<string, string | string[] | undefined>;
  for (const key of Object.keys(record)) {
    if (key.toLowerCase() === lower) {
      const value = record[key];
      if (Array.isArray(value)) return value[0] ?? null;
      return value ?? null;
    }
  }
  return null;
}

/**
 * Distinguish a transient rate-limit (retry soon) from a hard quota exhaustion
 * (plan budget spent) on a 429. We treat the presence of a rate-limit signal
 * (`retry-after`, or any `x-ratelimit-*` header, or `x-requests-remaining` > 0)
 * as evidence of throttling; otherwise a 429 means the request budget is spent.
 *
 * Conservative default: when there is no signal at all, classify as
 * QUOTA_EXHAUSTED. Quota exhaustion is the more serious, founder-actionable
 * state (it needs a plan/key change, not a retry), so defaulting there avoids
 * masking a spent budget as a benign throttle.
 */
function classify429(headers: HeaderLike): ProviderJobStatus {
  const retryAfter = readHeader(headers, "retry-after");
  const rateLimitRemaining =
    readHeader(headers, "x-ratelimit-remaining") ??
    readHeader(headers, "ratelimit-remaining");
  const rateLimitReset =
    readHeader(headers, "x-ratelimit-reset") ??
    readHeader(headers, "ratelimit-reset");
  const requestsRemaining = readHeader(headers, "x-requests-remaining");

  // An explicit retry hint or a live rate-limit window → transient throttle.
  if (retryAfter !== null) return PROVIDER_JOB_STATUS.PROVIDER_RATE_LIMITED;
  if (rateLimitRemaining !== null || rateLimitReset !== null) {
    return PROVIDER_JOB_STATUS.PROVIDER_RATE_LIMITED;
  }
  // The Odds API exposes remaining request budget on this header. A positive
  // value while still 429'd means we are being throttled, not out of budget.
  if (requestsRemaining !== null) {
    const remaining = Number.parseInt(requestsRemaining, 10);
    if (Number.isFinite(remaining) && remaining > 0) {
      return PROVIDER_JOB_STATUS.PROVIDER_RATE_LIMITED;
    }
    return PROVIDER_JOB_STATUS.PROVIDER_QUOTA_EXHAUSTED;
  }

  // No signal → assume the plan budget is exhausted (founder-actionable).
  return PROVIDER_JOB_STATUS.PROVIDER_QUOTA_EXHAUSTED;
}

export interface ClassifyProviderErrorInput {
  /** HTTP status code, when the request reached the server. */
  status?: number | null;
  /** Response headers, used to distinguish quota vs rate-limit on 429. */
  headers?: HeaderLike;
  /**
   * The caught error, when the request never produced an HTTP status
   * (DNS failure, connection reset, abort/timeout, etc.). Inspected by name
   * only — never logged, never carries secrets.
   */
  error?: unknown;
}

/** Names/codes that indicate a transport-level failure (no HTTP response). */
function isNetworkOrTimeoutError(error: unknown): boolean {
  if (!error) return false;
  const name =
    typeof error === "object" && error !== null && "name" in error
      ? String((error as { name?: unknown }).name)
      : "";
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";
  const message =
    error instanceof Error ? error.message : String(error ?? "");

  // AbortController-driven timeouts surface as AbortError / TimeoutError.
  if (name === "AbortError" || name === "TimeoutError") return true;
  // Undici / Node fetch network failures.
  if (name === "FetchError" || name === "TypeError") {
    if (/fetch failed|network|ENOTFOUND|ECONNRESET|ECONNREFUSED|ETIMEDOUT|socket hang up/i.test(message)) {
      return true;
    }
  }
  if (/^(ENOTFOUND|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|UND_ERR)/i.test(code)) {
    return true;
  }
  if (/timed out|timeout|socket hang up|network error/i.test(message)) {
    return true;
  }
  return false;
}

/**
 * Pure classifier: map an HTTP status / fetch error onto the job-truth
 * vocabulary.
 *
 *   401            → PROVIDER_AUTH_FAILED
 *   403            → PROVIDER_AUTH_FAILED  (forbidden is still an auth failure)
 *   429            → PROVIDER_RATE_LIMITED | PROVIDER_QUOTA_EXHAUSTED
 *                    (distinguished via rate-limit headers; defaults to QUOTA)
 *   5xx            → PROVIDER_UNAVAILABLE
 *   network/timeout→ PROVIDER_UNAVAILABLE
 *   anything else  → UNKNOWN
 */
export function classifyProviderError(
  input: ClassifyProviderErrorInput | number
): ProviderJobStatus {
  const normalized: ClassifyProviderErrorInput =
    typeof input === "number" ? { status: input } : input;
  const { status, headers, error } = normalized;

  // Transport-level failure (no HTTP response): unavailable.
  if (status == null) {
    if (isNetworkOrTimeoutError(error)) {
      return PROVIDER_JOB_STATUS.PROVIDER_UNAVAILABLE;
    }
    return PROVIDER_JOB_STATUS.UNKNOWN;
  }

  if (status === 401 || status === 403) {
    return PROVIDER_JOB_STATUS.PROVIDER_AUTH_FAILED;
  }
  if (status === 429) {
    return classify429(headers);
  }
  if (status >= 500 && status <= 599) {
    return PROVIDER_JOB_STATUS.PROVIDER_UNAVAILABLE;
  }
  // 4xx that isn't auth/quota, or a 2xx/3xx that still reached this path:
  // we don't have a specific bucket, so be honest about that.
  return PROVIDER_JOB_STATUS.UNKNOWN;
}

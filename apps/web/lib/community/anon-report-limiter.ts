/**
 * Anti-abuse seam for ANONYMOUS moderation reports.
 *
 * Anonymous reports carry no authenticated identity, so they are the obvious
 * spam/abuse vector. This module is a small, deterministic, in-memory
 * fixed-window rate limiter keyed by an opaque client fingerprint (e.g. a
 * hashed IP or a device token supplied by the route layer). It is intentionally
 * simple and fully testable; a production deployment can swap the backing store
 * for Redis behind the same `checkAnonymousReportQuota` / `resetAnonymousReportLimiter`
 * surface without touching call sites.
 *
 * Fail-closed on a missing fingerprint: an anonymous report with no
 * fingerprint cannot be rate-limited, so we reject it rather than allow an
 * unbounded, unattributable flood.
 */

export class AnonymousReportRateLimitError extends Error {
  readonly code = "ANON_REPORT_RATE_LIMITED" as const;
  constructor(message = "Too many anonymous reports from this source. Try again later.") {
    super(message);
    this.name = "AnonymousReportRateLimitError";
  }
}

export interface AnonReportLimiterConfig {
  /** Max anonymous reports allowed per fingerprint within the window. */
  readonly maxPerWindow: number;
  /** Window length in milliseconds. */
  readonly windowMs: number;
}

export const DEFAULT_ANON_REPORT_LIMITS: AnonReportLimiterConfig = {
  maxPerWindow: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
};

interface WindowState {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, WindowState>();

/**
 * Records one anonymous report attempt for `fingerprint` and throws
 * AnonymousReportRateLimitError when the quota is exceeded. Throws immediately
 * for an empty/absent fingerprint (fail closed — see module doc).
 *
 * @param now  Injectable clock for deterministic tests (defaults to Date.now()).
 */
export function checkAnonymousReportQuota(
  fingerprint: string | null | undefined,
  config: AnonReportLimiterConfig = DEFAULT_ANON_REPORT_LIMITS,
  now: number = Date.now()
): void {
  const key = (fingerprint ?? "").trim();
  if (!key) {
    throw new AnonymousReportRateLimitError(
      "Anonymous reports require a client fingerprint for rate-limiting."
    );
  }

  const state = buckets.get(key);
  if (!state || now - state.windowStart >= config.windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return;
  }

  if (state.count >= config.maxPerWindow) {
    throw new AnonymousReportRateLimitError();
  }

  state.count += 1;
}

/** Test/ops helper: clears all rate-limit state. */
export function resetAnonymousReportLimiter(): void {
  buckets.clear();
}

/**
 * Durable, cross-instance rate limiting (directive 4.1).
 *
 * WHY DURABLE
 * -----------
 * The previous anonymous-report limiter was a per-process in-memory Map: a
 * serverless cold start or a second instance silently reset every quota, so
 * the limit was advisory, not enforced. This module defines the limiter as an
 * interface (`DurableRateLimiter`) with an ATOMIC Postgres-backed
 * implementation shared by every instance: one conditional
 * `INSERT ... ON CONFLICT DO UPDATE ... WHERE count < limit` statement per
 * check, so two concurrent requests on two instances can never both pass a
 * boundary slot.
 *
 * FIXED WINDOWS
 * -------------
 * Counters are fixed-window: (scope, key, window_start) → count. The window
 * start is floor(now / windowMs) * windowMs computed by the caller-facing
 * `consume`, so all instances agree on the bucket without coordination.
 *
 * FAIL-CLOSED CONTRACT
 * --------------------
 * - Store errors throw RateLimitStoreUnavailableError — callers must translate
 *   that to 503, NEVER "allow".
 * - In production a missing durable store is a 503 at the route layer; the
 *   in-memory implementation refuses to construct in production at all.
 *
 * PRIVACY + RETENTION (documented contract)
 * -----------------------------------------
 * Keys must already be opaque (HMAC-derived fingerprints or internal ids) —
 * NEVER a raw IP or email. Rows are only meaningful for their window; the
 * retention bound is RATE_COUNTER_MAX_RETENTION_MS (48h) and
 * `pruneExpiredRateLimitCounters` deletes older rows (indexed on
 * window_start). Wiring the prune into a cron is an ops step; until then the
 * bound is documented and the table's growth is limited to distinct keys per
 * window within retention.
 */

export class RateLimitStoreUnavailableError extends Error {
  readonly code = "RATE_LIMIT_STORE_UNAVAILABLE" as const;
  constructor(cause?: unknown) {
    super(
      "Durable rate-limit store is unavailable. " +
        (cause instanceof Error ? cause.message : String(cause ?? "No database connection."))
    );
    this.name = "RateLimitStoreUnavailableError";
    if (cause instanceof Error && cause.stack) {
      this.stack = this.stack + "\nCaused by: " + cause.stack;
    }
  }
}

export interface RateLimitConsumeRequest {
  /** Logical dimension, e.g. "anon-report:source". */
  readonly scope: string;
  /** Opaque key within the scope (HMAC fingerprint / internal id). */
  readonly key: string;
  /** Max permits per window. <= 0 always denies (no zero-limit authorization). */
  readonly limit: number;
  readonly windowMs: number;
  /** Injectable clock for deterministic tests. */
  readonly now?: Date;
}

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly scope: string;
  readonly limit: number;
  readonly windowMs: number;
  readonly windowStart: Date;
  /** Counter value after this consume when allowed; null when denied. */
  readonly count: number | null;
  /** Milliseconds until the window resets; 0 when allowed. */
  readonly retryAfterMs: number;
}

export interface DurableRateLimiter {
  /**
   * True when the backing store survives process death and is shared across
   * instances. Production routes MUST refuse a non-durable limiter.
   */
  readonly durable: boolean;
  /** Atomically consume one permit; never throws for "over limit" (returns a denial). */
  consume(request: RateLimitConsumeRequest): Promise<RateLimitDecision>;
}

function windowStartFor(now: Date, windowMs: number): Date {
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
}

function denial(req: RateLimitConsumeRequest, windowStart: Date, now: Date): RateLimitDecision {
  return {
    allowed: false,
    scope: req.scope,
    limit: req.limit,
    windowMs: req.windowMs,
    windowStart,
    count: null,
    retryAfterMs: Math.max(0, windowStart.getTime() + req.windowMs - now.getTime()),
  };
}

// ─── Postgres implementation ──────────────────────────────────────────────────

/**
 * Minimal structural slice of PrismaClient used by the limiter. Kept narrow so
 * tests can supply a fake store with identical single-statement semantics.
 */
export interface RateLimitSqlClient {
  $queryRawUnsafe(query: string, ...values: Array<string | number | Date>): Promise<unknown>;
}

const CONSUME_SQL = `INSERT INTO "rate_limit_counters" ("scope", "key", "window_start", "count", "updated_at")
VALUES ($1, $2, $3, 1, NOW())
ON CONFLICT ("scope", "key", "window_start")
DO UPDATE SET "count" = "rate_limit_counters"."count" + 1, "updated_at" = NOW()
WHERE "rate_limit_counters"."count" < $4
RETURNING "count"`;

const PRUNE_SQL = `DELETE FROM "rate_limit_counters" WHERE "window_start" < $1`;

/** Documented retention bound for rate-limit counters (48 hours). */
export const RATE_COUNTER_MAX_RETENTION_MS = 48 * 60 * 60 * 1000;

/**
 * Atomic Postgres-backed limiter. The entire check-and-count is ONE
 * conditional upsert:
 *   - first permit in a window inserts count=1;
 *   - subsequent permits increment ONLY while count < limit (the WHERE guards
 *     the DO UPDATE branch), so the stored count never exceeds the limit and
 *     a denied request does not extend the counter;
 *   - no row returned ⇒ denied.
 * Because the statement is atomic in Postgres, any number of app instances
 * sharing the table enforce the limit exactly.
 */
export class PostgresDurableRateLimiter implements DurableRateLimiter {
  readonly durable = true;

  constructor(private readonly client: RateLimitSqlClient) {}

  async consume(request: RateLimitConsumeRequest): Promise<RateLimitDecision> {
    const now = request.now ?? new Date();
    const windowStart = windowStartFor(now, request.windowMs);
    if (request.limit <= 0) {
      // A zero/negative limit is "no authorization", never "unlimited".
      return denial(request, windowStart, now);
    }

    let rows: unknown;
    try {
      rows = await this.client.$queryRawUnsafe(
        CONSUME_SQL,
        request.scope,
        request.key,
        windowStart,
        request.limit
      );
    } catch (err) {
      throw new RateLimitStoreUnavailableError(err);
    }

    if (!Array.isArray(rows)) {
      // A stub client (silent no-op writes) returns undefined/non-rows — that
      // is NOT a durable store; fail closed rather than allow unlimited.
      throw new RateLimitStoreUnavailableError(
        "Rate-limit store returned a non-row result (stub or misconfigured client)."
      );
    }

    if (rows.length === 0) {
      return denial(request, windowStart, now);
    }

    const first = rows[0] as { count?: number | bigint };
    const count = typeof first.count === "bigint" ? Number(first.count) : (first.count ?? null);
    return {
      allowed: true,
      scope: request.scope,
      limit: request.limit,
      windowMs: request.windowMs,
      windowStart,
      count,
      retryAfterMs: 0,
    };
  }
}

/**
 * Deletes counters whose window started before `now - retentionMs`
 * (bounded-retention contract). Safe to run from any instance.
 */
export async function pruneExpiredRateLimitCounters(
  client: RateLimitSqlClient,
  retentionMs: number = RATE_COUNTER_MAX_RETENTION_MS,
  now: Date = new Date()
): Promise<void> {
  const cutoff = new Date(now.getTime() - retentionMs);
  try {
    await client.$queryRawUnsafe(PRUNE_SQL, cutoff);
  } catch (err) {
    throw new RateLimitStoreUnavailableError(err);
  }
}

// ─── In-memory implementation (NON-PRODUCTION ONLY) ───────────────────────────

/**
 * Dev/test convenience limiter. NOT durable and NOT cross-instance — and
 * therefore forbidden in production: the constructor throws when
 * NODE_ENV === "production", and `durable` is false so the route layer's
 * production check rejects it even if one leaks through.
 */
export class InMemoryDurableRateLimiter implements DurableRateLimiter {
  readonly durable = false;
  private readonly buckets = new Map<string, { windowStartMs: number; count: number }>();

  constructor(env: { NODE_ENV?: string | undefined } = process.env) {
    if (env.NODE_ENV === "production") {
      throw new RateLimitStoreUnavailableError(
        "InMemoryDurableRateLimiter is forbidden in production (fail closed; use the Postgres limiter)."
      );
    }
  }

  async consume(request: RateLimitConsumeRequest): Promise<RateLimitDecision> {
    const now = request.now ?? new Date();
    const windowStart = windowStartFor(now, request.windowMs);
    if (request.limit <= 0) return denial(request, windowStart, now);

    const bucketKey = `${request.scope} ${request.key}`;
    const existing = this.buckets.get(bucketKey);
    if (!existing || existing.windowStartMs !== windowStart.getTime()) {
      this.buckets.set(bucketKey, { windowStartMs: windowStart.getTime(), count: 1 });
      return {
        allowed: true,
        scope: request.scope,
        limit: request.limit,
        windowMs: request.windowMs,
        windowStart,
        count: 1,
        retryAfterMs: 0,
      };
    }
    if (existing.count >= request.limit) {
      return denial(request, windowStart, now);
    }
    existing.count += 1;
    return {
      allowed: true,
      scope: request.scope,
      limit: request.limit,
      windowMs: request.windowMs,
      windowStart,
      count: existing.count,
      retryAfterMs: 0,
    };
  }
}

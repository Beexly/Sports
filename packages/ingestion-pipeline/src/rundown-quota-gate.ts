/**
 * TheRundown day-quota gate — durable, cross-invocation.
 *
 * WHY THIS EXISTS
 * ----------------
 * `fetchRundownEventsForSport` (@sports/data-ingestion) already aborts the
 * remaining day-fan-out WITHIN one invocation on an HTTP 429 (see its own
 * `rateLimited` flag), but that state is process-local: the very next Vercel
 * Cron invocation (refresh-odds every 15 min, board-fill 4x/h) knows nothing
 * of it and calls TheRundown again, gets 429 again, for the rest of the day.
 * That is the confirmed, documented root cause of TheRundown returning
 * "rundown empty (2d): HTTP 429 rate_limited" on every in-season-sport cycle
 * since 2026-09-03 — TheRundown is the only source that satisfies
 * MIN_BOOKMAKERS, so this alone zeroes out book-priced picks.
 *
 * `packages/data-ingestion` deliberately depends on nothing but
 * `@sports/types` and `zod` (see .claude/rules/scraping.md) — it has no path
 * to a durable store, so this gate cannot live there. `@sports/ingestion-
 * pipeline` already depends on `@sports/db`, so it lives here and wraps the
 * call sites in `process-sport.ts` instead.
 *
 * DESIGN: REACT TO THE REAL SIGNAL, DON'T ESTIMATE A BUDGET
 * -----------------------------------------------------------
 * TheRundown's actual per-day quota is denominated in "data points," not
 * requests, and it returns no remaining-quota header — there is no honest
 * way to convert "N requests so far today" into "quota remaining" without
 * inventing a conversion rate. Instead of guessing, this gate uses the same
 * philosophy as the existing OddsPaymentCircuitBreaker
 * (@sports/data-ingestion's odds-api-circuit-breaker.ts): TheRundown's own
 * 429 IS the authoritative signal. The first time a call actually observes
 * one, this gate remembers it for the rest of the UTC day (durably, via the
 * existing `rate_limit_counters` table — no new dependency, no schema
 * change) and every subsequent call this UTC day is refused BEFORE making a
 * network request, instead of re-attempting and re-429ing.
 *
 * Reuses the `rate_limit_counters` table (packages/db/prisma/schema.prisma
 * `RateLimitCounter`, already shipped for apps/web/lib/community/durable-
 * rate-limiter.ts) under its own scope/key so it needs no migration.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Scope/key pair reserved in `rate_limit_counters` for this gate. */
export const RUNDOWN_QUOTA_SCOPE = "rundown-quota";
export const RUNDOWN_QUOTA_KEY = "429-seen-utc-day";

/**
 * Minimal structural slice of PrismaClient used by this gate. Mirrors
 * apps/web/lib/community/durable-rate-limiter.ts's RateLimitSqlClient so a
 * fake client with identical single-statement semantics is enough to test
 * this module with no real database.
 */
export interface RundownQuotaSqlClient {
  $queryRawUnsafe(query: string, ...values: Array<string | Date>): Promise<unknown>;
}

function utcDayStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export interface RundownQuotaGateResult {
  readonly allowed: boolean;
  /** Present exactly when `allowed` is false. */
  readonly reason?: string;
  /** How many 429s this gate has recorded for today's UTC window, if any were read. */
  readonly seenCount?: number;
}

const CHECK_SQL = `SELECT "count" FROM "rate_limit_counters"
WHERE "scope" = $1 AND "key" = $2 AND "window_start" = $3`;

/**
 * Call before attempting a TheRundown fetch. Read-only — never mutates the
 * counter. Fails OPEN (allowed:true) on a store error: a durability gap in
 * an optional, informational safety net must never become a new reason
 * TheRundown's free dual-path stops being tried at all — that would trade a
 * quota-exhaustion problem for a "we never even attempt the free source"
 * problem, which is worse.
 */
export async function checkRundownQuotaGate(
  client: RundownQuotaSqlClient,
  now: Date = new Date(),
): Promise<RundownQuotaGateResult> {
  const windowStart = utcDayStart(now);
  let rows: unknown;
  try {
    rows = await client.$queryRawUnsafe(CHECK_SQL, RUNDOWN_QUOTA_SCOPE, RUNDOWN_QUOTA_KEY, windowStart);
  } catch {
    // Store unavailable — fail open (see doc comment above).
    return { allowed: true };
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return { allowed: true, seenCount: 0 };
  }
  const first = rows[0] as { count?: number | bigint };
  const seenCount = typeof first.count === "bigint" ? Number(first.count) : (first.count ?? 0);
  if (seenCount <= 0) {
    return { allowed: true, seenCount };
  }
  return {
    allowed: false,
    seenCount,
    reason:
      `rundown day-quota gate: TheRundown returned HTTP 429 ${seenCount}x already today ` +
      "(UTC) — skipping further calls until the window resets at UTC midnight " +
      "(no invented quotes; the free/paid/ESPN fallback chain still runs).",
  };
}

const RECORD_SQL = `INSERT INTO "rate_limit_counters" ("scope", "key", "window_start", "count", "updated_at")
VALUES ($1, $2, $3, 1, NOW())
ON CONFLICT ("scope", "key", "window_start")
DO UPDATE SET "count" = "rate_limit_counters"."count" + 1, "updated_at" = NOW()`;

/**
 * Call after a TheRundown fetch that observed `rateLimited: true`. Idempotent
 * and additive (increments a same-day counter rather than just setting a
 * boolean) so the recorded count is also a useful "how many times did we hit
 * this today" signal for the ops dashboard, not just a flag. Throws on a
 * store error — unlike the check above, a failure to RECORD a real 429 is
 * worth surfacing to the caller's own warn-log rather than silently
 * swallowing, since it means the next invocation won't know to skip.
 */
export async function recordRundownRateLimited(
  client: RundownQuotaSqlClient,
  now: Date = new Date(),
): Promise<void> {
  const windowStart = utcDayStart(now);
  await client.$queryRawUnsafe(RECORD_SQL, RUNDOWN_QUOTA_SCOPE, RUNDOWN_QUOTA_KEY, windowStart);
}

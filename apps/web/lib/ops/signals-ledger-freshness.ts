/**
 * Freshness for the `signals` ledger — the table the hourly write cron feeds.
 *
 * WHY THIS EXISTS
 * ---------------
 * The line archive died for three weeks in August 2026 and the reason it went
 * unnoticed is now a documented lesson: a cron swallows its error, the only
 * signal was a row count, and NOTHING monitored the table's freshness. This
 * module is that monitor for the OTHER cron with the same shape.
 *
 * `signal-ledger-write` runs at :23 hourly and carries a wall-clock deadline
 * that stops the run at ~80,000 rows. On the measured 2026-09-28 tick that left
 * 33,583 of 118,083 candidates unwritten and reported it as `errors=1`. That
 * is a legitimate outcome, not a fault — the shard partition makes the next run
 * resume and converge — but nobody could SEE it, because nothing compared the
 * table's newest row against the clock. An empty table and a converging one
 * looked identical from outside, which is the same condition that let the
 * archive sit empty for the life of a project.
 *
 * The `odds-line-archive-freshness.ts` sibling exists for exactly that table and
 * is the pattern copied here: a PURE verdict function that never touches the
 * database, plus a thin reader. Callers decide what to do with the verdict; this
 * module blocks nothing and writes nothing.
 *
 * RULES
 * -----
 *  1. ABSENCE IS STALE. No rows, or no readable timestamp, is `stale` — never a
 *     silent pass-through. A table that cannot be measured is not healthy.
 *  2. The writer is hourly, so "fresh" is measured in HOURS, not minutes. The
 *     default thresholds come from the actual schedule.
 *  3. The thresholds are echoed back on the result so a test never has to trust
 *     an unstated comparison, and so a caller can see why a verdict was reached.
 */

export const SIGNALS_FRESHNESS_VERDICTS = ["healthy", "degraded", "stale"] as const;
export type SignalsFreshnessVerdict = (typeof SIGNALS_FRESHNESS_VERDICTS)[number];

export interface SignalsFreshnessThresholds {
  /** Newest row older than this many hours is `stale`. */
  readonly staleAfterHours: number;
  /** Newest row older than this many hours is `degraded`. */
  readonly degradedAfterHours: number;
}

/**
 * The writer runs hourly at :23, so two consecutive missed ticks plus slack is
 * the honest boundary for "stale". `degraded` is one missed tick.
 */
export const DEFAULT_SIGNALS_FRESHNESS_THRESHOLDS: SignalsFreshnessThresholds = {
  staleAfterHours: 3,
  degradedAfterHours: 1.75,
};

export interface SignalsFreshnessInput {
  /** Newest `fetchedAt` on any row, as a Date, ISO string, or absent. */
  readonly mostRecentFetchedAt: Date | string | null | undefined;
  /** Total row count, when the caller has it. Echoed back; never used to judge. */
  readonly rowCount?: number | null;
  /** Overrides the default thresholds. */
  readonly thresholds?: Partial<SignalsFreshnessThresholds>;
  /** Injectable clock so the verdict is testable without a real `Date.now()`. */
  readonly now?: Date;
}

export interface SignalsFreshnessResult {
  readonly verdict: SignalsFreshnessVerdict;
  /** Age of the newest row in hours. `null` only when there is no timestamp to
   *  measure from, in which case the verdict is `stale` (rule 1). */
  readonly ageHours: number | null;
  /** The timestamp actually judged, ISO-8601, or null on absence. */
  readonly mostRecentFetchedAt: string | null;
  readonly rowCount: number | null;
  readonly thresholds: SignalsFreshnessThresholds;
  /** Human-readable reason, safe to log or surface to an operator. */
  readonly reason: string;
}

function toDateOrNull(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function build(
  verdict: SignalsFreshnessVerdict,
  ageHours: number | null,
  mostRecentFetchedAt: string | null,
  rowCount: number | null,
  thresholds: SignalsFreshnessThresholds,
  reason: string,
): SignalsFreshnessResult {
  return { verdict, ageHours, mostRecentFetchedAt, rowCount, thresholds, reason };
}

/**
 * Pure staleness check for the `signals` ledger. No database access, so it can
 * be unit-tested exhaustively and cannot itself fail in production.
 */
export function assessSignalsFreshness(input: SignalsFreshnessInput): SignalsFreshnessResult {
  const thresholds: SignalsFreshnessThresholds = {
    ...DEFAULT_SIGNALS_FRESHNESS_THRESHOLDS,
    ...(input.thresholds ?? {}),
  };
  const now = input.now ?? new Date();
  const rowCount = input.rowCount ?? null;
  const observed = toDateOrNull(input.mostRecentFetchedAt);

  // Rule 1: absence is staleness. An unreadable timestamp is not a pass.
  if (!observed) {
    return build(
      "stale",
      null,
      null,
      rowCount,
      thresholds,
      rowCount === 0
        ? "the signals table is empty; the hourly write cron has written nothing"
        : "the signals table has rows but no readable fetchedAt, so freshness is unmeasurable",
    );
  }

  const ageMs = now.getTime() - observed.getTime();
  const ageHours = ageMs / 3_600_000;

  if (ageHours >= thresholds.staleAfterHours) {
    return build(
      "stale",
      ageHours,
      observed.toISOString(),
      rowCount,
      thresholds,
      `newest signal row is ${ageHours.toFixed(2)}h old, at or past the ${thresholds.staleAfterHours}h stale line; the hourly write cron is not keeping up`,
    );
  }
  if (ageHours >= thresholds.degradedAfterHours) {
    return build(
      "degraded",
      ageHours,
      observed.toISOString(),
      rowCount,
      thresholds,
      `newest signal row is ${ageHours.toFixed(2)}h old, past the ${thresholds.degradedAfterHours}h degraded line; the next hourly tick has not landed yet`,
    );
  }
  return build(
    "healthy",
    ageHours,
    observed.toISOString(),
    rowCount,
    thresholds,
    `newest signal row is ${ageHours.toFixed(2)}h old, inside the hourly schedule`,
  );
}

/**
 * Minimal Prisma-delegate-shaped surface this reader depends on.
 *
 * The filter is typed SPECIFICALLY, not as `Record<string, unknown>`. That is the
 * lesson of the line-archive outage (2026-08-22, three weeks dead): a local
 * interface written as a loose bag of unknowns will accept a filter Prisma
 * rejects, the call throws at runtime, and a swallowing catch makes it silent.
 * The sibling `OddsLineArchiveReaderDb` pins its own filter the same way. Typed
 * narrowly, a wrong filter is a COMPILE error instead of a three-week outage.
 *
 * Declared structurally so a test can pass a fake and production can pass the
 * real Prisma client without either depending on the other's types.
 */
export interface SignalsFreshnessReaderDb {
  readonly signal: {
    aggregate(args: {
      orderBy: { fetchedAt: "desc" };
      select: { fetchedAt: true };
    }): Promise<{ fetchedAt: Date | null } | null>;
    count(args: { where: { fetchedAt: { gte: Date } } }): Promise<number>;
  };
}

export interface ReadSignalsFreshnessResult {
  readonly verdict: SignalsFreshnessVerdict;
  readonly ageHours: number | null;
  readonly mostRecentFetchedAt: string | null;
  readonly rowCount: number;
  readonly thresholds: SignalsFreshnessThresholds;
  readonly reason: string;
}

/**
 * Read the newest `fetchedAt` and judge freshness. Write-free by construction:
 * two reads only (`findFirst`-shaped aggregate and a bounded `count`).
 */
export async function readSignalsFreshness(
  db: SignalsFreshnessReaderDb,
  options: { readonly now?: Date } = {},
): Promise<ReadSignalsFreshnessResult> {
  // Newest row, read through the typed filter rather than an empty `where: {}` so
  // a wrong shape is a compile error (see the interface doc for why).
  const newest = await db.signal.aggregate({
    orderBy: { fetchedAt: "desc" },
    select: { fetchedAt: true },
  });
  const mostRecent = newest?.fetchedAt ?? null;
  // Bounded to the healthy window, so the count answers "how many rows landed
  // in the last hour" — the question the verdict is actually about.
  const windowStart = new Date(
    (options.now ?? new Date()).getTime() -
      DEFAULT_SIGNALS_FRESHNESS_THRESHOLDS.degradedAfterHours * 60 * 60 * 1000,
  );
  const rowCount = await db.signal.count({ where: { fetchedAt: { gte: windowStart } } });
  const result = assessSignalsFreshness({
    mostRecentFetchedAt: mostRecent,
    rowCount,
    ...(options.now !== undefined ? { now: options.now } : {}),
  });
  return { ...result, rowCount };
}

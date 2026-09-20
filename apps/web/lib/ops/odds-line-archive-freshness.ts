/**
 * odds_line_snapshots freshness monitor.
 *
 * Incident context: the line archive silently stopped being written on
 * 2026-08-22 and nobody noticed for three weeks. The cause was one wrong
 * Prisma filter shape (a bare array where `{ in: [...] }` was required on a
 * scalar String column) inside `captureLineSnapshots`
 * (packages/ingestion-pipeline/src/line-archive.ts), wrapped in a catch that
 * returned `{ persisted: 0 }` instead of raising. The write path is fixed.
 * NOTHING in the repo watched the table's own freshness — every downstream
 * consumer of closing-line value just quietly ran on stale/absent data.
 * This module is that missing watch.
 *
 * Design intent, load-bearing:
 *  - This is a REPORT, not a gate. It never writes, never flips a flag,
 *    never blocks a pipeline. Callers decide what to do with the verdict.
 *  - Thresholds are REQUIRED parameters, not module constants. A caller
 *    must say, explicitly, what "stale" means for its context; there is no
 *    default to silently inherit or drift out from under a future edit.
 *  - Absence is the loudest signal, not the quietest. No snapshot ever
 *    recorded, a null/unparseable timestamp, or a corroborating recent-
 *    window count of exactly zero all read as STALE — never HEALTHY, and
 *    never a bare `null` a caller could mistake for "nothing to report".
 *    That asymmetry is the whole point: the original bug was an error path
 *    that resolved to a quiet zero and looked exactly like calm.
 *  - The pure verdict function takes no database. A separate, thin reader
 *    is the only piece that touches Prisma, so the logic above is testable
 *    with nothing but Dates and numbers.
 *
 * This module does NOT wire itself to any alert/notification channel. See
 * the reporting agent's handoff notes for why: an alarm wired to a channel
 * that is itself silently failing reproduces the exact defect this exists
 * to catch. Callers that want to page someone must first verify that path
 * is alive on its own terms.
 */

/** The complete verdict vocabulary, as a runtime value (not just a type),
 *  so a caller or a test can enumerate/validate against it directly. */
export const ODDS_LINE_ARCHIVE_FRESHNESS_VERDICTS = ["healthy", "degraded", "stale"] as const;

export type OddsLineArchiveFreshnessVerdict = (typeof ODDS_LINE_ARCHIVE_FRESHNESS_VERDICTS)[number];

/** Required, explicit — no magic defaults buried in the comparison logic.
 *  Both are minutes. `staleAfterMinutes` must be >= `degradedAfterMinutes`. */
export interface OddsLineArchiveFreshnessThresholds {
  /** Age past which freshness drops from healthy to degraded. */
  readonly degradedAfterMinutes: number;
  /** Age past which freshness is judged stale — an outage, not a lull. */
  readonly staleAfterMinutes: number;
}

export interface OddsLineArchiveFreshnessInput {
  /** The most recent OddsLineSnapshot.capturedAt across the table (or
   *  whatever scope the caller queried), or null/undefined if none exists,
   *  the table is empty, or the read itself failed. Absence is meaningful
   *  and is handled explicitly — never pass a sentinel Date for "unknown". */
  readonly mostRecentCapturedAt: Date | string | null | undefined;
  /** Optional corroborating signal: row count captured within a recent
   *  window the caller defines (e.g. "last 24h"). This never by itself
   *  overrides a healthy timestamp-based read UPWARD, but an explicit zero
   *  can never be read as healthy either — see rule 3 in the module doc. */
  readonly recentWindowRowCount?: number | null;
}

export interface OddsLineArchiveFreshnessResult {
  readonly verdict: OddsLineArchiveFreshnessVerdict;
  /** Measured age of the most recent snapshot, in minutes. `null` only when
   *  there is no timestamp at all to measure from (absence) — this is the
   *  one case where age is genuinely undefined, and the verdict is STALE
   *  whenever it is null, never a silent pass-through. */
  readonly ageMinutes: number | null;
  /** The timestamp actually judged, as ISO-8601, or null on absence. */
  readonly mostRecentCapturedAt: string | null;
  /** Echoes the input row count, or null if the caller didn't supply one. */
  readonly recentWindowRowCount: number | null;
  /** The thresholds this verdict was judged against — echoed back so a
   *  caller (or a test) never has to trust an unstated comparison. */
  readonly thresholds: OddsLineArchiveFreshnessThresholds;
  /** Human-readable reason, safe to log or surface to an operator. */
  readonly reason: string;
}

function toDateOrNull(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function buildResult(
  verdict: OddsLineArchiveFreshnessVerdict,
  ageMinutes: number | null,
  mostRecentCapturedAt: string | null,
  recentWindowRowCount: number | null,
  thresholds: OddsLineArchiveFreshnessThresholds,
  reason: string,
): OddsLineArchiveFreshnessResult {
  return {
    verdict,
    ageMinutes,
    mostRecentCapturedAt,
    recentWindowRowCount,
    thresholds,
    reason,
  };
}

/**
 * Pure staleness check for the odds line archive. No database access —
 * every input is a value the caller already has in hand (or explicitly
 * lacks). Never throws on a data-shaped input; a malformed threshold pair
 * is a caller bug and throws immediately, since that is a programming
 * error rather than a runtime observation about the table.
 */
export function assessOddsLineArchiveFreshness(
  input: OddsLineArchiveFreshnessInput,
  thresholds: OddsLineArchiveFreshnessThresholds,
  nowMs: number = Date.now(),
): OddsLineArchiveFreshnessResult {
  if (thresholds.staleAfterMinutes < thresholds.degradedAfterMinutes) {
    throw new Error(
      `assessOddsLineArchiveFreshness: staleAfterMinutes (${thresholds.staleAfterMinutes}) must be >= ` +
        `degradedAfterMinutes (${thresholds.degradedAfterMinutes}) — thresholds are required and must be internally consistent.`,
    );
  }
  if (thresholds.degradedAfterMinutes < 0 || thresholds.staleAfterMinutes < 0) {
    throw new Error("assessOddsLineArchiveFreshness: thresholds must be non-negative minute counts.");
  }

  const recentWindowRowCount =
    input.recentWindowRowCount === undefined ? null : input.recentWindowRowCount;

  const timestamp = toDateOrNull(input.mostRecentCapturedAt);

  // Rule 3: absence is the loudest signal, not the quietest. No timestamp
  // at all — whether the table is genuinely empty, the field was null, or
  // the value couldn't be parsed — is STALE, full stop. It is never healthy
  // and `ageMinutes` is never silently coerced into looking like "0m ago".
  if (timestamp === null) {
    return buildResult(
      "stale",
      null,
      null,
      recentWindowRowCount,
      thresholds,
      input.mostRecentCapturedAt == null
        ? "No odds line snapshot has ever been recorded (or the table is unreachable) — absence is treated as an outage, not as calm."
        : "The most recent snapshot timestamp could not be parsed — treated as absence, not as healthy.",
    );
  }

  const ageMs = nowMs - timestamp.getTime();
  // A future-dated capturedAt is clock skew or a data bug, not staleness —
  // clamp to zero rather than report a negative age, but say so plainly.
  const ageMinutes = Math.round(Math.max(0, ageMs) / 60_000);
  const isoTimestamp = timestamp.toISOString();
  const clockSkewNote = ageMs < 0 ? " (most recent snapshot timestamp is in the future — clock skew or bad data; age clamped to 0m)" : "";

  // A recent-window row count of exactly zero is itself an absence signal
  // and corroborates staleness even if the last-known timestamp hasn't
  // aged past the threshold yet — it means writes have stopped since that
  // last row landed. It can only push the verdict toward stale, never
  // manufacture a healthy read the timestamp doesn't otherwise support.
  const zeroRecentWindow = recentWindowRowCount === 0;

  if (ageMinutes > thresholds.staleAfterMinutes) {
    return buildResult(
      "stale",
      ageMinutes,
      isoTimestamp,
      recentWindowRowCount,
      thresholds,
      `Most recent snapshot is ${ageMinutes}m old, past the ${thresholds.staleAfterMinutes}m stale threshold.${clockSkewNote}`,
    );
  }

  if (zeroRecentWindow) {
    return buildResult(
      "stale",
      ageMinutes,
      isoTimestamp,
      recentWindowRowCount,
      thresholds,
      `Most recent snapshot is ${ageMinutes}m old (within the stale threshold), but the recent window recorded zero rows — ` +
        `writes appear to have stopped since. Zero is a signal, not silence.${clockSkewNote}`,
    );
  }

  if (ageMinutes > thresholds.degradedAfterMinutes) {
    return buildResult(
      "degraded",
      ageMinutes,
      isoTimestamp,
      recentWindowRowCount,
      thresholds,
      `Most recent snapshot is ${ageMinutes}m old, past the ${thresholds.degradedAfterMinutes}m degraded threshold ` +
        `but not yet past the ${thresholds.staleAfterMinutes}m stale threshold.${clockSkewNote}`,
    );
  }

  return buildResult(
    "healthy",
    ageMinutes,
    isoTimestamp,
    recentWindowRowCount,
    thresholds,
    `Most recent snapshot is ${ageMinutes}m old, within the ${thresholds.degradedAfterMinutes}m degraded threshold.${clockSkewNote}`,
  );
}

// ---------------------------------------------------------------------------
// Reader — the only piece that touches a database. Kept deliberately thin
// and separate from the pure function above, so the verdict logic needs no
// database to test. Mirrors the hand-written-delegate-surface pattern
// already used for this exact model in line-archive.ts (`LineArchiveDb`):
// `db` is accepted as `unknown` at the public boundary and cast internally,
// because this module must not depend on (or import types from) the file
// this task is forbidden from editing.
// ---------------------------------------------------------------------------

/** Minimal Prisma-delegate-shaped surface this reader depends on. */
export interface OddsLineArchiveReaderDb {
  oddsLineSnapshot: {
    findFirst(args: {
      orderBy: { capturedAt: "desc" };
      select: { capturedAt: true };
    }): Promise<{ capturedAt: Date } | null>;
    count(args: { where: { capturedAt: { gte: Date } } }): Promise<number>;
  };
}

export interface ReadOddsLineArchiveFreshnessInputArgs {
  /** Prisma-like db handle. Accepted as `unknown` for the same reason
   *  `LineArchiveDb` callers do: the delegate's exact generated shape is
   *  not this module's concern, only that it satisfies the surface above. */
  db: unknown;
  /** Width of the "recent window" used for the corroborating row count. */
  recentWindowMinutes: number;
  nowMs?: number;
}

export interface ReadOddsLineArchiveFreshnessInputResult {
  readonly input: OddsLineArchiveFreshnessInput;
  /** Set when the read itself failed — the caller still gets a usable
   *  `input` (absence), never a thrown exception from this function. */
  readonly error?: string;
}

/**
 * Reads the most recent OddsLineSnapshot timestamp plus a corroborating
 * recent-window row count, and shapes them into
 * `OddsLineArchiveFreshnessInput` for `assessOddsLineArchiveFreshness`.
 *
 * Never throws: a DB error is caught and reported as absence (`{
 * mostRecentCapturedAt: null }`) plus an `error` string, which — by rule 3
 * above — the pure function will correctly judge as STALE rather than as
 * "nothing to report". Does not invent a timestamp or a count on failure.
 */
export async function readOddsLineArchiveFreshnessInput(
  args: ReadOddsLineArchiveFreshnessInputArgs,
): Promise<ReadOddsLineArchiveFreshnessInputResult> {
  const db = args.db as OddsLineArchiveReaderDb;
  const nowMs = args.nowMs ?? Date.now();

  try {
    const [latest, recentWindowRowCount] = await Promise.all([
      db.oddsLineSnapshot.findFirst({
        orderBy: { capturedAt: "desc" },
        select: { capturedAt: true },
      }),
      db.oddsLineSnapshot.count({
        where: { capturedAt: { gte: new Date(nowMs - args.recentWindowMinutes * 60_000) } },
      }),
    ]);

    return {
      input: {
        mostRecentCapturedAt: latest?.capturedAt ?? null,
        recentWindowRowCount,
      },
    };
  } catch (err) {
    return {
      input: { mostRecentCapturedAt: null, recentWindowRowCount: null },
      error: err instanceof Error ? err.message : "Unknown error reading odds_line_snapshots.",
    };
  }
}

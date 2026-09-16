/**
 * Line-archive freshness — the alarm the three-week outage did not have.
 *
 * `odds_line_snapshots` stopped being written on 2026-08-22 and nobody noticed
 * until 2026-09-13. The write path is failure-isolated by design (a broken
 * archive must never take down ingestion), so `captureLineSnapshots` returns
 * `{ persisted: 0, error }` instead of raising. That is the right call — and it
 * means the ONLY evidence of the outage was a row count nothing read.
 *
 * This module is that reader. It is the follow-up AGENTS.md names by itself:
 * "nothing alarms on archive staleness."
 *
 * Why it matters beyond tidiness: closing lines are the input CLV is graded
 * from, and CLV is the one unmet ESTABLISHED requirement. Three weeks of
 * silence means three weeks of picks that cannot be graded on it at all.
 *
 * Four rules this module keeps, each one a way the previous silence happened:
 *
 *   1. SILENCE IS NEVER HEALTH. An archive that is switched on and has never
 *      been written reads SILENT, not HEALTHY. Zero rows is the exact shape a
 *      total outage takes, so it must never share a status with success.
 *   2. A FAILED QUERY IS NEVER HEALTH EITHER. It reads UNKNOWN and carries the
 *      error text. Collapsing a failure into a number an operator cannot
 *      distinguish from a real reading is how the first outage hid.
 *   3. OFF IS NOT BROKEN. `LINE_ARCHIVE_ENABLED` is founder-only (law 3). When
 *      it is off this reports DISABLED and makes ZERO database calls, mirroring
 *      the hard gate in `captureLineSnapshotsIfEnabled`. An agent reading this
 *      surface must never treat DISABLED as a defect to fix in code.
 *   4. IT ONLY READS. No writes, no flag changes, no side effects.
 *
 * The competing hypothesis for the outage — that the flag was simply switched
 * off in Vercel on 2026-08-22 — was never eliminated from the repo. This
 * surface settles that question permanently: DISABLED and STALE are different
 * readings, so the next time the archive goes quiet nobody has to guess which
 * one it was.
 */

/** How the archive is currently reading. Only HEALTHY means "it is working". */
export type LineArchiveFreshnessStatus =
  | "HEALTHY"
  | "STALE"
  | "SILENT"
  | "DISABLED"
  | "UNKNOWN";

/**
 * The narrow slice of the Prisma client this needs.
 *
 * Deliberately hand-written and deliberately NOT `unknown`-then-cast: that cast
 * is rule 2 of the three things that let the original outage survive, because
 * it meant the real client's types never constrained the call. Both queries
 * below use scalar DateTime filters (`gte`), which is the shape Prisma accepts
 * for a scalar column — the outage itself was a bare array handed to one.
 */
export interface LineArchiveFreshnessDb {
  readonly oddsLineSnapshot: {
    findFirst(args: {
      readonly orderBy: { readonly capturedAt: "desc" };
      readonly select: { readonly capturedAt: true };
    }): Promise<{ readonly capturedAt: Date } | null>;
    count(args: {
      readonly where: { readonly capturedAt: { readonly gte: Date } };
    }): Promise<number>;
  };
}

export interface LineArchiveFreshness {
  readonly status: LineArchiveFreshnessStatus;
  /** The founder's env flag as read, never as changed. */
  readonly enabled: boolean;
  /** ISO-8601, or null when the archive is off, empty, or unreadable. */
  readonly newestCapturedAt: string | null;
  /** Age of the newest capture. Null whenever `newestCapturedAt` is null. */
  readonly hoursSinceNewest: number | null;
  /** Rows captured in the last 24h. Null when off or unreadable — NOT zero. */
  readonly capturedLast24h: number | null;
  /** The threshold this reading was judged against. */
  readonly staleAfterHours: number;
  /** Present only on UNKNOWN. Its presence is what makes the zeros unreadable. */
  readonly error?: string;
  readonly operatorHint: string;
}

/** Generous default: the refresh path runs every 15 minutes, so 6h is ~24 missed cycles. */
export const LINE_ARCHIVE_STALE_AFTER_HOURS = 6;

const MS_PER_HOUR = 3_600_000;

export async function loadLineArchiveFreshness(
  db: LineArchiveFreshnessDb,
  input: {
    /** Read from `isLineArchiveEnabled()` at the call site — never re-derived here. */
    readonly enabled: boolean;
    readonly now: Date;
    readonly staleAfterHours?: number;
  },
): Promise<LineArchiveFreshness> {
  const staleAfterHours =
    Number.isFinite(input.staleAfterHours) && (input.staleAfterHours as number) > 0
      ? (input.staleAfterHours as number)
      : LINE_ARCHIVE_STALE_AFTER_HOURS;

  // Rule 3: off means zero DB calls, same as the capture path's hard gate.
  if (!input.enabled) {
    return {
      status: "DISABLED",
      enabled: false,
      newestCapturedAt: null,
      hoursSinceNewest: null,
      capturedLast24h: null,
      staleAfterHours,
      operatorHint:
        "LINE_ARCHIVE_ENABLED is not true, so no closing lines are being recorded and CLV cannot be graded on any pick generated now. Turning it on is a founder action (law 3) — no agent flips it.",
    };
  }

  try {
    const since = new Date(input.now.getTime() - 24 * MS_PER_HOUR);
    const [newest, capturedLast24h] = await Promise.all([
      db.oddsLineSnapshot.findFirst({
        orderBy: { capturedAt: "desc" },
        select: { capturedAt: true },
      }),
      db.oddsLineSnapshot.count({ where: { capturedAt: { gte: since } } }),
    ]);

    // Rule 1: an empty archive is its own reading, never HEALTHY.
    if (!newest) {
      return {
        status: "SILENT",
        enabled: true,
        newestCapturedAt: null,
        hoursSinceNewest: null,
        capturedLast24h,
        staleAfterHours,
        operatorHint:
          "The archive is switched on and has never been written. That is the exact shape a total capture failure takes — check the ingestion logs for a swallowed error before assuming it is simply new.",
      };
    }

    const hoursSinceNewest = (input.now.getTime() - newest.capturedAt.getTime()) / MS_PER_HOUR;
    const iso = newest.capturedAt.toISOString();

    if (hoursSinceNewest > staleAfterHours) {
      const days = hoursSinceNewest / 24;
      return {
        status: "STALE",
        enabled: true,
        newestCapturedAt: iso,
        hoursSinceNewest,
        capturedLast24h,
        staleAfterHours,
        operatorHint: `Newest capture is ${hoursSinceNewest.toFixed(1)}h old (${days.toFixed(1)} days) against a ${staleAfterHours}h threshold, and ${capturedLast24h} rows landed in the last 24h. The capture path swallows its own errors by design, so a stale reading here is the only signal there is — read the ingestion logs, do not wait for it to recover.`,
      };
    }

    return {
      status: "HEALTHY",
      enabled: true,
      newestCapturedAt: iso,
      hoursSinceNewest,
      capturedLast24h,
      staleAfterHours,
      operatorHint: `Newest capture ${hoursSinceNewest.toFixed(1)}h old, ${capturedLast24h} rows in the last 24h. Closing lines are being recorded, so CLV is gradable on picks generated now.`,
    };
  } catch (err) {
    // Rule 2: a failure that reads like a measurement is worse than no reading.
    // The detail is logged, not returned — see the error field below.
    console.error("[line-archive-freshness] read failed:", err);
    return {
      status: "UNKNOWN",
      enabled: true,
      newestCapturedAt: null,
      hoursSinceNewest: null,
      capturedLast24h: null,
      staleAfterHours,
      // A FIXED string, never the driver's message. This whole payload is
      // returned by GET /api/ops/public-surface-truth, whose hasOpsAuth check
      // gates only the `detailed` block — everything else, including this, is
      // served to anonymous callers. A Prisma error text carries table and
      // column names and sometimes the connection target, which is free
      // reconnaissance. The status is what an operator acts on; the detail
      // belongs in the server log, not the response body. (CodeRabbit, #819.)
      error: "Archive freshness query failed (see server logs).",
      operatorHint:
        "Archive freshness could not be read, so its health is unknown — this is NOT a report that the archive is fine. Fix the read before drawing any conclusion about CLV coverage.",
    };
  }
}

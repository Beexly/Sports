/**
 * Archive Staleness Monitor (GSE-MON-012).
 *
 * Monitors `odds_line_snapshots` write freshness to prevent silent data outages.
 *
 * Context: Between 2026-08-22 and 2026-09-13, the line archive silently died due
 * to a Prisma filter mismatch ({ market: markets } instead of { in: markets }).
 * Because errors were caught and failure-isolated, no alarm fired for 21 days.
 *
 * This monitor inspects the rolling write volume and alerts the owner if zero
 * line snapshots have been written in the last 6 hours when LINE_ARCHIVE_ENABLED=true.
 */

import { notifyOwner } from "./owner-alert.js";

export const DEFAULT_STALENESS_WINDOW_HOURS = 6;

export interface ArchiveStalenessCheckArgs {
  readonly db: {
    oddsLineSnapshot: {
      findMany: (args: {
        where?: { capturedAt?: { gte?: Date } };
        orderBy?: { capturedAt: "desc" };
        take?: number;
        select?: { capturedAt: boolean };
      }) => Promise<Array<{ capturedAt: Date }>>;
    };
  };
  readonly now?: () => Date;
  readonly windowHours?: number;
  readonly env?: Record<string, string | undefined>;
  readonly isQuietPeriod?: boolean;
}

export interface ArchiveStalenessReport {
  readonly isStale: boolean;
  readonly writesInWindow: number;
  readonly lastWriteAt: Date | null;
  readonly windowHours: number;
  readonly alerted: boolean;
  readonly reason: string;
}

export async function checkArchiveStaleness(
  args: ArchiveStalenessCheckArgs,
): Promise<ArchiveStalenessReport> {
  const env = args.env ?? process.env;
  const isEnabled = env["LINE_ARCHIVE_ENABLED"]?.trim().toLowerCase() === "true";

  if (!isEnabled) {
    return {
      isStale: false,
      writesInWindow: 0,
      lastWriteAt: null,
      windowHours: args.windowHours ?? DEFAULT_STALENESS_WINDOW_HOURS,
      alerted: false,
      reason: "LINE_ARCHIVE_ENABLED is false; archive is intentionally inert.",
    };
  }

  const now = (args.now ?? (() => new Date()))();
  const windowHours = args.windowHours ?? DEFAULT_STALENESS_WINDOW_HOURS;
  const windowStart = new Date(now.getTime() - windowHours * 3_600_000);

  try {
    const recent = await args.db.oddsLineSnapshot.findMany({
      where: { capturedAt: { gte: windowStart } },
      orderBy: { capturedAt: "desc" },
      take: 10,
      select: { capturedAt: true },
    });

    const writesInWindow = recent.length;
    const lastWriteAt = recent[0]?.capturedAt ?? null;

    if (writesInWindow > 0) {
      return {
        isStale: false,
        writesInWindow,
        lastWriteAt,
        windowHours,
        alerted: false,
        reason: `Archive is healthy: ${writesInWindow}+ snapshots recorded in last ${windowHours}h.`,
      };
    }

    // Zero writes in rolling window
    if (args.isQuietPeriod) {
      return {
        isStale: false,
        writesInWindow: 0,
        lastWriteAt,
        windowHours,
        alerted: false,
        reason: `Zero writes in last ${windowHours}h, but market is currently quiet (no upcoming games).`,
      };
    }

    // Real outage detected
    const alertMessage =
      `🚨 [GSE LINE ARCHIVE OUTAGE]\n` +
      `odds_line_snapshots has received ZERO writes in the last ${windowHours} hours.\n` +
      `LINE_ARCHIVE_ENABLED is TRUE, but closing line tracking is stalling.\n` +
      `Timestamp: ${now.toISOString()}`;

    console.warn(`[archive-staleness-monitor] ${alertMessage}`);
    const alerted = await notifyOwner(alertMessage);

    return {
      isStale: true,
      writesInWindow: 0,
      lastWriteAt,
      windowHours,
      alerted,
      reason: `OUTAGE: Zero writes in last ${windowHours}h during active betting window.`,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[archive-staleness-monitor] Failed to check staleness: ${errorMsg}`);
    return {
      isStale: true,
      writesInWindow: 0,
      lastWriteAt: null,
      windowHours,
      alerted: false,
      reason: `Query error: ${errorMsg}`,
    };
  }
}

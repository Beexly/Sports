import { describe, expect, it, vi } from "vitest";
import {
  LINE_ARCHIVE_STALE_AFTER_HOURS,
  loadLineArchiveFreshness,
  type LineArchiveFreshnessDb,
} from "./line-archive-freshness";

/**
 * These tests are mostly about what must NOT read as healthy.
 *
 * The archive went quiet for three weeks with no alarm because the only
 * evidence of failure was a row count nothing read, and the write path
 * swallows its own errors by design. A monitor that reports HEALTHY for an
 * empty table or a failed query would reproduce that silence exactly, with the
 * added cost that somebody would now be trusting it.
 */

const NOW = new Date("2026-09-13T20:00:00Z");

function dbWith(newest: Date | null, count = 0): LineArchiveFreshnessDb {
  return {
    oddsLineSnapshot: {
      findFirst: vi.fn().mockResolvedValue(newest ? { capturedAt: newest } : null),
      count: vi.fn().mockResolvedValue(count),
    },
  } as unknown as LineArchiveFreshnessDb;
}

describe("line-archive freshness", () => {
  it("reports HEALTHY only when a recent capture actually exists", async () => {
    const r = await loadLineArchiveFreshness(dbWith(new Date("2026-09-13T19:30:00Z"), 412), {
      enabled: true,
      now: NOW,
    });
    expect(r.status).toBe("HEALTHY");
    expect(r.hoursSinceNewest).toBeCloseTo(0.5, 6);
    expect(r.capturedLast24h).toBe(412);
    expect(r.error).toBeUndefined();
  });

  it("catches the real outage: three weeks of silence reads STALE with its age", async () => {
    // The measured shape — last capture 2026-08-22, read on 2026-09-13.
    const r = await loadLineArchiveFreshness(dbWith(new Date("2026-08-22T12:00:00Z"), 0), {
      enabled: true,
      now: NOW,
    });
    expect(r.status).toBe("STALE");
    expect(r.hoursSinceNewest).toBeGreaterThan(22 * 24);
    expect(r.capturedLast24h).toBe(0);
    expect(r.operatorHint).toContain("days");
    // The threshold would have fired on day one, not on day twenty-two.
    expect(LINE_ARCHIVE_STALE_AFTER_HOURS).toBeLessThanOrEqual(24);
  });

  it("an empty archive is SILENT, never HEALTHY", async () => {
    // Zero rows is precisely what a total capture failure looks like. If this
    // ever shares a status with success, the monitor is decorative.
    const r = await loadLineArchiveFreshness(dbWith(null, 0), { enabled: true, now: NOW });
    expect(r.status).toBe("SILENT");
    expect(r.status).not.toBe("HEALTHY");
    expect(r.newestCapturedAt).toBeNull();
  });

  it("a failed read is UNKNOWN and carries the error — the zeros must be unreadable", async () => {
    const db = {
      oddsLineSnapshot: {
        findFirst: vi.fn().mockRejectedValue(new Error("connection terminated")),
        count: vi.fn().mockResolvedValue(0),
      },
    } as unknown as LineArchiveFreshnessDb;

    const r = await loadLineArchiveFreshness(db, { enabled: true, now: NOW });
    expect(r.status).toBe("UNKNOWN");
    expect(r.error).toContain("connection terminated");
    // Null, not 0: a reader must not be able to mistake a failure for a count.
    expect(r.capturedLast24h).toBeNull();
    expect(r.hoursSinceNewest).toBeNull();
  });

  it("OFF makes zero database calls and reads DISABLED, not broken", async () => {
    // Mirrors the hard gate in captureLineSnapshotsIfEnabled. The flag is
    // founder-only under law 3, so DISABLED is a state to report, never a
    // defect for an agent to fix in code.
    const findFirst = vi.fn();
    const count = vi.fn();
    const db = { oddsLineSnapshot: { findFirst, count } } as unknown as LineArchiveFreshnessDb;

    const r = await loadLineArchiveFreshness(db, { enabled: false, now: NOW });
    expect(r.status).toBe("DISABLED");
    expect(findFirst).not.toHaveBeenCalled();
    expect(count).not.toHaveBeenCalled();
    expect(r.operatorHint).toContain("founder");
  });

  it("distinguishes OFF from STALE, which is the question the repo could not answer", async () => {
    // The outage had two candidate causes — a broken filter, or the flag being
    // switched off in Vercel on the same day — and nothing in the repo could
    // tell them apart. These are now different readings.
    const off = await loadLineArchiveFreshness(dbWith(null), { enabled: false, now: NOW });
    const stale = await loadLineArchiveFreshness(dbWith(new Date("2026-08-22T12:00:00Z")), {
      enabled: true,
      now: NOW,
    });
    expect(off.status).not.toBe(stale.status);
  });

  it("hands Prisma a scalar DateTime filter, not the bare array that broke the writer", async () => {
    // The outage was `where: { market: markets }` on a scalar String column.
    // This pins the one shape this module sends.
    const db = dbWith(new Date("2026-09-13T19:00:00Z"), 5);
    await loadLineArchiveFreshness(db, { enabled: true, now: NOW });

    const countArgs = vi.mocked(db.oddsLineSnapshot.count).mock.calls[0]![0];
    const capturedAt = (countArgs.where as { capturedAt: unknown }).capturedAt;
    expect(Array.isArray(capturedAt)).toBe(false);
    expect(capturedAt).toEqual({ gte: new Date("2026-09-12T20:00:00Z") });
  });

  it("falls back to the documented threshold when handed a nonsense one", async () => {
    const r = await loadLineArchiveFreshness(dbWith(new Date("2026-09-13T19:00:00Z"), 1), {
      enabled: true,
      now: NOW,
      staleAfterHours: Number.NaN,
    });
    expect(r.staleAfterHours).toBe(LINE_ARCHIVE_STALE_AFTER_HOURS);
  });
});

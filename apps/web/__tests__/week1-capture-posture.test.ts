/**
 * The L-14 detector. L-14's damage was invisible because the ops surface
 * reported only the last odds insert across ALL sports, so a healthy MLB slate
 * masked a total NFL blackout for the whole of August.
 */
import { describe, expect, it } from "vitest";
import { classifyWeek1Capture } from "@/lib/ops/week1-capture-posture";

const ARMED = { lineArchiveEnabled: true, closeStampedLast7d: 5, snapshotsLast7d: 900 };

describe("classifyWeek1Capture", () => {
  it("LIVE when NFL odds landed in the last hour", () => {
    const p = classifyWeek1Capture({ nflOddsRowsLastHour: 45, nflOddsRowsLast24h: 900, ...ARMED });
    expect(p.state).toBe("LIVE");
    expect(p.week1Recoverable).toBe(true);
    expect(p.hint).toContain("45 odds row(s)");
  });

  it("QUIET when the hour is empty but the day is not", () => {
    const p = classifyWeek1Capture({ nflOddsRowsLastHour: 0, nflOddsRowsLast24h: 120, ...ARMED });
    expect(p.state).toBe("QUIET");
    expect(p.week1Recoverable).toBe(true);
  });

  it("DARK on the exact L-14 signature — zero NFL rows in 24h", () => {
    const p = classifyWeek1Capture({ nflOddsRowsLastHour: 0, nflOddsRowsLast24h: 0, ...ARMED });
    expect(p.state).toBe("DARK");
    expect(p.week1Recoverable).toBe(false);
    expect(p.hint).toContain("L-14");
  });

  it("is NOT recoverable when the archive is inert, even with odds flowing", () => {
    // The independent failure: the board looks perfectly healthy while every
    // closing line is silently discarded.
    const p = classifyWeek1Capture({
      nflOddsRowsLastHour: 45,
      nflOddsRowsLast24h: 900,
      lineArchiveEnabled: false,
      closeStampedLast7d: 0,
      snapshotsLast7d: 0,
    });
    expect(p.state).toBe("LIVE");
    expect(p.week1Recoverable).toBe(false);
    expect(p.hint).toContain("LINE_ARCHIVE_ENABLED is OFF");
  });

  it("does not cry wolf about zero CLOSE on a genuinely quiet board", () => {
    // Nothing captured means nothing to stamp. Warning here would train the
    // operator to ignore the field.
    const p = classifyWeek1Capture({
      nflOddsRowsLastHour: 10,
      nflOddsRowsLast24h: 100,
      lineArchiveEnabled: true,
      closeStampedLast7d: 0,
      snapshotsLast7d: 0,
    });
    expect(p.week1Recoverable).toBe(true);
    expect(p.hint).toContain("Expected on a quiet board");
  });

  it("FLAGS the measured production state: snapshots accumulating, CLOSE never stamped", () => {
    // hf7-archive/RESULTS.md 2026-08-20: NFL 9,768 INTERIM / 0 CLOSE.
    // The archive is on and piling up while the close is never captured —
    // a CLV track with no closing line. This must NOT read as recoverable.
    const p = classifyWeek1Capture({
      nflOddsRowsLastHour: 45,
      nflOddsRowsLast24h: 900,
      lineArchiveEnabled: true,
      closeStampedLast7d: 0,
      snapshotsLast7d: 9_768,
    });
    expect(p.state).toBe("LIVE");
    expect(p.week1Recoverable).toBe(false);
    expect(p.hint).toContain("ZERO CLOSE-stamped");
    expect(p.hint).toContain("FREE settlement path never stamps CLOSE");
  });

  it("reports both failures at once when odds are dark AND the archive is off", () => {
    const p = classifyWeek1Capture({
      nflOddsRowsLastHour: 0,
      nflOddsRowsLast24h: 0,
      lineArchiveEnabled: false,
      closeStampedLast7d: 0,
      snapshotsLast7d: 0,
    });
    expect(p.state).toBe("DARK");
    expect(p.week1Recoverable).toBe(false);
    expect(p.hint).toContain("L-14");
    expect(p.hint).toContain("LINE_ARCHIVE_ENABLED is OFF");
  });
});

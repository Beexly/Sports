import { describe, expect, it } from "vitest";
import { chicagoMinutesSinceMidnight, isNeonQuietWindow } from "@/lib/cron/neon-quiet-window";

/**
 * Neon autosuspend quiet window (owner directive 2026-11-13): DB-touching
 * crons skip Neon work 02:30–06:30 America/Chicago when no game is live.
 * November instants are CST (UTC-6); July instants are CDT (UTC-5) — the
 * window must follow the civil clock, not a fixed UTC offset.
 */
describe("neon-quiet-window", () => {
  it("computes Chicago civil minutes across CST and CDT", () => {
    // 10:00Z = 04:00 CST in November
    expect(chicagoMinutesSinceMidnight(new Date("2026-11-13T10:00:00Z"))).toBe(240);
    // 07:30Z = 02:30 CDT in July
    expect(chicagoMinutesSinceMidnight(new Date("2026-07-15T07:30:00Z"))).toBe(150);
  });

  it("opens at 02:30 and closes at 06:30 Chicago time (end exclusive)", () => {
    expect(isNeonQuietWindow(new Date("2026-11-13T08:29:00Z"))).toBe(false); // 02:29 CST
    expect(isNeonQuietWindow(new Date("2026-11-13T08:30:00Z"))).toBe(true); // 02:30 CST
    expect(isNeonQuietWindow(new Date("2026-11-13T10:00:00Z"))).toBe(true); // 04:00 CST
    expect(isNeonQuietWindow(new Date("2026-11-13T12:29:00Z"))).toBe(true); // 06:29 CST
    expect(isNeonQuietWindow(new Date("2026-11-13T12:30:00Z"))).toBe(false); // 06:30 CST
  });

  it("stays on the civil clock through DST", () => {
    expect(isNeonQuietWindow(new Date("2026-07-15T07:30:00Z"))).toBe(true); // 02:30 CDT
    expect(isNeonQuietWindow(new Date("2026-07-15T11:30:00Z"))).toBe(false); // 06:30 CDT
  });

  it("does not fire during kickoff or prime time", () => {
    expect(isNeonQuietWindow(new Date("2026-11-13T01:15:00Z"))).toBe(false); // TNF 19:15 CST
    expect(isNeonQuietWindow(new Date("2026-11-15T18:00:00Z"))).toBe(false); // Sunday 12:00 CST
    expect(isNeonQuietWindow(new Date("2026-11-16T01:20:00Z"))).toBe(false); // SNF 19:20 CST
  });
});
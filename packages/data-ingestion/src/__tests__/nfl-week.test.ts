import { describe, expect, it } from "vitest";
import {
  nflWeekOneStart,
  resolveNflWeek,
  NFL_REGULAR_SEASON_WEEKS,
} from "../nflverse-season";

/**
 * The week resolver the projection basis gate reads. Derived from the calendar
 * rather than a hardcoded table, so these tests are the proof the derivation
 * is right — checked against real, verifiable dates rather than against itself.
 */

describe("week 1 opens the day after Labor Day", () => {
  it("lands on the real dates for seasons with known openers", () => {
    // Labor Day is the first Monday in September. The week-1 window opens the
    // Tuesday after it; the Thursday opener is two days later still.
    // 2026: Labor Day Mon Sep 7 → window opens Tue Sep 8 → opener Thu Sep 10.
    expect(nflWeekOneStart(2026).toISOString().slice(0, 10)).toBe("2026-09-08");
    // 2025: Labor Day Mon Sep 1 → window opens Tue Sep 2 → opener Thu Sep 4.
    expect(nflWeekOneStart(2025).toISOString().slice(0, 10)).toBe("2025-09-02");
    // 2024: Labor Day Mon Sep 2 → window opens Tue Sep 3 → opener Thu Sep 5.
    expect(nflWeekOneStart(2024).toISOString().slice(0, 10)).toBe("2024-09-03");
    // 2027: Sep 1 is a Wednesday, so Labor Day is Mon Sep 6 — the case that
    // catches an off-by-one in the "first Monday" arithmetic.
    expect(nflWeekOneStart(2027).toISOString().slice(0, 10)).toBe("2027-09-07");
  });

  it("always resolves to a Tuesday", () => {
    for (let season = 2020; season <= 2035; season++) {
      expect(nflWeekOneStart(season).getUTCDay(), `season ${season}`).toBe(2);
    }
  });

  it("handles a September that starts ON a Monday", () => {
    // 2025-09-01 is a Monday, so Labor Day IS Sep 1 and the offset must be 0.
    // A naive `(8 - dow) % 7` without the dow === 1 guard pushes this a week
    // late, which would report week 1 during week 2.
    expect(nflWeekOneStart(2025).getUTCDate()).toBe(2);
  });
});

describe("the target week is clamped at both ends", () => {
  it("reads week 1 before the season opens, not week 0 or a negative", () => {
    // Wednesday 2026-09-02: six days before the window opens. Every projection
    // surface in this period is about week 1, and a week 0 would make every
    // "is this basis current" check compare against a week that never happens.
    const r = resolveNflWeek(new Date("2026-09-02T12:00:00Z"));
    expect(r.season).toBe(2026);
    expect(r.week).toBe(1);
    expect(r.inRegularSeason).toBe(false);
  });

  it("reads week 1 on the day the window opens and on opener day", () => {
    expect(resolveNflWeek(new Date("2026-09-08T00:00:00Z")).week).toBe(1);
    expect(resolveNflWeek(new Date("2026-09-10T00:20:00Z")).week).toBe(1);
    expect(resolveNflWeek(new Date("2026-09-08T00:00:00Z")).inRegularSeason).toBe(true);
  });

  it("rolls over on Tuesday, so Monday night belongs to the week that opened", () => {
    // Monday 2026-09-14 is week 1's Monday-nighter.
    expect(resolveNflWeek(new Date("2026-09-14T23:00:00Z")).week).toBe(1);
    // Tuesday 2026-09-15 opens week 2.
    expect(resolveNflWeek(new Date("2026-09-15T00:00:00Z")).week).toBe(2);
  });

  it("stops at week 18 instead of running on into weeks that do not exist", () => {
    // Week 18 opens 17 weeks after the window: 2026-09-08 + 119 days.
    const week18 = new Date("2026-09-08T00:00:00Z");
    week18.setUTCDate(week18.getUTCDate() + 17 * 7);
    expect(resolveNflWeek(week18).week).toBe(NFL_REGULAR_SEASON_WEEKS);
    expect(resolveNflWeek(week18).inRegularSeason).toBe(true);

    // Deep into January the regular season is over. Letting the count run on
    // would quietly age a valid basis out of every grace window.
    const january = new Date("2027-01-25T00:00:00Z");
    expect(resolveNflWeek(january).week).toBe(NFL_REGULAR_SEASON_WEEKS);
    expect(resolveNflWeek(january).inRegularSeason).toBe(false);
    // And January still belongs to the season that STARTED the prior September.
    expect(resolveNflWeek(january).season).toBe(2026);
  });

  it("never returns a week outside 1..18, on any day of any year", () => {
    const day = new Date("2020-01-01T00:00:00Z");
    while (day.getUTCFullYear() < 2036) {
      const { week } = resolveNflWeek(day);
      expect(week, day.toISOString()).toBeGreaterThanOrEqual(1);
      expect(week, day.toISOString()).toBeLessThanOrEqual(NFL_REGULAR_SEASON_WEEKS);
      day.setUTCDate(day.getUTCDate() + 1);
    }
  });
});

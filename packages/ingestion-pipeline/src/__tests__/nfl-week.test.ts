import { describe, expect, it } from "vitest";
import { injuryReportIsBeforeKickoff, nflWeekOf } from "../nfl-week.js";

describe("NFL week bound", () => {
  it("the 2026 opener is week 1, and the following Wednesday is week 2", () => {
    expect(nflWeekOf(new Date("2026-09-09T23:15:00Z"))).toEqual({ season: 2026, week: 1 });
    expect(nflWeekOf(new Date("2026-09-16T23:15:00Z"))).toEqual({ season: 2026, week: 2 });
  });

  it("a report fetched after kickoff is refused even if the week number matches", () => {
    const kickoff = new Date("2026-09-13T17:00:00Z");
    expect(injuryReportIsBeforeKickoff({
      kickoff,
      fetchedAt: new Date("2026-09-13T18:00:00Z"),
      season: 2026,
      week: 1,
    })).toBe(false);
  });

  it("a same-week report fetched before kickoff is usable, and next week is not", () => {
    const kickoff = new Date("2026-09-13T17:00:00Z");
    expect(injuryReportIsBeforeKickoff({
      kickoff,
      fetchedAt: new Date("2026-09-11T12:00:00Z"),
      season: 2026,
      week: 1,
    })).toBe(true);
    expect(injuryReportIsBeforeKickoff({
      kickoff,
      fetchedAt: new Date("2026-09-11T12:00:00Z"),
      season: 2026,
      week: 2,
    })).toBe(false);
  });
});

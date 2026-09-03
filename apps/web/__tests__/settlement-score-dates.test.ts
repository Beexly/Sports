import { describe, expect, it } from "vitest";
import {
  compactEspnDateRanges,
  toEspnDateKey,
  toIsoDateKey,
  uniqueScoreboardDates,
} from "@/lib/data-sources/settlement-score-dates";

describe("settlement-score-dates", () => {
  it("converts ISO commence times to ESPN YYYYMMDD (US Eastern)", () => {
    expect(toEspnDateKey("2026-07-15T23:10:00.000Z")).toBe("20260715");
    expect(toIsoDateKey("2026-07-15T23:10:00.000Z")).toBe("2026-07-15");
  });

  // ESPN buckets a game under its US Eastern date. Verified against the live
  // scoreboard: SF @ IND carries date 2025-12-23T01:15Z, and
  //   dates=20251222 -> 1 event, dates=20251223 -> 0 events.
  // A UTC key would read 20251223 and ask ESPN for a day the game is not on.
  it("buckets a post-midnight-UTC kickoff on the PREVIOUS Eastern day", () => {
    // Monday Night Football, 8:15pm ET on 2025-12-22 (EST, UTC-5).
    expect(toEspnDateKey("2025-12-23T01:15:00.000Z")).toBe("20251222");
    expect(toIsoDateKey("2025-12-23T01:15:00.000Z")).toBe("2025-12-22");
  });

  it("handles the EDT boundary too, not just EST", () => {
    // Sunday Night Football, 8:20pm ET on 2026-09-06 (EDT, UTC-4).
    expect(toEspnDateKey("2026-09-07T00:20:00.000Z")).toBe("20260906");
    // A late West Coast window game, 10:20pm ET on 2026-09-06.
    expect(toEspnDateKey("2026-09-07T02:20:00.000Z")).toBe("20260906");
    // An afternoon game the same Eastern day stays on that day.
    expect(toEspnDateKey("2026-09-06T17:00:00.000Z")).toBe("20260906");
  });

  it("keeps the late game and the afternoon game on ONE scoreboard fetch", () => {
    // The whole point: a Sunday slate must collapse to a single Eastern day so
    // the late game is not stranded on a scoreboard nobody requests.
    const { espnKeys } = uniqueScoreboardDates(
      ["2026-09-06T17:00:00Z", "2026-09-06T20:25:00Z", "2026-09-07T00:20:00Z"],
      { maxDays: 5, now: new Date("2026-09-08T12:00:00Z") },
    );
    expect(espnKeys).toEqual(["20260906"]);
  });

  it("dedupes and caps past/today days most-recent first", () => {
    const { espnKeys, isoKeys } = uniqueScoreboardDates(
      [
        "2026-07-01T17:00:00Z",
        "2026-07-03T17:00:00Z",
        "2026-07-01T20:00:00Z",
        "2026-07-10T17:00:00Z",
      ],
      { maxDays: 2, now: new Date("2026-08-06T12:00:00Z") },
    );
    expect(espnKeys).toEqual(["20260710", "20260703"]);
    expect(isoKeys).toEqual(["2026-07-10", "2026-07-03"]);
  });

  it("does not let future commence days starve past overdue days", () => {
    const { espnKeys } = uniqueScoreboardDates(
      [
        "2026-11-08T17:00:00Z", // future NFL
        "2026-10-12T17:00:00Z",
        "2026-09-10T17:00:00Z",
        "2026-07-15T17:00:00Z", // past overdue oxygen
        "2026-07-20T17:00:00Z",
        "2026-08-01T17:00:00Z",
      ],
      { maxDays: 3, now: new Date("2026-08-06T12:00:00Z") },
    );
    // Past/today only, most recent first — no November/October
    expect(espnKeys).toEqual(["20260801", "20260720", "20260715"]);
    expect(espnKeys.every((k) => k <= "20260806")).toBe(true);
  });

  it("compacts adjacent days into ESPN ranges", () => {
    expect(compactEspnDateRanges(["20260703", "20260701", "20260702", "20260710"])).toEqual([
      "20260701-20260703",
      "20260710",
    ]);
  });
});

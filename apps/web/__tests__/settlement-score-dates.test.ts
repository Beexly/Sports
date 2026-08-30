import { describe, expect, it } from "vitest";
import {
  compactEspnDateRanges,
  toEspnDateKey,
  toIsoDateKey,
  uniqueScoreboardDates,
} from "@/lib/data-sources/settlement-score-dates";

describe("settlement-score-dates", () => {
  it("converts ISO commence times to ESPN YYYYMMDD (UTC)", () => {
    expect(toEspnDateKey("2026-07-15T23:10:00.000Z")).toBe("20260715");
    expect(toIsoDateKey("2026-07-15T23:10:00.000Z")).toBe("2026-07-15");
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

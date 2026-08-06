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

  it("dedupes and caps unique days most-recent first", () => {
    const { espnKeys, isoKeys } = uniqueScoreboardDates(
      [
        "2026-07-01T17:00:00Z",
        "2026-07-03T17:00:00Z",
        "2026-07-01T20:00:00Z",
        "2026-07-10T17:00:00Z",
      ],
      { maxDays: 2 },
    );
    expect(espnKeys).toEqual(["20260710", "20260703"]);
    expect(isoKeys).toEqual(["2026-07-10", "2026-07-03"]);
  });

  it("compacts adjacent days into ESPN ranges", () => {
    expect(compactEspnDateRanges(["20260703", "20260701", "20260702", "20260710"])).toEqual([
      "20260701-20260703",
      "20260710",
    ]);
  });
});

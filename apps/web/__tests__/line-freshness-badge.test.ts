import { describe, expect, it } from "vitest";
import {
  freshestLineTimestamp,
  lineAgeLabel,
} from "@/components/picks/line-freshness-badge";

/**
 * The /picks line-age badge is a public trust surface: it must show the real
 * age of the freshest bookmaker line behind the displayed picks, and must show
 * NOTHING when no real timestamp exists (no fake "just now", per the
 * no-stale-data doctrine).
 */

describe("freshestLineTimestamp", () => {
  it("picks the newest non-null timestamp across picks", () => {
    const picks = [
      { dataFreshnessAt: "2026-07-02T10:00:00.000Z" },
      { dataFreshnessAt: "2026-07-02T12:30:00.000Z" },
      { dataFreshnessAt: "2026-07-02T11:15:00.000Z" },
    ];
    expect(freshestLineTimestamp(picks)).toBe("2026-07-02T12:30:00.000Z");
  });

  it("ignores null and unparseable timestamps", () => {
    const picks = [
      { dataFreshnessAt: null },
      { dataFreshnessAt: "not-a-date" },
      { dataFreshnessAt: "2026-07-02T09:00:00.000Z" },
    ];
    expect(freshestLineTimestamp(picks)).toBe("2026-07-02T09:00:00.000Z");
  });

  it("returns null (badge hidden) when no pick carries a real timestamp", () => {
    expect(freshestLineTimestamp([])).toBeNull();
    expect(freshestLineTimestamp([{ dataFreshnessAt: null }])).toBeNull();
    expect(freshestLineTimestamp([{ dataFreshnessAt: "garbage" }])).toBeNull();
  });
});

describe("lineAgeLabel", () => {
  const at = (iso: string) => Date.parse(iso);
  const base = "2026-07-02T12:00:00.000Z";

  it("formats minutes, mixed hours, and whole hours honestly", () => {
    expect(lineAgeLabel("2026-07-02T11:56:00.000Z", at(base))).toBe("4m ago");
    expect(lineAgeLabel("2026-07-02T09:50:00.000Z", at(base))).toBe("2h 10m ago");
    expect(lineAgeLabel("2026-07-01T10:00:00.000Z", at(base))).toBe("26h ago");
  });

  it("never shows a negative age when clocks skew", () => {
    expect(lineAgeLabel("2026-07-02T12:05:00.000Z", at(base))).toBe(
      "under a minute ago",
    );
  });

  it("returns null for an unparseable timestamp instead of guessing", () => {
    expect(lineAgeLabel("nope", at(base))).toBeNull();
  });
});

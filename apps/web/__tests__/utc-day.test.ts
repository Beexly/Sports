/**
 * utcDayBounds — the shared "today" every board surface must use (T-board-utc
 * + Codex round on #94: two loaders on ONE page computing different days).
 */
import { describe, expect, it } from "vitest";
import { utcDayBounds } from "@/lib/time/utc-day";

describe("utcDayBounds", () => {
  it("bounds are the UTC calendar day, [start, end)", () => {
    const { start, end } = utcDayBounds(new Date("2026-07-11T23:59:59.999Z"));
    expect(start.toISOString()).toBe("2026-07-11T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-07-12T00:00:00.000Z");
  });

  it("one millisecond across UTC midnight is the NEXT day regardless of host TZ", () => {
    const before = utcDayBounds(new Date("2026-07-11T23:59:59.999Z"));
    const after = utcDayBounds(new Date("2026-07-12T00:00:00.000Z"));
    expect(after.start.getTime()).toBe(before.end.getTime());
  });
});

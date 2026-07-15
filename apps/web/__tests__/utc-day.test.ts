import { describe, expect, it } from "vitest";
import { utcDayBounds } from "@/lib/time/utc-day";

describe("utcDayBounds", () => {
  it("returns a half-open UTC calendar day", () => {
    const bounds = utcDayBounds(new Date("2026-07-11T23:59:59.999Z"));

    expect(bounds.start.toISOString()).toBe("2026-07-11T00:00:00.000Z");
    expect(bounds.end.toISOString()).toBe("2026-07-12T00:00:00.000Z");
  });

  it("advances exactly at UTC midnight", () => {
    const before = utcDayBounds(new Date("2026-07-11T23:59:59.999Z"));
    const after = utcDayBounds(new Date("2026-07-12T00:00:00.000Z"));

    expect(after.start.getTime()).toBe(before.end.getTime());
  });
});

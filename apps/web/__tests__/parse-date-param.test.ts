import { describe, it, expect } from "vitest";
import { parseDateParam } from "@/lib/parse-date-param";

describe("parseDateParam", () => {
  it("parses a valid ISO date", () => {
    const d = parseDateParam("2026-04-10");
    expect(Number.isNaN(d.getTime())).toBe(false);
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(3); // April, 0-indexed
  });

  it("falls back to a valid date when the param is missing", () => {
    expect(Number.isNaN(parseDateParam(null).getTime())).toBe(false);
    expect(Number.isNaN(parseDateParam(undefined).getTime())).toBe(false);
  });

  it("never returns an Invalid Date for unparseable input", () => {
    for (const bad of ["garbage", "2026-13-45", "", "not-a-date", "2026-99"]) {
      expect(Number.isNaN(parseDateParam(bad).getTime())).toBe(false);
    }
  });
});

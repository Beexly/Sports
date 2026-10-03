import { describe, expect, it } from "vitest";
import {
  BREAK_EVEN_MINUS_110,
  edgeClearsPosted,
  postedBreakEven,
} from "../props-juice-floor.js";

describe("postedBreakEven", () => {
  it("is 110/210 at −110, not a rounded 0.52", () => {
    expect(postedBreakEven(-110)).toBeCloseTo(BREAK_EVEN_MINUS_110, 12);
    expect(postedBreakEven(-110)).toBeCloseTo(110 / 210, 12);
    expect(postedBreakEven(-110)).toBeGreaterThan(0.52);
    expect(postedBreakEven(-110)).toBeLessThan(0.525);
  });

  it("is 0.5 at even money and lower on a plus price", () => {
    expect(postedBreakEven(100)).toBeCloseTo(0.5, 12);
    expect(postedBreakEven(150)).toBeCloseTo(100 / 250, 12);
  });

  it("rejects a zero American", () => {
    expect(() => postedBreakEven(0)).toThrow(RangeError);
  });
});

describe("edgeClearsPosted", () => {
  it("a 51% model does not clear −110 even if e = p − 0.5 looks positive", () => {
    const r = edgeClearsPosted(0.51, -110);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected ok");
    expect(r.clears).toBe(false);
    expect(r.surplus).toBeLessThan(0);
    expect(r.priced).toBe(false);
  });

  it("a 53% model clears −110", () => {
    const r = edgeClearsPosted(0.53, -110);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected ok");
    expect(r.clears).toBe(true);
    expect(r.surplus).toBeGreaterThan(0);
  });

  it("refuses a missing price instead of treating q as the floor", () => {
    const r = edgeClearsPosted(0.6, Number.NaN);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected denied");
    expect(r.refuse).toBe("bad_price");
  });
});

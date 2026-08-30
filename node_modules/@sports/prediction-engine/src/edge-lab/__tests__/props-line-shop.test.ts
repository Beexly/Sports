import { describe, expect, it } from "vitest";
import { BREAK_EVEN_MINUS_110 } from "../props-juice-floor.js";
import { LINE_SHOP_METHOD_TAG, shopPostedPrices } from "../props-line-shop.js";

describe("shopPostedPrices", () => {
  it("picks the softer juice when the same p fails the stiff book", () => {
    const r = shopPostedPrices(0.52, [
      { book: "stiff", american: -110 },
      { book: "soft", american: -105 },
    ]);
    expect(LINE_SHOP_METHOD_TAG).toBe("props_line_shop_v1");
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected ok");
    expect(r.book).toBe("soft");
    expect(r.clears).toBe(true);
    expect(r.surplus).toBeGreaterThan(0);
    expect(r.priced).toBe(false);
  });

  it("a 51% model clears neither −110 nor −105", () => {
    const r = shopPostedPrices(0.51, [
      { book: "a", american: -110 },
      { book: "b", american: -105 },
    ]);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected denied");
    expect(r.refuse).toBe("none_clear");
    expect(r.considered).toBe(2);
  });

  it("prefers the larger surplus, not first book in the list", () => {
    const r = shopPostedPrices(0.55, [
      { book: "minus110", american: -110 },
      { book: "plus100", american: 100 },
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected ok");
    expect(r.book).toBe("plus100");
    expect(r.surplus).toBeCloseTo(0.55 - 0.5, 12);
    expect(0.55 - BREAK_EVEN_MINUS_110).toBeLessThan(r.surplus);
  });

  it("refuses an empty list and a bad p", () => {
    const empty = shopPostedPrices(0.6, []);
    expect(empty.ok).toBe(false);
    if (empty.ok) throw new Error("expected denied");
    expect(empty.refuse).toBe("no_books");
    const badP = shopPostedPrices(Number.NaN, [{ book: "a", american: -110 }]);
    expect(badP.ok).toBe(false);
    if (badP.ok) throw new Error("expected denied");
    expect(badP.refuse).toBe("bad_p");
  });
});

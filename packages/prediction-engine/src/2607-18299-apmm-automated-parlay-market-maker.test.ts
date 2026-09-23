/**
 * Vitest suite for arXiv:2607.18299 (APMM: Automated Parlay Market Maker).
 * Gate: Gate (ADAPT): the correlation-discount mechanism is real and quantified (0.6%-6.2% trader price improvement by order, pooled 0.978; near-zero aggregate maker loss in replay). Improvement: fit the hierarchy on NFL same-game props instead of NBA and extend to order-3 interactions.
 */
import { describe, it, expect } from "vitest";
import { sgpFairPrice, correlationDiscount, hubThrottle } from "./2607-18299-apmm-automated-parlay-market-maker";

describe("2607-18299 APMM correlation-aware SGP pricing", () => {
  const legs = [
    { id: "qb250", p: 0.6 },
    { id: "wr80", p: 0.5 },
  ];
  it("matches independence without interactions", () => {
    expect(sgpFairPrice(legs, new Map())).toBeCloseTo(0.3, 12);
    expect(correlationDiscount(legs, new Map())).toBeCloseTo(0, 12);
  });
  it("positive correlation interaction raises the fair price", () => {
    const thetas = new Map([["qb250|wr80", 0.2]]);
    expect(sgpFairPrice(legs, thetas)).toBeGreaterThan(0.3);
    expect(correlationDiscount(legs, thetas)).toBeLessThan(0);
    expect(() => sgpFairPrice([], thetas)).toThrow();
    expect(() => sgpFairPrice([{ id: "x", p: 0 }], thetas)).toThrow();
  });
  it("hub throttle shrinks stakes under concentrated exposure", () => {
    expect(hubThrottle(100, 0)).toBeCloseTo(100, 10);
    expect(hubThrottle(100, 1)).toBeCloseTo(50, 10);
    expect(() => hubThrottle(-1, 0)).toThrow();
  });
});

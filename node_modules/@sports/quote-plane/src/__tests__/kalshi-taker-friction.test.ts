import { describe, expect, it } from "vitest";
import {
  KALSHI_TAKER_FEE_RATE,
  KALSHI_TAKER_METHOD_TAG,
  kalshiTakerFee,
  kalshiTakerFeeRoundedCents,
  noTakerBreakEven,
  pricePmAgainstTakerFriction,
  yesTakerBreakEven,
} from "../kalshi-taker-friction";

describe("kalshiTakerFee", () => {
  it("peaks at 0.07/4 when P=0.5 (the 175 bp the mid pretends is edge)", () => {
    expect(kalshiTakerFee(0.5)).toBeCloseTo(KALSHI_TAKER_FEE_RATE * 0.25, 12);
    expect(kalshiTakerFee(0.5)).toBeCloseTo(0.0175, 12);
  });

  it("is symmetric around 0.5 and vanishes at the rails", () => {
    expect(kalshiTakerFee(0.2)).toBeCloseTo(kalshiTakerFee(0.8), 12);
    expect(kalshiTakerFee(0.01)).toBeLessThan(kalshiTakerFee(0.5));
    expect(kalshiTakerFee(0.99)).toBeLessThan(0.001);
  });

  it("scales linearly in contracts", () => {
    expect(kalshiTakerFee(0.4, 10)).toBeCloseTo(10 * kalshiTakerFee(0.4), 12);
  });

  it("rejects non-unit prices and non-positive contracts", () => {
    expect(() => kalshiTakerFee(0)).toThrow(RangeError);
    expect(() => kalshiTakerFee(1)).toThrow(RangeError);
    expect(() => kalshiTakerFee(0.5, 0)).toThrow(RangeError);
  });

  it("cent-rounds 1-contract peak to 2 cents without substituting that into q", () => {
    expect(kalshiTakerFeeRoundedCents(0.5)).toBe(2);
    expect(kalshiTakerFee(0.5)).toBeLessThan(0.02);
  });
});

describe("yes/no taker break-even", () => {
  it("YES break-even is ask plus the fee on that ask, not the mid", () => {
    const be = yesTakerBreakEven(0.52);
    expect(be.side).toBe("yes");
    expect(be.posted).toBe(0.52);
    expect(be.fee).toBeCloseTo(kalshiTakerFee(0.52), 12);
    expect(be.breakEven).toBeCloseTo(0.52 + kalshiTakerFee(0.52), 12);
    expect(be.breakEven).toBeGreaterThan(0.52);
  });

  it("NO break-even is (1-bid) plus the fee on that posted NO price", () => {
    const be = noTakerBreakEven(0.47);
    expect(be.side).toBe("no");
    expect(be.posted).toBeCloseTo(0.53, 12);
    expect(be.fee).toBeCloseTo(kalshiTakerFee(0.53), 12);
    expect(be.breakEven).toBeCloseTo(0.53 + kalshiTakerFee(0.53), 12);
  });
});

describe("pricePmAgainstTakerFriction", () => {
  it("refuses mid-only / missing two-way instead of fee-adjusting a last trade", () => {
    const r = pricePmAgainstTakerFriction(0.62, null);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected unpriced");
    expect(r.refuse).toBe("missing_two_way");
    expect(r.priced).toBe(false);
    expect(r.methodTag).toBe(KALSHI_TAKER_METHOD_TAG);
  });

  it("refuses inverted and out-of-range books", () => {
    expect(pricePmAgainstTakerFriction(0.55, { bid: 0.6, ask: 0.55 }).ok).toBe(false);
    expect(pricePmAgainstTakerFriction(1.4, { bid: 0.48, ask: 0.5 }).ok).toBe(false);
    expect(pricePmAgainstTakerFriction(0.55, { bid: 0, ask: 0.5 }).ok).toBe(false);
  });

  it("a 51% model vs a 50-cent book has no taker edge — the fee ate it", () => {
    const r = pricePmAgainstTakerFriction(0.51, { bid: 0.49, ask: 0.51 });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected unpriced");
    expect(r.refuse).toBe("fee_dominates");
  });

  it("fires YES when independent p clears ask + fee", () => {
    const ask = 0.4;
    const need = ask + kalshiTakerFee(ask);
    const r = pricePmAgainstTakerFriction(need + 0.03, { bid: 0.38, ask });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected priced");
    expect(r.side).toBe("yes");
    expect(r.edge).toBeCloseTo(0.03, 12);
    expect(r.priced).toBe(false);
  });

  it("fires NO when independent p is low enough to clear 1-bid + fee", () => {
    const bid = 0.62;
    const noPosted = 1 - bid;
    const need = noPosted + kalshiTakerFee(noPosted);
    const pYes = 1 - (need + 0.04);
    const r = pricePmAgainstTakerFriction(pYes, { bid, ask: 0.64 });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected priced");
    expect(r.side).toBe("no");
    expect(r.edge).toBeCloseTo(0.04, 12);
  });

  it("does not fire both sides of a tight two-way", () => {
    const yes = pricePmAgainstTakerFriction(0.7, { bid: 0.48, ask: 0.5 });
    const no = pricePmAgainstTakerFriction(0.3, { bid: 0.48, ask: 0.5 });
    const bothYes = yes.ok && no.ok && yes.ok && no.ok && yes.side === "yes" && no.side === "yes";
    expect(bothYes).toBe(false);
    expect(yes.ok && no.ok && yes.side === no.side).toBe(false);
  });
});

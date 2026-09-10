import { describe, expect, it } from "vitest";
import type { OddsApiBookmaker } from "@sports/types";
import {
  applyKalshiTakerFeeToAmericanPrice,
  applyKalshiTakerFeeToBookmakers,
  americanToImpliedPrice,
  kalshiEffectiveAskPrice,
  kalshiTakerFeeDollars,
} from "../kalshi-fee.js";

/**
 * Kalshi: `fees = ceil(0.07 * C * P * (1 - P))`, rounded UP to the next whole
 * cent; effective per-contract cost is `P + fee/C`. Every expectation below is
 * worked by hand in its own comment — the arithmetic is the assertion.
 */
describe("kalshiTakerFeeDollars / kalshiEffectiveAskPrice", () => {
  it("value 1 — C=1, P=0.50: 0.07 * 1 * 0.50 * 0.50 = $0.0175 = 1.75c, ceil 2c = $0.02; effective 0.50 + 0.02 = 0.52", () => {
    expect(kalshiTakerFeeDollars(0.5, 1)).toBeCloseTo(0.02, 10);
    expect(kalshiEffectiveAskPrice(0.5, 1)).toBeCloseTo(0.52, 10);
  });

  it("value 2 — C=1, P=0.90: 0.07 * 1 * 0.90 * 0.10 = $0.0063 = 0.63c, ceil 1c = $0.01; effective 0.90 + 0.01 = 0.91", () => {
    expect(kalshiTakerFeeDollars(0.9, 1)).toBeCloseTo(0.01, 10);
    expect(kalshiEffectiveAskPrice(0.9, 1)).toBeCloseTo(0.91, 10);
  });

  it("value 3 — C=100, P=0.60: 0.07 * 100 * 0.60 * 0.40 = $1.68 = 168c exactly, ceil 168c = $1.68; per contract 1.68/100 = 0.0168, effective 0.6168", () => {
    // Binary floating point evaluates the cent form as 168.00000000000003; a
    // raw ceil would charge 169c. The exact fee is 168c and this pins it.
    expect(kalshiTakerFeeDollars(0.6, 100)).toBeCloseTo(1.68, 10);
    expect(kalshiEffectiveAskPrice(0.6, 100)).toBeCloseTo(0.6168, 10);
  });

  it("refuses rather than invents a fee outside the 0..1 price band", () => {
    expect(Number.isNaN(kalshiTakerFeeDollars(0, 1))).toBe(true);
    expect(Number.isNaN(kalshiTakerFeeDollars(1, 1))).toBe(true);
    expect(Number.isNaN(kalshiTakerFeeDollars(0.5, 0))).toBe(true);
    expect(Number.isNaN(kalshiTakerFeeDollars(Number.NaN, 1))).toBe(true);
  });
});

describe("americanToImpliedPrice", () => {
  it("maps -100 to 0.50 and +150 to 0.40", () => {
    expect(americanToImpliedPrice(-100)).toBeCloseTo(0.5, 12);
    expect(americanToImpliedPrice(150)).toBeCloseTo(0.4, 12);
  });

  it("returns NaN for a price no book quotes", () => {
    expect(Number.isNaN(americanToImpliedPrice(0))).toBe(true);
    expect(Number.isNaN(americanToImpliedPrice(Number.NaN))).toBe(true);
  });
});

describe("applyKalshiTakerFeeToAmericanPrice", () => {
  it("-100 (P=0.50) becomes the taker-inclusive 0.52 = -108", () => {
    // 0.50 -> fee 2c -> 0.52 -> -(100*0.52)/(1-0.52) = -108.3333…,
    // which probToAmerican rounds to the whole American price -108.
    expect(applyKalshiTakerFeeToAmericanPrice(-100)).toBe(-108);
  });

  it("+150 (P=0.40) becomes the taker-inclusive 0.42 = +138", () => {
    // 0.40 -> 0.07*0.40*0.60 = $0.0168 = 1.68c, ceil 2c -> 0.42
    // -> (100*(1-0.42))/0.42 = +138.0952…, rounded to +138.
    expect(applyKalshiTakerFeeToAmericanPrice(150)).toBe(138);
  });

  it("always moves the price against the taker, never in their favour", () => {
    for (const american of [-500, -220, -110, -100, 105, 150, 400]) {
      const adjusted = applyKalshiTakerFeeToAmericanPrice(american);
      expect(americanToImpliedPrice(adjusted)).toBeGreaterThan(americanToImpliedPrice(american));
    }
  });

  it("returns the input unchanged when the fee is not computable", () => {
    expect(applyKalshiTakerFeeToAmericanPrice(0)).toBe(0);
    expect(applyKalshiTakerFeeToAmericanPrice(Number.NaN)).toBeNaN();
  });
});

describe("applyKalshiTakerFeeToBookmakers", () => {
  function book(key: string, price: number): OddsApiBookmaker {
    return {
      key,
      title: key,
      last_update: "2026-09-09T12:00:00.000Z",
      markets: [
        {
          key: "h2h",
          last_update: "2026-09-09T12:00:00.000Z",
          outcomes: [
            { name: "Chiefs", price },
            { name: "Bills", price: 100 },
          ],
        },
      ],
    };
  }

  it("restates only the kalshi book and leaves sportsbook prices identical", () => {
    const out = applyKalshiTakerFeeToBookmakers([book("kalshi", -100), book("draftkings", -100)]);
    expect(out[0]!.markets[0]!.outcomes[0]!.price).toBe(-108);
    expect(out[1]!.markets[0]!.outcomes[0]!.price).toBe(-100);
  });

  it("leaves an unpriced outcome unpriced rather than minting a price", () => {
    const unpriced: OddsApiBookmaker = {
      key: "kalshi",
      title: "kalshi",
      last_update: "2026-09-09T12:00:00.000Z",
      markets: [
        {
          key: "spreads",
          last_update: "2026-09-09T12:00:00.000Z",
          outcomes: [
            { name: "Chiefs", point: -3.5 },
            { name: "Bills", point: 3.5, price: -110 },
          ],
        },
      ],
    };
    const out = applyKalshiTakerFeeToBookmakers([unpriced]);
    expect(out[0]!.markets[0]!.outcomes[0]!.price).toBeUndefined();
    // -110 -> decimal 1.909090…, P = 0.5238095; fee 0.07*0.5238095*0.4761905
    // = $0.017460… = 1.746c, ceil 2c -> 0.5438095 -> -119.20… -> -119.
    expect(out[0]!.markets[0]!.outcomes[1]!.price).toBe(-119);
  });

  it("does not mutate its input", () => {
    const input = [book("kalshi", -100)];
    applyKalshiTakerFeeToBookmakers(input);
    expect(input[0]!.markets[0]!.outcomes[0]!.price).toBe(-100);
  });
});

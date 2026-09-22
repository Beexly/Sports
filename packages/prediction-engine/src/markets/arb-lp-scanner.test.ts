/**
 * Desirability-based arbitrage scanner — tests (arXiv 1901.03645).
 *
 * ACCEPTANCE GATE: scanner reproduces the naive arb test; stakes sum to 1;
 * guaranteed payout is outcome-independent; promo evaluator is +EV on a
 * realistic promo and the hedge locks a floor.
 */
import { describe, expect, it } from "vitest";
import {
  americanToDecimal,
  evaluatePromo,
  hedgedPromoValue,
  impliedProb,
  scanArb,
} from "./arb-lp-scanner";

describe("americanToDecimal / impliedProb", () => {
  it("converts both signs and inverts", () => {
    expect(americanToDecimal(110)).toBeCloseTo(2.1, 12);
    expect(americanToDecimal(-110)).toBeCloseTo(1.9090909, 6);
    expect(impliedProb(2)).toBeCloseTo(0.5, 12);
    expect(() => americanToDecimal(0)).toThrow();
    expect(() => impliedProb(1)).toThrow();
  });
});

describe("scanArb", () => {
  it("finds a cross-book two-way arb with the LP stake allocation", () => {
    const r = scanArb([
      { book: "A", american: [120, -140] },
      { book: "B", american: [100, 120] },
    ])!;
    // Best: A @2.2 on outcome 0, B @2.2 on outcome 1.
    expect(r.invSum).toBeCloseTo(1 / 2.2 + 1 / 2.2, 10);
    expect(r.invSum).toBeLessThan(1);
    expect(r.stakes.reduce((a, s) => a + s, 0)).toBeCloseTo(1, 12);
    expect(r.roi).toBeCloseTo(1 / r.invSum - 1, 12);
    // Guaranteed payout is outcome-independent: stake_i * odds_i equal.
    const payouts = r.stakes.map((s, i) => s * (r.legs[i] as { decimal: number }).decimal);
    expect(Math.abs((payouts[0] as number) - (payouts[1] as number))).toBeLessThan(1e-9);
    expect(r.legs[0]?.book).toBe("A");
    expect(r.legs[1]?.book).toBe("B");
  });

  it("returns null when no arb exists (standard -110/-110 menu)", () => {
    expect(
      scanArb([
        { book: "A", american: [-110, -110] },
        { book: "B", american: [-110, -110] },
      ]),
    ).toBeNull();
  });

  it("handles three-way outcomes and degenerate input", () => {
    const r = scanArb([
      { book: "A", american: [200, 200, 200] },
      { book: "B", american: [210, 190, 205] },
    ])!;
    expect(r.legs.length).toBe(3);
    expect(r.invSum).toBeLessThan(1);
    expect(scanArb([])).toBeNull();
    expect(() => scanArb([{ book: "A", american: [110, -110] }, { book: "B", american: [110] }])).toThrow();
  });
});

describe("evaluatePromo / hedgedPromoValue", () => {
  it("assigns positive extraction value to a realistic bet-get promo", () => {
    // Bet $25 at -110, get $50 in bonus bets.
    const ev = evaluatePromo({ stake: 25, stakeOddsAmerican: -110, bonusBet: 50 });
    expect(ev).toBeGreaterThan(0);
  });

  it("a pure qualifying bet at fair odds is ~zero EV before the coupon", () => {
    const ev = evaluatePromo({ stake: 100, stakeOddsAmerican: 100, bonusBet: 0 });
    expect(ev).toBeCloseTo(0, 6);
  });

  it("hedge locks a worst-case floor including coupon value", () => {
    const promo = { stake: 25, stakeOddsAmerican: -110, bonusBet: 50 };
    const { hedgeStake, worstCase } = hedgedPromoValue(promo, 1.95);
    expect(hedgeStake).toBeGreaterThan(0);
    // Worst case ~= coupon value minus hedging friction.
    expect(worstCase).toBeGreaterThan(20);
  });

  it("throws on invalid promo terms", () => {
    expect(() => evaluatePromo({ stake: 0, stakeOddsAmerican: -110, bonusBet: 10 })).toThrow();
    expect(() => evaluatePromo({ stake: 10, stakeOddsAmerican: -110, bonusBet: -5 })).toThrow();
  });
});

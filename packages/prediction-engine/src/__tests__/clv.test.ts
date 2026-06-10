import { describe, it, expect } from "vitest";
import {
  computeClv,
  computeClvPositiveRate,
  clvBetSideFor,
} from "../clv.js";

describe("computeClv — line CLV sign convention", () => {
  // HOME spread: home line is from home perspective; bettor wants MORE points.
  // Bet at +3, closes at +1 → secured +2 extra points → POSITIVE.
  it("home spread that gained points is CLV-positive", () => {
    const r = computeClv({ betSide: "HOME", betLine: 3, closingLine: 1 });
    expect(r.clvPoints).toBe(2);
    expect(r.clvPositive).toBe(true);
  });

  it("home spread that lost points is CLV-negative", () => {
    const r = computeClv({ betSide: "HOME", betLine: 1, closingLine: 3 });
    expect(r.clvPoints).toBe(-2);
    expect(r.clvPositive).toBe(false);
  });

  // AWAY spread: away line = -homeLine. Bet home -3 (away +3), closes home -5
  // (away +5) → away pick gained a point → POSITIVE.
  it("away spread that gained points is CLV-positive", () => {
    const r = computeClv({ betSide: "AWAY", betLine: -3, closingLine: -5 });
    expect(r.clvPoints).toBe(2);
    expect(r.clvPositive).toBe(true);
  });

  it("away spread that lost points is CLV-negative", () => {
    const r = computeClv({ betSide: "AWAY", betLine: -5, closingLine: -3 });
    expect(r.clvPoints).toBe(-2);
    expect(r.clvPositive).toBe(false);
  });

  // OVER wants a LOWER total. Bet 48, closes 50 → cheaper number → POSITIVE.
  it("over total at a lower number than close is CLV-positive", () => {
    const r = computeClv({ betSide: "OVER", betLine: 48, closingLine: 50 });
    expect(r.clvPoints).toBe(2);
    expect(r.clvPositive).toBe(true);
  });

  // UNDER wants a HIGHER total. Bet 50, closes 48 → POSITIVE.
  it("under total at a higher number than close is CLV-positive", () => {
    const r = computeClv({ betSide: "UNDER", betLine: 50, closingLine: 48 });
    expect(r.clvPoints).toBe(2);
    expect(r.clvPositive).toBe(true);
  });

  it("no line movement yields exactly zero (not positive)", () => {
    const r = computeClv({ betSide: "HOME", betLine: 2.5, closingLine: 2.5 });
    expect(r.clvPoints).toBe(0);
    // zero is NOT a win against the close
    expect(r.clvPositive).toBe(false);
  });

  it("rounds to 2 decimals", () => {
    const r = computeClv({ betSide: "HOME", betLine: 3.555, closingLine: 1 });
    expect(r.clvPoints).toBe(2.56);
  });
});

describe("computeClv — price CLV (moneyline cents)", () => {
  // +150 → closes +130. Bet payout 150 per 100, close 130 → +20 cents POSITIVE.
  it("positive-odds price that beat the close is CLV-positive", () => {
    const r = computeClv({ betSide: "HOME", betPrice: 150, closingPrice: 130 });
    expect(r.clvCents).toBe(20);
    expect(r.clvPositive).toBe(true);
  });

  // -110 → closes -105. Bet payout ≈ 90.91, close ≈ 95.24 → negative.
  it("favorite that shortened (worse price) is CLV-negative", () => {
    const r = computeClv({ betSide: "HOME", betPrice: -110, closingPrice: -105 });
    expect(r.clvCents).toBeLessThan(0);
    expect(r.clvPositive).toBe(false);
  });

  // Crossing the ±100 boundary must stay monotonic: -110 → +100 is better.
  it("price improving across the +100 boundary is CLV-positive", () => {
    const r = computeClv({ betSide: "AWAY", betPrice: 100, closingPrice: -110 });
    // profitPer100(+100)=100 ; profitPer100(-110)≈90.91 → +9.09
    expect(r.clvCents).toBeGreaterThan(0);
    expect(r.clvPositive).toBe(true);
  });
});

describe("computeClv — line preferred over price for the verdict", () => {
  it("uses line axis for clvPositive even when price disagrees", () => {
    // line says positive (+2), price says negative — verdict follows the line.
    const r = computeClv({
      betSide: "HOME",
      betLine: 3,
      closingLine: 1,
      betPrice: -120,
      closingPrice: -110,
    });
    expect(r.clvPoints).toBe(2);
    expect(r.clvCents).toBeLessThan(0);
    expect(r.clvPositive).toBe(true); // line axis wins
  });

  it("falls back to price axis when no line is present", () => {
    const r = computeClv({ betSide: "AWAY", betPrice: 200, closingPrice: 150 });
    expect(r.clvPoints).toBeNull();
    expect(r.clvCents).toBe(50);
    expect(r.clvPositive).toBe(true);
  });
});

describe("computeClv — null when the comparison can't be made honestly", () => {
  it("returns all-null when closing line is missing", () => {
    const r = computeClv({ betSide: "HOME", betLine: 3, closingLine: null });
    expect(r.clvPoints).toBeNull();
    expect(r.clvCents).toBeNull();
    expect(r.clvPositive).toBeNull();
  });

  it("returns all-null when bet line is missing", () => {
    const r = computeClv({ betSide: "HOME", betLine: undefined, closingLine: 1 });
    expect(r).toEqual({ clvPoints: null, clvCents: null, clvPositive: null });
  });

  it("returns all-null when nothing is provided", () => {
    const r = computeClv({ betSide: "OVER" });
    expect(r).toEqual({ clvPoints: null, clvCents: null, clvPositive: null });
  });

  it("forces all-null when the closing snapshot is stale (limit-down/thin)", () => {
    const r = computeClv({
      betSide: "HOME",
      betLine: 3,
      closingLine: 1, // would be +2 if fresh
      betPrice: 150,
      closingPrice: 130,
      isStale: true,
    });
    expect(r).toEqual({ clvPoints: null, clvCents: null, clvPositive: null });
  });

  it("treats NaN/Infinity lines as missing", () => {
    expect(computeClv({ betSide: "HOME", betLine: NaN, closingLine: 1 }).clvPoints).toBeNull();
    expect(
      computeClv({ betSide: "HOME", betLine: 3, closingLine: Infinity }).clvPoints
    ).toBeNull();
  });
});

describe("computeClvPositiveRate — rolling rate honesty", () => {
  it("counts only picks with a non-null verdict", () => {
    const rate = computeClvPositiveRate([
      { clvPositive: true, clvComputedAt: new Date() },
      { clvPositive: false, clvComputedAt: new Date() },
      { clvPositive: true, clvComputedAt: new Date() },
      { clvPositive: null }, // missing/stale close — excluded from denominator
      { clvPositive: undefined }, // not computed — excluded
    ]);
    expect(rate.sampleSize).toBe(3);
    expect(rate.positiveCount).toBe(2);
    expect(rate.clvPositiveRate).toBeCloseTo(66.7, 1);
  });

  it("returns a null rate (not 0) for an empty sample", () => {
    const rate = computeClvPositiveRate([]);
    expect(rate.sampleSize).toBe(0);
    expect(rate.positiveCount).toBe(0);
    expect(rate.clvPositiveRate).toBeNull();
  });

  it("returns a null rate when every pick lacks a verdict", () => {
    const rate = computeClvPositiveRate([{ clvPositive: null }, { clvPositive: null }]);
    expect(rate.sampleSize).toBe(0);
    expect(rate.clvPositiveRate).toBeNull();
  });

  it("computes 100% when all graded picks beat the close", () => {
    const rate = computeClvPositiveRate([
      { clvPositive: true },
      { clvPositive: true },
    ]);
    expect(rate.clvPositiveRate).toBe(100);
  });
});

describe("clvBetSideFor — mirrors settlement side derivation", () => {
  it("maps totals by OVER/UNDER prefix", () => {
    expect(clvBetSideFor("TOTAL", "OVER 48.5", "Chiefs")).toBe("OVER");
    expect(clvBetSideFor("TOTAL", "UNDER 48.5", "Chiefs")).toBe("UNDER");
  });

  it("maps spread/moneyline to HOME when selection names the home team", () => {
    expect(clvBetSideFor("SPREAD", "Chiefs -3.5", "Chiefs")).toBe("HOME");
    expect(clvBetSideFor("MONEYLINE", "Chiefs ML", "Chiefs")).toBe("HOME");
  });

  it("maps to AWAY when selection does not name the home team", () => {
    expect(clvBetSideFor("SPREAD", "Raiders +3.5", "Chiefs")).toBe("AWAY");
  });
});

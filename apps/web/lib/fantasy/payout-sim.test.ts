/** Deterministic fixture tests for payout-sim. No randomness: fixed seeds + hand fixtures. */
import { describe, expect, it } from "vitest";
import {
  flatPayoutTable,
  mulberry32,
  payoutForRank,
  rankScore,
  simulateFieldScores,
  simulatePortfolio,
  topHeavyPayoutTable,
} from "./payout-sim";

describe("flat payout table", () => {
  it("pays equal multiples to the top N, zero beyond", () => {
    const t = flatPayoutTable(3, 2);
    expect(t.paidSpots).toBe(3);
    expect([1, 2, 3].map((r) => payoutForRank(r, t))).toEqual([2, 2, 2]);
    expect(payoutForRank(4, t)).toBe(0);
  });

  it("rejects invalid ranks", () => {
    const t = flatPayoutTable(3, 2);
    expect(payoutForRank(0, t)).toBe(0);
    expect(payoutForRank(-1, t)).toBe(0);
    expect(payoutForRank(1.5, t)).toBe(0);
  });
});

describe("top-heavy payout table", () => {
  it("decays from the top prize and pays nothing past paidSpots", () => {
    const t = topHeavyPayoutTable(5, 100, 2, 1.5);
    expect(t.paidSpots).toBe(5);
    expect(payoutForRank(1, t)).toBe(100);
    expect(payoutForRank(2, t)).toBe(50);
    expect(payoutForRank(3, t)).toBe(25);
    expect(payoutForRank(1, t)).toBeGreaterThan(payoutForRank(5, t));
    expect(payoutForRank(6, t)).toBe(0);
  });

  it("floors prizes at minMult", () => {
    const t = topHeavyPayoutTable(6, 8, 2, 1.5);
    // 8,4,2,1.5(floored),1.5,1.5
    expect(payoutForRank(4, t)).toBe(1.5);
    expect(payoutForRank(6, t)).toBe(1.5);
  });
});

describe("field simulation determinism", () => {
  it("same seed reproduces the same field; different seed differs", () => {
    const a = simulateFieldScores(50, 150, 20, 7);
    const b = simulateFieldScores(50, 150, 20, 7);
    const c = simulateFieldScores(50, 150, 20, 8);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect(a).toHaveLength(50);
  });

  it("mulberry32 is deterministic", () => {
    const r1 = mulberry32(123);
    const r2 = mulberry32(123);
    expect([r1(), r1(), r1()]).toEqual([r2(), r2(), r2()]);
  });

  it("zero sd yields a constant field at the mean", () => {
    expect(simulateFieldScores(4, 150, 0, 1)).toEqual([150, 150, 150, 150]);
  });
});

describe("ranking", () => {
  it("ranks 1-based with ties sharing the best rank", () => {
    expect(rankScore(30, [10, 20, 30])).toBe(1);
    expect(rankScore(20, [10, 20, 30])).toBe(2);
    expect(rankScore(5, [10, 20, 30])).toBe(4);
  });
});

describe("portfolio ROI fixture (hand-computed)", () => {
  // Table: rank1 -> 10x, rank2 -> 5x. Field [10,20,30]. Fee 1.
  // Portfolio [25]  -> rank 2 -> payout 5  -> profit +4, roi +4, ITM 1
  // Portfolio [5]   -> rank 4 -> payout 0  -> profit −1, roi −1, ITM 0
  // Portfolio [25,5]-> invested 2, returned 5 -> roi 1.5, ITM 0.5
  const table = topHeavyPayoutTable(2, 10, 2, 1);

  it("single winner: roi +4, ITM 1", () => {
    const r = simulatePortfolio([25], [10, 20, 30], table, 1);
    expect(r.perLineup[0].rank).toBe(2);
    expect(r.perLineup[0].payout).toBe(5);
    expect(r.roi).toBeCloseTo(4, 10);
    expect(r.itmRate).toBe(1);
  });

  it("single loser: roi −1, ITM 0", () => {
    const r = simulatePortfolio([5], [10, 20, 30], table, 1);
    expect(r.perLineup[0].rank).toBe(4);
    expect(r.perLineup[0].payout).toBe(0);
    expect(r.roi).toBeCloseTo(-1, 10);
    expect(r.itmRate).toBe(0);
  });

  it("mixed portfolio: roi 1.5, ITM 0.5, sane ROI distribution", () => {
    const r = simulatePortfolio([25, 5], [10, 20, 30], table, 1);
    expect(r.invested).toBe(2);
    expect(r.returned).toBe(5);
    expect(r.roi).toBeCloseTo(1.5, 10);
    expect(r.itmRate).toBe(0.5);
    expect(r.roiDist.min).toBeCloseTo(-1, 10);
    expect(r.roiDist.max).toBeCloseTo(4, 10);
    expect(r.roiDist.mean).toBeCloseTo(1.5, 10);
    expect(r.roiDist.p50).toBeCloseTo(1.5, 10);
  });

  it("empty portfolio guards divide-by-zero", () => {
    const r = simulatePortfolio([], [10, 20, 30], table, 1);
    expect(r.roi).toBe(0);
    expect(r.itmRate).toBe(0);
    expect(r.invested).toBe(0);
  });

  it("end-to-end vs simulated field is deterministic", () => {
    const field = simulateFieldScores(200, 150, 20, 99);
    const flat = flatPayoutTable(100, 2);
    const a = simulatePortfolio([170, 130, 150], field, flat, 10);
    const b = simulatePortfolio([170, 130, 150], field, flat, 10);
    expect(a).toEqual(b);
    expect(a.invested).toBe(30);
    expect(a.itmRate).toBeGreaterThanOrEqual(0);
    expect(a.itmRate).toBeLessThanOrEqual(1);
  });
});

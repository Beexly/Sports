import { describe, expect, it } from "vitest";
import {
  dynamicPageRank,
  marginWeight,
  ratingToWinProb,
  updateDynamicRating,
} from "./dynamic-network-rating";

describe("dynamic-network-rating", () => {
  it("margin weight has diminishing returns", () => {
    expect(marginWeight(3)).toBeCloseTo(Math.log(4), 12);
    expect(marginWeight(28) / marginWeight(14)).toBeLessThan(2);
    expect(() => marginWeight(0)).toThrow();
  });

  it("winner gains, loser loses, September wins decay", () => {
    const before = [1500, 1500, 1500, 1500];
    const after = updateDynamicRating(before, [{ winner: 0, loser: 1, margin: 10 }]);
    expect(after[0]!).toBeGreaterThan(before[0]! * (1 - 1 / 52));
    expect(after[1]!).toBeLessThan(before[1]!);
    // untouched teams only decay
    expect(after[2]).toBeCloseTo(before[2]! * (1 - 1 / 52), 12);
  });

  it("rejects bad input", () => {
    expect(() => updateDynamicRating([], [])).toThrow("empty");
    expect(() =>
      updateDynamicRating([1500, 1500], [{ winner: 0, loser: 5, margin: 3 }]),
    ).toThrow("out of range");
  });

  it("PageRank converges to a distribution favoring the dominant team", () => {
    // 3 teams, team 0 beats everyone every week: edges loser -> winner,
    // so rows 1 and 2 point at column 0.
    const week = [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 0],
    ];
    const pr = dynamicPageRank([week, week], 8, 0.85, 200);
    expect(pr.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(pr[0]!).toBeGreaterThan(pr[1]!);
    expect(pr[0]!).toBeGreaterThan(pr[2]!);
  });

  it("ratingToWinProb maps 0 diff to 0.5", () => {
    expect(ratingToWinProb(0)).toBeCloseTo(0.5, 12);
    expect(ratingToWinProb(400)).toBeGreaterThan(0.9);
  });
});


import { describe, expect, it } from "vitest";
import { brierLoss, greedyComplementarity } from "./greedy-portfolio";

describe("greedy-portfolio", () => {
  it("selects complementary configs over individually-best ones", () => {
    const y = [1, 0, 1, 0];
    // Two specialists with complementary blind spots vs one hedged generalist:
    // p0 nails games 0-2 but hedges game 3; p1 nails games 1-3 but hedges game 0;
    // p2 is decent everywhere yet individually worse than either specialist's trio,
    // so greedy picks p0 first and then p1 for its complementary coverage.
    const p0 = [1, 0, 1, 0.5];
    const p1 = [0.5, 0, 1, 0];
    const p2 = [0.7, 0.3, 0.7, 0.3];
    const sel = greedyComplementarity([p0, p1, p2], y, 2);
    expect(sel).toEqual([0, 1]);
  });
  it("returns at most k configs", () => {
    const y = [1, 0];
    expect(greedyComplementarity([[1, 0], [0.9, 0.1]], y, 5).length).toBe(2);
  });
  it("edge cases: empty table or k<=0", () => {
    expect(greedyComplementarity([], [1], 3)).toEqual([]);
    expect(greedyComplementarity([[1]], [1], 0)).toEqual([]);
  });
  it("brierLoss is squared error", () => {
    expect(brierLoss(0.7, 1)).toBeCloseTo(0.09, 10);
  });
});

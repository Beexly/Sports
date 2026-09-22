import { describe, expect, it } from "vitest";
import { selectTrainingSet, davedGatePasses, GSE_DAVED_ENABLED } from "./data-market-selector-2403.js";

describe("data market selector", () => {
  it("selects by value-per-cost under budget", () => {
    const pool = [
      { gameId: "g1", value: 10, cost: 5 }, // 2.0
      { gameId: "g2", value: 9, cost: 3 },  // 3.0
      { gameId: "g3", value: 100, cost: 50 }, // 2.0 but over budget after g2
    ];
    const s = selectTrainingSet(pool, 10);
    expect(s.selected[0]).toBe("g2");
    expect(s.totalCost).toBeLessThanOrEqual(10);
  });
  it("skips non-positive value or cost", () => {
    const s = selectTrainingSet([{ gameId: "g1", value: -1, cost: 2 }, { gameId: "g2", value: 5, cost: 0 }], 10);
    expect(s.selected).toEqual([]);
  });
  it("gate needs mean >= 0.003 and >= 10 winning weeks", () => {
    expect(davedGatePasses(Array(17).fill(0.005))).toBe(true);
    expect(davedGatePasses(Array(9).fill(0.01).concat(Array(8).fill(-0.01)))).toBe(false);
    expect(davedGatePasses([])).toBe(false);
  });
  it("stays off until the 2024 backtest clears", () => {
    expect(GSE_DAVED_ENABLED).toBe(false);
  });
});


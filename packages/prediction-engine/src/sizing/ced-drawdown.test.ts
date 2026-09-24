import { describe, expect, it } from "vitest";
import {
  conditionalExpectedDrawdown,
  cumulative,
  drawdownTriggerStakeScale,
  eulerDrawdownAttribution,
  maxDrawdown,
  rollingDrawdowns,
} from "./ced-drawdown";

describe("ced-drawdown", () => {
  it("maxDrawdown measures the worst peak-to-trough slide", () => {
    expect(maxDrawdown([1, 3, 2, 5, 1])).toBeCloseTo(4, 10); // 5 -> 1
    expect(maxDrawdown([1, 2, 3])).toBe(0);
    expect(maxDrawdown([])).toBe(0);
  });

  it("CED_0.9 averages the worst 10% of path drawdowns", () => {
    const dds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 100];
    expect(conditionalExpectedDrawdown(dds, 0.9)).toBeCloseTo(100, 10);
    expect(conditionalExpectedDrawdown([], 0.9)).toBe(0);
    expect(() => conditionalExpectedDrawdown(dds, 1)).toThrow();
  });

  it("Euler attribution identifies the concentrated drawdown source", () => {
    const cats = [
      { category: "spread", pnl: [1, 1, 1, 1] },
      { category: "total", pnl: [0, 0, -50, 0] }, // the drawdown source
    ];
    const attr = eulerDrawdownAttribution(cats, 0.9);
    expect(attr).toHaveLength(2);
    const total = attr.find((a) => a.category === "total");
    expect(total!.share).toBeGreaterThan(0.5); // concentrated source
  });

  it("drawdown trigger cuts stakes above the threshold", () => {
    expect(drawdownTriggerStakeScale(0.35, 0.3)).toBeCloseTo(0.25, 12);
    expect(drawdownTriggerStakeScale(0.2, 0.3)).toBe(1);
    expect(() => drawdownTriggerStakeScale(0.4, -1)).toThrow();
  });

  it("cumulative and rollingDrawdowns behave on degenerate input", () => {
    expect(cumulative([])).toEqual([]);
    expect(rollingDrawdowns([])).toEqual([]);
    expect(rollingDrawdowns([5])).toEqual([0]);
  });
});

import { describe, expect, it } from "vitest";
import { diagnoseStage, costReduction, wallClockReduction, tuningGatePasses } from "./build-tuner-2309.js";

describe("build tuning controller", () => {
  it("flags a skewed stage and recommends a partition lift", () => {
    const d = diagnoseStage({ stage: "pbp-join", taskDurationsMs: [100, 110, 95, 1200], spillBytes: 5e6, idleExecutorMs: 300 });
    expect(d.skew).toBeGreaterThanOrEqual(3);
    expect(d.skewed).toBe(true);
    expect(d.recommendation).toContain("binary-lift partitions");
  });
  it("passes a healthy stage", () => {
    const d = diagnoseStage({ stage: "odds-pull", taskDurationsMs: [100, 105, 98, 102], spillBytes: 0, idleExecutorMs: 10 });
    expect(d.skewed).toBe(false);
  });
  it("handles empty task durations", () => {
    const d = diagnoseStage({ stage: "x", taskDurationsMs: [], spillBytes: 0, idleExecutorMs: 0 });
    expect(d.skew).toBe(1);
    expect(d.skewed).toBe(false);
  });
  it("computes the 25% adoption gate on cost or wall-clock", () => {
    expect(tuningGatePasses(costReduction(100, 70), wallClockReduction(60, 55))).toBe(true);
    expect(tuningGatePasses(costReduction(100, 90), wallClockReduction(60, 40))).toBe(true);
    expect(tuningGatePasses(costReduction(100, 90), wallClockReduction(60, 55))).toBe(false);
    expect(costReduction(0, 50)).toBe(0);
  });
});


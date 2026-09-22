import { describe, expect, it } from "vitest";
import { modelCost, experimentSpend, costPer100Prompts, reconciles, promptoGatePasses } from "./prompto-harness-2408.js";

describe("prompto harness", () => {
  it("prices tokens in/out separately", () => {
    expect(modelCost({ model: "m", tokensIn: 2000, tokensOut: 500, costPer1kIn: 1, costPer1kOut: 4 })).toBeCloseTo(4, 10);
  });
  it("aggregates per-model spend and counts drops", () => {
    const s = experimentSpend(
      [
        { runId: "1", model: "a", tokensIn: 1000, tokensOut: 0, latencyMs: 10, dropped: false },
        { runId: "2", model: "a", tokensIn: 1000, tokensOut: 0, latencyMs: 10, dropped: true },
      ],
      { a: { in: 2, out: 0 } },
    );
    expect(s.totalCost).toBeCloseTo(2, 10);
    expect(s.dropped).toBe(1);
  });
  it("cost per 100 prompts scales linearly", () => {
    expect(costPer100Prompts(5, 200)).toBeCloseTo(2.5, 10);
    expect(costPer100Prompts(5, 0)).toBe(0);
  });
  it("reconciliation needs 1%", () => {
    expect(reconciles(100, 100.5)).toBe(true);
    expect(reconciles(100, 110)).toBe(false);
    expect(reconciles(0, 0)).toBe(true);
  });
  it("gate needs 5x speedup, zero drops, reconciled spend", () => {
    expect(promptoGatePasses(5000, 800, 0, 100, 100.2)).toBe(true);
    expect(promptoGatePasses(5000, 2000, 0, 100, 100.2)).toBe(false);
    expect(promptoGatePasses(5000, 800, 1, 100, 100.2)).toBe(false);
  });
  it("handles empty input", () => {
    const s = experimentSpend([], { m: { in: 1, out: 2 } });
    expect(s.totalCost).toBe(0);
    expect(s.perModel).toEqual({});
    expect(s.dropped).toBe(0);
    expect(costPer100Prompts(10, 0)).toBe(0);
  });
  it("handles edge inputs", () => {
    // unknown model rates default to zero cost, not NaN
    const s = experimentSpend(
      [{ runId: "r", model: "ghost", tokensIn: 1000, tokensOut: 500, latencyMs: 10, dropped: false }],
      {},
    );
    expect(s.totalCost).toBe(0);
    // zero invoice reconciles only with zero tracked
    expect(reconciles(0, 0)).toBe(true);
    expect(reconciles(1, 0)).toBe(false);
    // zero async time never passes the speedup gate
    expect(promptoGatePasses(5000, 0, 0, 0, 0)).toBe(false);
  });
});


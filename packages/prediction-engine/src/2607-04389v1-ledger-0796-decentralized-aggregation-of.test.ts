/**
 * Vitest suite for arXiv:2607.04389v1 (Ledger 0796 — Decentralized Aggregation of LLM Predictions via Wagering Mechanisms (WALLA)).
 * Gate: Season-2 backtest: advantage-aligned aggregation must beat equal-weight aggregation by ≥ 1.5% Brier score and achieve D-Regret ≤ 30% of the equal-weight gap to oracle before production. DM test at 5%.
 */
import { describe, it, expect } from "vitest";
import { advantageWeight, linearPool, dRegret } from "./2607-04389v1-ledger-0796-decentralized-aggregation-of";

describe("2607-04389v1 WALLA advantage-aligned aggregation", () => {
  it("upweights sources beating the leave-one-out pool", () => {
    const good = advantageWeight({ source: "a", brier: 0.15, poolBrier: 0.25 }, 0.1);
    const bad = advantageWeight({ source: "b", brier: 0.3, poolBrier: 0.25 }, 0.1);
    expect(good).toBeCloseTo(0.5, 10);
    expect(bad).toBe(0);
    expect(() => advantageWeight({ source: "a", brier: 0.1, poolBrier: 0.2 }, 0)).toThrow();
  });
  it("linear pool is the weight-normalized average", () => {
    const p = linearPool(
      new Map([["a", 0.7], ["b", 0.5]]),
      new Map([["a", 3], ["b", 1]]),
    );
    expect(p).toBeCloseTo(0.65, 10);
    expect(() => linearPool(new Map(), new Map())).toThrow();
  });
  it("D-Regret is 0 at oracle, 1 at equal-weight", () => {
    expect(dRegret(0.2, 0.3, 0.2)).toBeCloseTo(0, 10);
    expect(dRegret(0.3, 0.3, 0.2)).toBeCloseTo(1, 10);
  });
});

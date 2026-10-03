/**
 * Vitest suite for arXiv:2608.00666 (Executable Arbitrage and Market Efficiency in Prediction Markets).
 * Gate: Adapt the executable-edge framework (Eqs. 2-4, depth-aware, fee-adjusted, direction-aware) as GSE's standard for cross-market arb monitoring — it replaces a naive mid-price-sum bound check, which this paper shows overstates opportunity. Reject settlement-based basket strategies as a GSE product: $32k total across the entire sample says the capital lock-up is not worth it.
 */
import { describe, it, expect } from "vitest";
import { executableEdge, naiveMidBound } from "./2608-00666-executable-arbitrage-and-market-efficiency";

describe("2608-00666 executable arbitrage framework", () => {
  it("finds executable edges net of fees and depth", () => {
    const legs = [
      { price: 0.48, depth: 100, direction: 1 as const },
      { price: 0.55, depth: 50, direction: -1 as const }, // sell at 0.55
    ];
    const { edge, maxSize } = executableEdge(legs, 0.005);
    expect(edge).toBeCloseTo(0.48 - 0.55 - 0.02, 10);
    expect(maxSize).toBe(50);
  });
  it("returns -Infinity when a leg has no depth", () => {
    const legs = [
      { price: 0.48, depth: 0, direction: 1 as const },
      { price: 0.55, depth: 50, direction: -1 as const },
    ];
    expect(executableEdge(legs, 0).edge).toBe(-Infinity);
    expect(() => executableEdge([], 0)).toThrow();
  });
  it("naive bound overstates vs the executable edge", () => {
    // mids sum to 0.97 -> naive says 3% edge; executable says less after fees
    expect(naiveMidBound(0.48, 0.49)).toBeCloseTo(0.03, 10);
  });
});

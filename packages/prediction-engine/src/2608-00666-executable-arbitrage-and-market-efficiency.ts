/**
 * arXiv:2608.00666 — Executable Arbitrage and Market Efficiency in Prediction Markets
 *
 * Executable arbitrage framework (Eqs. 2-4): depth-aware, fee-adjusted, direction-aware edge computation
 * replacing the naive mid-price-sum bound check; alerts fire only on protocol-executable edges.
 *
 * Improvement: Replace any naive mid-price-sum bound check in GSE's cross-market arb monitoring with the depth-aware, fee-adjusted, direction-aware executable-edge framework (Eqs. 2-4), alerting only on protocol-executable edges where GSE can actually trade both legs.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Adapt the executable-edge framework (Eqs. 2-4, depth-aware, fee-adjusted, direction-aware) as GSE's standard for cross-market arb monitoring — it replaces a naive mid-price-sum bound check, which this paper shows overstates opportunity. Reject settlement-based basket strategies as a GSE product: $32k total across the entire sample says the capital lock-up is not worth it.
 */

/** One leg of a cross-market arb with depth. */
export interface ArbLeg {
  /** Price you can actually trade (ask to buy / bid to sell). */
  price: number;
  /** Executable depth at that price. */
  depth: number;
  /** 1 = buy, -1 = sell (direction-aware). */
  direction: 1 | -1;
}

/**
 * Executable edge: sum over legs of direction*price at the minimum depth,
 * minus fees on both sides. Positive = executable arb.
 */
export function executableEdge(
  legs: readonly ArbLeg[],
  feePerLeg: number,
): { edge: number; maxSize: number } {
  if (legs.length === 0) throw new Error("executableEdge: no legs");
  const maxSize = Math.min(...legs.map((l) => l.depth));
  if (maxSize <= 0) return { edge: -Infinity, maxSize: 0 };
  let edge = 0;
  for (const l of legs) {
    if (l.price <= 0) throw new Error("executableEdge: price > 0");
    edge += l.direction * l.price;
  }
  edge -= 2 * feePerLeg * legs.length;
  return { edge, maxSize };
}

/** Naive mid-price-sum bound (the overstating comparator). */
export function naiveMidBound(midA: number, midB: number): number {
  return 1 - (midA + midB);
}

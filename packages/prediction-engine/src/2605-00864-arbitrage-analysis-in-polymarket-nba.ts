/**
 * arXiv:2605.00864 — Arbitrage Analysis in Polymarket NBA Markets
 *
 * Polymarket NFL arb monitor at top-of-book cadence: single-market (Ask_Yes + Ask_No < 1.00) and
 * combinatorial (ML-vs-spread synthetic-short) dislocations with mirrored-liquidity dedup, producing a
 * nightly market-sharpness digest.
 *
 * Improvement: Run a standing Polymarket NFL arb monitor at ~4s top-of-book cadence: flag single-market (Ask_Yes + Ask_No < 1.00) and combinatorial (ML-vs-spread synthetic-short) dislocations with mirrored-liquidity dedup, producing a nightly 'market sharpness' efficiency digest that GSE's own probabilities are measured against.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Adopt the monitor as a standing benchmark if, on 4 weeks of 2026 NFL Polymarket data, it detects ≥1 genuine in-game dislocation with measured executable depth while keeping post-game false-positive rate at 0.
 */

/** Top-of-book snapshot for one binary market. */
export interface BookTop {
  marketId: string;
  askYes: number; // in (0,1)
  askNo: number;
  /** Executable depth at the ask (contracts). */
  depthYes: number;
  depthNo: number;
}

/** Single-market dislocation: Ask_Yes + Ask_No < 1 with depth on both legs. */
export function singleMarketDislocation(
  b: BookTop,
  minDepth: number,
): { edge: number; executable: boolean } {
  const sum = b.askYes + b.askNo;
  const edge = 1 - sum;
  const executable = edge > 0 && b.depthYes >= minDepth && b.depthNo >= minDepth;
  return { edge, executable };
}

/**
 * Combinatorial dislocation: synthetic short via spread vs moneyline.
 * mlYes + spreadCoverProb should be ~1 under no-arb; the gap is the edge.
 */
export function syntheticShortDislocation(
  mlAskYes: number,
  spreadImpliedCover: number,
  fee: number,
): number {
  return 1 - (mlAskYes + spreadImpliedCover) - 2 * fee;
}

/** Mirrored-liquidity dedup: same edge seen on both sides counts once. */
export function dedupDislocations(
  edges: readonly { marketId: string; edge: number }[],
): { marketId: string; edge: number }[] {
  const best = new Map<string, number>();
  for (const e of edges) {
    const cur = best.get(e.marketId);
    if (cur === undefined || e.edge > cur) best.set(e.marketId, e.edge);
  }
  return [...best.entries()].map(([marketId, edge]) => ({ marketId, edge }));
}

/**
 * arXiv:2609.06005 — Price Dislocations, News Citations, and Epistemic Leverage on Polymarket
 *
 * Dislocation-plus-impact sharp-flow sensor: detect price dislocations in signed Polymarket/Kalshi trades,
 * estimate impact coefficients, and route next-day consensus-line-direction signals into the
 * market-awareness layer.
 *
 * Improvement: Build a dislocation-plus-impact pipeline over Polymarket/Kalshi NFL signed trades and GSE's own odds-history DB as a sharp-flow sensor: detect price dislocations, estimate impact coefficients, and route next-day consensus-line-direction signals into the engine's market-awareness layer.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Adopt the dislocation + impact pipeline as GSE's sharp-flow sensor if, on 2025 NFL Polymarket data, dislocations flagged by the detector predict next-day line direction (sportsbook consensus move) with hit rate >=55% over >=200 events (binomial p < 0.05 vs 50%); reject if the hit rate is indistinguishable from coin-flip or fewer than 25% of NFL tokens yield detectable impact coefficients.
 */

/** One signed trade with price impact context. */
export interface SignedTrade {
  /** Signed size (+ buy, - sell). */
  size: number;
  /** Price before the trade. */
  priceBefore: number;
  /** Price after the trade. */
  priceAfter: number;
}

/** Dislocation: |price jump| beyond the threshold relative to size. */
export function isDislocation(t: SignedTrade, threshold: number): boolean {
  if (threshold <= 0) throw new Error("isDislocation: threshold > 0");
  return Math.abs(t.priceAfter - t.priceBefore) >= threshold;
}

/**
 * Impact coefficient: OLS of price change on signed size (Kyle's lambda).
 * Returns { lambda, rSquared }.
 */
export function impactCoefficient(
  trades: readonly SignedTrade[],
): { lambda: number; rSquared: number } {
  if (trades.length < 2) throw new Error("impactCoefficient: need >= 2 trades");
  const n = trades.length;
  const mx = trades.reduce((s, t) => s + t.size, 0) / n;
  const my = trades.reduce((s, t) => s + (t.priceAfter - t.priceBefore), 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const t of trades) {
    sxy += (t.size - mx) * (t.priceAfter - t.priceBefore - my);
    sxx += (t.size - mx) ** 2;
    syy += (t.priceAfter - t.priceBefore - my) ** 2;
  }
  if (sxx < 1e-12) throw new Error("impactCoefficient: no size variation");
  const lambda = sxy / sxx;
  return { lambda, rSquared: syy > 0 ? Math.max(0, (sxy * sxy) / (sxx * syy)) : 0 };
}

/**
 * Next-day direction signal: sign of the dislocation-weighted impact flow.
 * Returns +1 (line moves toward home), -1, or 0 (no signal).
 */
export function nextDayDirectionSignal(
  trades: readonly SignedTrade[],
  threshold: number,
): 1 | -1 | 0 {
  const dis = trades.filter((t) => isDislocation(t, threshold));
  if (dis.length === 0) return 0;
  const flow = dis.reduce((s, t) => s + Math.sign(t.size) * Math.abs(t.priceAfter - t.priceBefore), 0);
  return flow > 0 ? 1 : flow < 0 ? -1 : 0;
}

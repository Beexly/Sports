/**
 * arXiv:2607.06166 — When Do Prophets Profit in Prediction Markets?
 *
 * Brier proper-bet sizing: stake w proportional to (p_GSE - q_market) clipped by a liquidity proxy
 * (expected line-move per dollar), with realized CLV decomposed into score gap, divergence payoff, and
 * liquidity cost as the sizing feedback loop.
 *
 * Improvement: Implement Brier proper-bet sizing for GSE's daily card: stake w proportional to (p_GSE - q_market) clipped by a liquidity proxy (expected line-move per dollar from book-count/depth data) instead of flat or Kelly; log per-pick realized CLV decomposed into score gap (accuracy), divergence (disagreement payoff), and liquidity cost as the sizing feedback loop; extend to multi-book shopping with a fourth shopping-bonus term.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADAPT is confirmed if, on the 2024-season backtest, proper-Brier staking beats both flat staking and Kelly on realized ROI with statistical significance (paired bootstrap, 5%) and the three-term decomposition attributes ≥60% of the gain to the score-gap term.
 */

/** Proper-bet sizing inputs for one pick. */
export interface ProperBet {
  pModel: number;
  qMarket: number;
  /** Liquidity proxy: expected line-move per dollar staked. */
  liquidity: number;
  /** Max stake cap. */
  cap: number;
}

/** Stake w = clip((p - q) / liquidity, 0, cap): proper scoring incentive. */
export function properBetStake(b: ProperBet): number {
  if (b.liquidity <= 0 || b.cap <= 0) throw new Error("properBetStake: liquidity, cap > 0");
  return Math.min(b.cap, Math.max(0, (b.pModel - b.qMarket) / b.liquidity));
}

/** Three-term CLV decomposition of one settled pick. */
export interface ClvDecomposition {
  /** Accuracy term: (p - outcome)^2 vs (q - outcome)^2 improvement. */
  scoreGap: number;
  /** Disagreement payoff: stake-weighted (p - q). */
  divergence: number;
  /** Liquidity cost: stake * realized slippage. */
  liquidityCost: number;
}

export function decomposeClv(
  pModel: number,
  qMarket: number,
  outcome: 0 | 1,
  stake: number,
  slippage: number,
): ClvDecomposition {
  const scoreGap = (qMarket - outcome) ** 2 - (pModel - outcome) ** 2;
  const divergence = stake * (pModel - qMarket);
  const liquidityCost = stake * Math.max(0, slippage);
  return { scoreGap, divergence, liquidityCost };
}

/** Net CLV = score gap + divergence - liquidity cost. */
export function netClv(d: ClvDecomposition): number {
  return d.scoreGap + d.divergence - d.liquidityCost;
}

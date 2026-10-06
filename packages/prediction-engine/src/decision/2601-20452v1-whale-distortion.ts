// ============================================================
// Whale-distortion detector + fade-the-whale signal (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the gate
 * below to pass on real walk-forward data, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 2601.20452v1 — "Manipulation in Prediction Markets: An Agent-based Modeling Experiment"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: agent-based modeling of manipulation in prediction
 * markets — a whale-distortion detector estimates the implied whale
 * capital share behind each significant line move (move size relative to
 * typical volume-implied price impact), and a fade-the-whale paper signal
 * takes the opposite side of flagged manipulation moves, on the
 * agent-based finding that manipulation-driven moves revert.
 *
 * IMPROVEMENT (from ledger): GSE adds a whale-distortion detector that estimates implied whale capital share behind each significant line move and a fade-the-whale paper signal that takes the opposite side of flagged manipulation moves.
 *
 * ACCEPTANCE GATE: ADAPT the detector if whale-flagged line moves reverse at a rate >=10 points higher than size-matched unflagged moves over a full season AND the fade-the-whale paper portfolio is profitable after vig.
 */

/**
 * Implied whale capital share: fraction of the line move not explained by
 * typical volume-implied price impact (0..1).
 */
export function impliedWhaleShare(
  lineMovePoints: number,
  typicalMovePerUnitVolume: number,
  observedVolume: number,
): number {
  const expectedMove = typicalMovePerUnitVolume * observedVolume;
  if (expectedMove <= 0) return lineMovePoints > 0 ? 1 : 0;
  const unexplained = Math.max(0, Math.abs(lineMovePoints) - expectedMove);
  return Math.min(1, unexplained / Math.max(Math.abs(lineMovePoints), 1e-12));
}

/** Flag a move as whale-distorted when the implied whale share clears the bar. */
export function flagWhaleMove(whaleShare: number, threshold: number): boolean {
  return whaleShare >= threshold;
}

export interface ReversalStats {
  flaggedReversalRate: number;
  unflaggedReversalRate: number;
  liftPoints: number;
}

/** Reversal-rate lift of flagged vs size-matched unflagged moves. */
export function reversalLift(
  flaggedReversed: number,
  flaggedTotal: number,
  unflaggedReversed: number,
  unflaggedTotal: number,
): ReversalStats {
  const flaggedReversalRate = flaggedTotal > 0 ? flaggedReversed / flaggedTotal : 0;
  const unflaggedReversalRate = unflaggedTotal > 0 ? unflaggedReversed / unflaggedTotal : 0;
  return {
    flaggedReversalRate,
    unflaggedReversalRate,
    liftPoints: (flaggedReversalRate - unflaggedReversalRate) * 100,
  };
}

/** Paper-portfolio net profit after vig for fade-the-whale positions. */
export function paperProfitAfterVig(
  wins: number,
  losses: number,
  avgOddsDecimal: number,
  vigPerBet: number,
): number {
  const n = wins + losses;
  if (n === 0) return 0;
  const gross = wins * (avgOddsDecimal - 1) - losses;
  return gross - n * vigPerBet;
}

export interface WhaleGate {
  liftPoints: number;
  paperProfit: number;
  passes: boolean;
}

/**
 * Acceptance-gate helper: flagged moves reverse ≥10pp more than
 * size-matched unflagged moves AND the paper portfolio is profitable
 * after vig.
 */
export function whaleGatePasses(
  flaggedReversed: number,
  flaggedTotal: number,
  unflaggedReversed: number,
  unflaggedTotal: number,
  paperWins: number,
  paperLosses: number,
  avgOddsDecimal: number,
  vigPerBet: number,
): WhaleGate {
  const { liftPoints } = reversalLift(flaggedReversed, flaggedTotal, unflaggedReversed, unflaggedTotal);
  const paperProfit = paperProfitAfterVig(paperWins, paperLosses, avgOddsDecimal, vigPerBet);
  return { liftPoints, paperProfit, passes: liftPoints >= 10 && paperProfit > 0 };
}

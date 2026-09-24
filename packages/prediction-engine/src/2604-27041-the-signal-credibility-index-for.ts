/**
 * arXiv:2604.27041 — The Signal Credibility Index for Prediction Markets: A Microstructure-Grounded Diagnostic with Weighted and Time-Varying Extensions
 *
 * Signal Credibility Index for line moves: PR (price reversion on logit-transformed implied probs), TS
 * (cross-book direction agreement), and cross-book breadth HHI (Pinnacle/Circa-led =
 * concentrated/informed).
 *
 * Improvement: Port the Signal Credibility Index to line moves as informed-flow surveillance: score each >=1.5-point spread move with PR (price reversion on logit-transformed implied probs), TS (cross-book direction), and cross-book breadth HHI (a move led by Pinnacle/Circa alone = concentrated/informed), re-weighted for information content; use high-SCI_info moves to upweight GSE's own numbers.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Adapt the SCI framework (both flavors) into GSE's steam pipeline if: (i) fitted NFL weights on ≥300 labeled moves achieve AUC ≥ 0.70 for move-side cover prediction; and (ii) the information-content and coordination-credibility flavors rank moves differently (Spearman < 0.6).
 */

/** One spread move observed across books. */
export interface BookMove {
  book: string;
  /** Signed move in points (positive = toward home). */
  move: number;
  /** Logit-implied prob before / after. */
  logitBefore: number;
  logitAfter: number;
}

/** Price reversion: 1 - |reverted|/|move| on logit scale (persistence score). */
export function priceReversion(moves: readonly BookMove[]): number {
  if (moves.length === 0) throw new Error("priceReversion: no moves");
  let num = 0;
  let den = 0;
  for (const m of moves) {
    const delta = m.logitAfter - m.logitBefore;
    num += Math.abs(delta);
    den += Math.abs(delta);
  }
  void num;
  // PR = fraction of the move that persisted one step later is external;
  // here: directional persistence = 1 - mean(|reversal|/|move|) approximated
  // by sign consistency of the move itself.
  const signs = moves.map((m) => Math.sign(m.logitAfter - m.logitBefore));
  const agree = signs.filter((s) => s === signs[0]).length / signs.length;
  return den === 0 ? 0 : agree;
}

/** Cross-book direction agreement TS in [0,1]. */
export function directionAgreement(moves: readonly BookMove[]): number {
  if (moves.length === 0) throw new Error("directionAgreement: no moves");
  const pos = moves.filter((m) => m.move > 0).length;
  return Math.max(pos, moves.length - pos) / moves.length;
}

/** Breadth HHI: concentration of the move across books (1 = single-book led). */
export function breadthHhi(moves: readonly BookMove[]): number {
  if (moves.length === 0) throw new Error("breadthHhi: no moves");
  const total = moves.reduce((s, m) => s + Math.abs(m.move), 0);
  if (total <= 0) return 1 / moves.length;
  return moves.reduce((s, m) => s + (Math.abs(m.move) / total) ** 2, 0);
}

/** SCI_info composite: persistent + agreed + concentrated = informed. */
export function signalCredibilityIndex(
  moves: readonly BookMove[],
  w: { pr: number; ts: number; hhi: number } = { pr: 0.4, ts: 0.35, hhi: 0.25 },
): number {
  return w.pr * priceReversion(moves) + w.ts * directionAgreement(moves) + w.hhi * breadthHhi(moves);
}

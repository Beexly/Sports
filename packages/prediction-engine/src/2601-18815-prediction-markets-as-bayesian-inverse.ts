/**
 * arXiv:2601.18815 — Prediction Markets as Bayesian Inverse Problems: Uncertainty Quantification, Identifiability, and Information Gain from Price–Volume Histories under Latent Types
 *
 * Information-gain-weighted CLV: each line move's contribution to the CLV edge is weighted by its
 * information gain (KL of post-move vs pre-move implied distribution); games flagged non-identifiable are
 * excluded from fair-price updates — CLV hygiene, not new alpha.
 *
 * Improvement: GSE weights its CLV edge aggregation by an information-gain measure of each line move, down-weighting noise-driven moves and refusing to update fair prices from games whose line history is flagged non-identifiable — CLV hygiene infrastructure, not a new alpha.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADAPT confirmed if IG-weighted CLV beats unweighted CLV on 2025 NFL holdout by >=2% log-loss with the identifiability flag firing on 5-30% of games.
 */

/** One line move with pre/post implied probabilities. */
export interface LineMove {
  gameId: string;
  /** Implied win prob before the move. */
  pBefore: number;
  /** Implied win prob after the move. */
  pAfter: number;
  /** Realized CLV on this move (model prob - close prob). */
  clv: number;
}

/** Binary KL divergence (the information-gain weight). */
export function infoGain(pBefore: number, pAfter: number): number {
  const c = (p: number) => Math.min(1 - 1e-9, Math.max(1e-9, p));
  const a = c(pBefore);
  const b = c(pAfter);
  return b * Math.log(b / a) + (1 - b) * Math.log((1 - b) / (1 - a));
}

/**
 * Identifiability flag: a game's line history is non-identifiable when total
 * information gain is below the noise floor (moves carry no signal).
 */
export function identifiabilityFlag(
  moves: readonly LineMove[],
  noiseFloor: number,
): boolean {
  const total = moves.reduce((s, m) => s + infoGain(m.pBefore, m.pAfter), 0);
  return total < noiseFloor; // true = non-identifiable, do not update
}

/** IG-weighted mean CLV over identifiable games only. */
export function igWeightedClv(
  moves: readonly LineMove[],
  noiseFloor: number,
): { clv: number; flagged: number } {
  const byGame = new Map<string, LineMove[]>();
  for (const m of moves) {
    const arr = byGame.get(m.gameId) ?? [];
    arr.push(m);
    byGame.set(m.gameId, arr);
  }
  let num = 0;
  let den = 0;
  let flagged = 0;
  for (const [, gm] of byGame) {
    if (identifiabilityFlag(gm, noiseFloor)) { flagged++; continue; }
    for (const m of gm) {
      const w = infoGain(m.pBefore, m.pAfter);
      num += w * m.clv;
      den += w;
    }
  }
  return { clv: den > 0 ? num / den : 0, flagged };
}

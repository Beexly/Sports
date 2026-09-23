/**
 * arXiv:2605.00459 — Information Leakage at Population Scale: An Evaluation of the Polymarket Insider-Relevant Subpopulation, 2020–2026
 *
 * Pre-close drift share (NFL ILS analog): each game-week's line-movement share before vs after public
 * anchors (injury report, inactives) with a hazard-decay correction for natural drift toward close;
 * anchor-robust early-drift scores feed the informed-flow suite.
 *
 * Improvement: Build an NFL ILS analog ('pre-close drift share'): compute each game-week's line movement share before vs. after public anchors (injury report release, inactive list) with a hazard-decay correction for natural drift toward close, and feed anchor-robust early-drift scores into GSE's informed-flow suite.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Adapt the ILS framework into GSE's steam/informed-flow suite if: (i) the anchor-robust subset shows a drift-share/cover correlation significant at p < 0.05 on 2024–2025 NFL; and (ii) the anchor-robustness gate filters out ≥50% of raw flagged games.
 */

/** One line-move observation with timing relative to anchors. */
export interface TimedMove {
  /** Hours before close (positive). */
  hoursBeforeClose: number;
  /** Signed move magnitude (points). */
  magnitude: number;
  /** True if the move happened after the last public anchor. */
  postAnchor: boolean;
}

/**
 * Hazard-decay weight: exp((h/H)^2). Moves far before close (early, natural
 * drift) are upweighted exponentially relative to late moves, which are more
 * likely informed/anchor-driven. As H -> Infinity all moves weigh ~1.
 */
export function hazardDecayWeight(hoursBeforeClose: number, halfLifeHrs: number): number {
  if (halfLifeHrs <= 0) throw new Error("hazardDecayWeight: halfLifeHrs > 0");
  const r = Math.max(0, hoursBeforeClose) / halfLifeHrs;
  return Math.exp(r * r);
}

/**
 * Anchor-robust pre-close drift share: hazard-weighted early (pre-anchor)
 * drift over total hazard-weighted drift.
 */
export function driftShare(moves: readonly TimedMove[], halfLifeHrs: number): number {
  if (moves.length === 0) throw new Error("driftShare: no moves");
  let early = 0;
  let total = 0;
  for (const m of moves) {
    const w = hazardDecayWeight(m.hoursBeforeClose, halfLifeHrs) * Math.abs(m.magnitude);
    total += w;
    if (!m.postAnchor) early += w;
  }
  return total > 0 ? early / total : 0;
}

/** Anchor-robustness gate: keep only games where post-anchor drift is small. */
export function anchorRobustFilter(
  games: readonly { gameId: string; moves: TimedMove[] }[],
  halfLifeHrs: number,
  maxPostAnchorShare: number,
): string[] {
  return games
    .filter((g) => 1 - driftShare(g.moves, halfLifeHrs) <= maxPostAnchorShare)
    .map((g) => g.gameId);
}

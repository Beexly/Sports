/**
 * arXiv:2510.18193v2 — FST.ai 2.0: An Explainable AI Ecosystem for Fair, Fast, and Inclusive Decision-Making in Olympic and Paralympic Taekwondo
 *
 * GSE abstention policy: skip publishing when the ensemble disagrees (Rashomon-style) or the calibrated
 * edge is below the cost-aware threshold; the policy maximizes long-run ROI, not pick volume.
 *
 * Improvement: GSE gates X auto-posting on a credal rule: a pick posts automatically only if the lower bound of its probability interval clears tau (~0.55); otherwise it routes to the analyst approve-desk — an explainable auto-post filter with a full audit log.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Adopt the credal pick gate only if backtesting on the 2024 season shows >=2pp ROI improvement on auto-posted picks vs unfiltered posting AND >=60% of picks still clear the gate; REJECT if the interval estimates are miscalibrated.
 */

/** Inputs to the publish/skip decision for one game. */
export interface AbstentionInputs {
  /** Ensemble agreement share (0..1). */
  agreement: number;
  /** Calibrated edge estimate. */
  edge: number;
  /** Estimated transaction/vig cost of the bet. */
  cost: number;
}

/**
 * Publish only if agreement >= agreeFloor AND edge - cost >= edgeFloor.
 * Otherwise abstain (skip publishing).
 */
export function shouldPublish(inp: AbstentionInputs, agreeFloor: number, edgeFloor: number): boolean {
  if (inp.agreement < 0 || inp.agreement > 1) throw new Error("shouldPublish: agreement in [0,1]");
  return inp.agreement >= agreeFloor && inp.edge - inp.cost >= edgeFloor;
}

/**
 * Long-run ROI of a publish policy on resolved games:
 * mean(edge - cost) over published games; NaN if nothing published.
 */
export function policyRoi(
  games: readonly AbstentionInputs[],
  agreeFloor: number,
  edgeFloor: number,
): number {
  const published = games.filter((g) => shouldPublish(g, agreeFloor, edgeFloor));
  if (published.length === 0) return NaN;
  return published.reduce((s, g) => s + (g.edge - g.cost), 0) / published.length;
}

/**
 * Grid-search the (agreeFloor, edgeFloor) policy maximizing ROI on history.
 */
export function tuneAbstention(
  games: readonly AbstentionInputs[],
  agreeGrid: readonly number[],
  edgeGrid: readonly number[],
): { agreeFloor: number; edgeFloor: number; roi: number } {
  let best = { agreeFloor: agreeGrid[0] ?? 0.5, edgeFloor: edgeGrid[0] ?? 0, roi: -Infinity };
  for (const a of agreeGrid) {
    for (const e of edgeGrid) {
      const roi = policyRoi(games, a, e);
      if (!Number.isNaN(roi) && roi > best.roi) best = { agreeFloor: a, edgeFloor: e, roi };
    }
  }
  return best;
}

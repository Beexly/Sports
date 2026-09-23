/**
 * arXiv 2003.01712v1: Player Chemistry: Striving for a Perfectly Balanced Soccer Team
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * NFL JOI stack metric: per QB-pass-catcher pair, sum EPA of consecutive-play sequences where both touch the ball plus drive-level co-production, normalized per dropback together -> JOI/dropback; unseen pairs predicted with gradient boosting on pair features for DFS stacking and props.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Build the NFL JOI stack metric: per QB-pass-catcher pair, sum EPA of consecutive-play sequences where both touch the ball plus drive-level co-production, normalized per dropback together -> JOI/dropback; predict unseen pairs with gradient boosting on pair features and use predicted JOI for DFS stacking and props.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT the JOI stack metric iff (a) predicted JOI achieves Spearman rho >= 0.40 vs actual next-season JOI/dropback on unseen pairs, AND (b) top-decile-JOI stacks outscore baseline stacks by >= 5% in the DFS backtest (paired t, p < 0.05).
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Hermes | bucket: MODEL | lane: props_dfs | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

export interface PairSequence {
  pairId: string;
  dropbacksTogether: number;
  jointEpa: number;
}

/** JOI/dropback: joint production per shared dropback for a QB-pass-catcher pair. */
export function joiPerDropback(jointEpa: number, dropbacksTogether: number): number {
  return dropbacksTogether <= 0 ? 0 : jointEpa / dropbacksTogether;
}

/** Signed synergy network edges from co-presence regime regressions. */
export function synergyEdge(
  jointMean: number,
  soloMeanA: number,
  soloMeanB: number,
  se: number,
): { edge: number; z: number } {
  const edge = jointMean - (soloMeanA + soloMeanB) / 2;
  return { edge, z: se > 0 ? edge / se : 0 };
}

/** Rank pairs by predicted JOI for DFS stacking. */
export function rankStackPairs(pairs: PairSequence[]): PairSequence[] {
  return [...pairs].sort(
    (a, b) => joiPerDropback(b.jointEpa, b.dropbacksTogether) - joiPerDropback(a.jointEpa, a.dropbacksTogether),
  );
}

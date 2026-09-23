/**
 * arXiv:2505.08342 — Optimal Prize Design in Parallel Rank-order Contests
 *
 * Contest-routing by field skill-share: the x(phi) sorting simulation estimates each contest's
 * skilled-player share from the payout structure, routing entries to soft fields with duplicated-core /
 * leveraged lineups.
 *
 * Improvement: Add a contest-routing layer to GSE's DFS play that selects GPPs by estimated field skill-share from the x(φ) sorting simulation, then extend the model with the missing multi-entry margin (each contestant chooses contest plus #entries with convex costs) to test whether pros buying 150 entries reverses the soft-field ranking — opening a quantitative case for selective GPP shots with duplicated-core/leveraged lineups rather than blanket avoidance.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADAPT if the offline replay shows routed contest selection beating uniform GPP entry by ≥5 pp ROI over 4 weeks AND the x(φ) sorting simulation reproduces the known qualitative pattern (top-heavy large-field GPPs concentrate the highest estimated skill share).
 */

/**
 * x(phi) sorting simulation: given a payout structure's top-heaviness,
 * simulate the sorting of skilled vs casual entrants. Returns the estimated
 * skilled share of the field.
 */
export function skillShare(
  topHeavy: number, // 0..1: share of prize pool to top 1%
  fieldSize: number,
  skillSensitivity: number,
  rng: () => number,
): number {
  if (topHeavy < 0 || topHeavy > 1) throw new Error("skillShare: topHeavy in [0,1]");
  if (fieldSize <= 0) throw new Error("skillShare: fieldSize > 0");
  // Skilled entrants are attracted by top-heaviness; simulate entry choices.
  let skilled = 0;
  const n = Math.min(fieldSize, 2000);
  for (let i = 0; i < n; i++) {
    const skill = rng(); // entrant skill quantile
    const entryProb = 1 / (1 + Math.exp(-skillSensitivity * (topHeavy - 0.5 + (skill - 0.5))));
    if (rng() < entryProb && skill > 0.7) skilled++;
  }
  const entered = n; // all simulated entrants enter some contest
  return skilled / entered;
}

/**
 * Route a bankroll across contests: score = (1 - skillShare) * overlay -
 * feeDrag; allocate proportionally to positive scores.
 */
export function routeBankroll(
  contests: readonly { id: string; skillShare: number; overlay: number; fee: number }[],
): Map<string, number> {
  const scores = contests.map((c) => ({
    id: c.id,
    score: Math.max(0, (1 - c.skillShare) * c.overlay - c.fee),
  }));
  const z = scores.reduce((s, x) => s + x.score, 0);
  const out = new Map<string, number>();
  for (const { id, score } of scores) out.set(id, z > 0 ? score / z : 1 / scores.length);
  return out;
}

/**
 * arXiv:2607.11548v1 — Training-Free Off-Screen Player Imputation for Broadcast-Based Spatial Football Analytics
 *
 * Training-free off-screen player imputation (B4 baseline): role-anchored centroid voting imputes unseen
 * players at their role centroid, benchmarked against the ignore policy on decision-relevant metrics
 * (pre-snap box count, receiver separation at throw).
 *
 * Improvement: Implement role-anchored centroid-voting imputation (the paper's B4 training-free baseline) as the front end for any GSE broadcast-video tracking lane, benchmarked against the ignore policy on decision-relevant NFL metrics (pre-snap box-count estimate, receiver separation at throw) rather than trajectory fidelity.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Adopt B4 (or a better learned variant) into the GSE tracking pipeline if it cuts the decision-relevant NFL metric error to <=50% of the ignore policy on the held-out weeks; reject broadcast-video tracking for that metric (stick to play-by-play sources) if B4 fails to beat the ignore policy.
 */

/** A tracked player position with role. */
export interface TrackedPlayer {
  id: string;
  role: string; // e.g. "WR", "CB", "DL"
  x: number;
  y: number;
  visible: boolean;
}

/**
 * Role-anchored centroid voting: impute each invisible player at the
 * centroid of visible same-role players, anchored to the formation anchor
 * (e.g. ball position) when no same-role player is visible.
 */
export function centroidVoteImpute(
  players: readonly TrackedPlayer[],
  anchor: { x: number; y: number },
): TrackedPlayer[] {
  const byRole = new Map<string, { x: number; y: number }[]>();
  for (const p of players) {
    if (!p.visible) continue;
    const arr = byRole.get(p.role) ?? [];
    arr.push({ x: p.x, y: p.y });
    byRole.set(p.role, arr);
  }
  return players.map((p) => {
    if (p.visible) return p;
    const mates = byRole.get(p.role) ?? [];
    if (mates.length === 0) return { ...p, x: anchor.x, y: anchor.y, visible: true };
    const cx = mates.reduce((s, m) => s + m.x, 0) / mates.length;
    const cy = mates.reduce((s, m) => s + m.y, 0) / mates.length;
    return { ...p, x: cx, y: cy, visible: true };
  });
}

/** Pre-snap box count: defenders within 5 yards of LOS and 12 of ball x. */
export function boxCount(
  defenders: readonly { x: number; y: number }[],
  losY: number,
  ballX: number,
): number {
  return defenders.filter((d) => Math.abs(d.y - losY) <= 5 && Math.abs(d.x - ballX) <= 12).length;
}

/** Receiver separation at throw: min distance to any defender. */
export function separationAtThrow(
  receiver: { x: number; y: number },
  defenders: readonly { x: number; y: number }[],
): number {
  if (defenders.length === 0) throw new Error("separationAtThrow: no defenders");
  return Math.min(...defenders.map((d) => Math.hypot(d.x - receiver.x, d.y - receiver.y)));
}

/**
 * B4-vs-ignore verdict: true if B4 cuts the decision-metric error to <=50%
 * of the ignore policy.
 */
export function beatsIgnorePolicy(errB4: number, errIgnore: number): boolean {
  if (errIgnore <= 0) throw new Error("beatsIgnorePolicy: errIgnore > 0");
  return errB4 <= 0.5 * errIgnore;
}

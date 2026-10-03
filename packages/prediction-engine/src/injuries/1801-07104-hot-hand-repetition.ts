/**
 * arXiv 1801.07104: Heating Up in NBA Free Throw Shooting
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * The paper tests hot-hand in NBA free throws with repetition (consecutive attempts heat a shooter) vs interruption (time between attempts cools them), estimating a delta_12 contrast (2nd vs 1st attempt) with player random effects. We port the contrast to NFL touches: within-drive repetition heating vs between-touch interruption cooling, as prop-model features.
 *
 * Record improvement (verbatim):
 * Port the repetition/interruption hot-hand vocabulary from free-throw shooting to NFL player props: target = repetition/interruption features -- receiver target k within a drive (repetition heating), plays since last touch (interruption cooling), snaps played (fatigue), leverage of situation (stress); data: nflverse pbp 2015-2024; per-player per-play success (reception/catch, yards over expected via NGS); model: Bayesian hierarchical logistic (player random intercepts/slopes, mirroring Model 1) with covariates: touch index within drive, plays since previous touch, cumulative snaps, score leverage; estimate delta_12-style contrasts (2nd touch vs 1st touch in a drive); serve: pre-game prop model features (rest/fatigue adjustments) + live in-game prop adjustment ('heating up' flags).
 *
 * ACCEPTANCE GATE (verbatim):
 * ADAPT the repetition/interruption feature family if the NFL replication finds a player-adjusted within-drive repetition effect >= +2pp catch rate with |z| > 3 AND a between-drive interruption effect <= -1pp with |z| > 2. REJECT if both |z| < 2 (no signal in football touches).
 */

export const ENABLED = false;

export interface Touch {
  playerId: string;
  driveId: number;
  /** 0-based index of this touch within its drive (repetition counter) */
  touchIndex: number;
  /** plays since this player's previous touch (interruption counter) */
  playsSince: number;
  snaps: number;
  leverage: number;
  success: boolean;
}

export interface ContrastResult {
  delta: number;
  se: number;
  z: number;
  n0: number;
  n1: number;
}

/**
 * Player-adjusted delta_12-style contrast: success rate at touchIndex 1 minus
 * success rate at touchIndex 0 (2nd vs 1st touch within a drive), pooled across
 * players with inverse-variance weights (fixed-effect meta-analysis).
 */
export function repetitionContrast(touches: Touch[]): ContrastResult {
  const byPlayer = new Map<string, Touch[]>();
  for (const t of touches) {
    const arr = byPlayer.get(t.playerId);
    if (arr) arr.push(t);
    else byPlayer.set(t.playerId, [t]);
  }
  let num = 0;
  let den = 0;
  let n0 = 0;
  let n1 = 0;
  for (const arr of byPlayer.values()) {
    const g0 = arr.filter((t) => t.touchIndex === 0);
    const g1 = arr.filter((t) => t.touchIndex === 1);
    if (g0.length < 10 || g1.length < 10) continue;
    const r0 = g0.filter((t) => t.success).length / g0.length;
    const r1 = g1.filter((t) => t.success).length / g1.length;
    const d = r1 - r0;
    const v = (r0 * (1 - r0)) / g0.length + (r1 * (1 - r1)) / g1.length;
    if (v <= 0) continue;
    num += d / v;
    den += 1 / v;
    n0 += g0.length;
    n1 += g1.length;
  }
  const delta = den > 0 ? num / den : 0;
  const se = den > 0 ? Math.sqrt(1 / den) : Infinity;
  return { delta, se, z: se > 0 && isFinite(se) ? delta / se : 0, n0, n1 };
}

/**
 * Interruption contrast: success rate on "cold" touches (playsSince >= coldAt)
 * minus "fresh" touches (playsSince <= freshAt), player-adjusted like above.
 */
export function interruptionContrast(
  touches: Touch[],
  freshAt = 4,
  coldAt = 9,
): ContrastResult {
  const byPlayer = new Map<string, Touch[]>();
  for (const t of touches) {
    const arr = byPlayer.get(t.playerId);
    if (arr) arr.push(t);
    else byPlayer.set(t.playerId, [t]);
  }
  let num = 0;
  let den = 0;
  let n0 = 0;
  let n1 = 0;
  for (const arr of byPlayer.values()) {
    const gf = arr.filter((t) => t.playsSince <= freshAt);
    const gc = arr.filter((t) => t.playsSince >= coldAt);
    if (gf.length < 10 || gc.length < 10) continue;
    const rf = gf.filter((t) => t.success).length / gf.length;
    const rc = gc.filter((t) => t.success).length / gc.length;
    const d = rc - rf;
    const v = (rf * (1 - rf)) / gf.length + (rc * (1 - rc)) / gc.length;
    if (v <= 0) continue;
    num += d / v;
    den += 1 / v;
    n0 += gf.length;
    n1 += gc.length;
  }
  const delta = den > 0 ? num / den : 0;
  const se = den > 0 ? Math.sqrt(1 / den) : Infinity;
  return { delta, se, z: se > 0 && isFinite(se) ? delta / se : 0, n0, n1 };
}

/** Gate decision: ADAPT the feature family only on the paper's joint criterion. */
export function hotHandGate(rep: ContrastResult, intr: ContrastResult): "ADAPT" | "REJECT" {
  const repHit = rep.delta >= 0.02 && Math.abs(rep.z) > 3;
  const intrHit = intr.delta <= -0.01 && Math.abs(intr.z) > 2;
  if (repHit && intrHit) return "ADAPT";
  if (Math.abs(rep.z) < 2 && Math.abs(intr.z) < 2) return "REJECT";
  return "REJECT";
}

/**
 * 0006 Unsupervised Identification of Pass Coverage (arXiv:1906.11373v3)
 *
 * arXiv:1906.11373v3 · lane:tracking · verdict:ADAPT · owner:Motif-lab
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Frame-differenced player kinematics: per-step speed from Euclidean displacement over the frame
 * interval, acceleration from speed differences, and catch-point separation as the minimum defender
 * distance - the raw material for route-running, coverage, and ball-carrier features.
 *
 * Improvement (wiring record): Adopt GMM weak labels for pass coverage (posterior probabilities from alignment/orientation
 * features, K by BIC + bootstrap stability) as QB-matchup features, with a team-structure-aware joint
 * coverage model (per-defender responsibility + Cover 1/2/3/4 scheme posterior) as the upgrade path.
 *
 * ACCEPTANCE GATE: ADOPT the weak labels for downstream GSE features only if: bootstrap ARI of the GMM solution is >=
 * 0.70 across >= 100 resamples, the qualitative audit agrees with cluster naming on >= 90% of 100
 * sampled plays, and the solution is stable when re-fit on a held-out season.
 *
 * Ingest role: tracking kinematics (speeds, accelerations, catch-point separation).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1906.11373v3" as const;
export const LANE = "tracking" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the weak labels for downstream GSE features only if: bootstrap ARI of the GMM solution is >= 0.70 across >= 100 resamples, the qualitative audit agrees with cluster naming on >= 90% of 100 sampled plays, and the solution is stable when re-fit on a held-out season.`;

/** Disabled by default: additive utility only, never auto-wired into a live ingestion path. */
export const ENABLED = false as const;

export const CONFIG = {
  enabled: false,
  method: "frame-differenced kinematics + separation",
} as const;
/** Numeric guard: rejects NaN, Infinity, and non-numbers. */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface TrackFrame {
  /** Field x in yards. */
  x: number;
  /** Field y in yards. */
  y: number;
}

function validFrame(f: TrackFrame): boolean {
  return typeof f === "object" && f !== null && isFiniteNumber(f.x) && isFiniteNumber(f.y);
}

/** Euclidean distance between two field positions (yards). */
export function distance(a: TrackFrame, b: TrackFrame): number | null {
  if (!validFrame(a) || !validFrame(b)) return null;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Per-step speeds (yards/sec) from a track sampled at a fixed frame interval dt. */
export function speedsFromFrames(frames: readonly TrackFrame[], dtSeconds: number): number[] | null {
  if (!isFiniteNumber(dtSeconds) || dtSeconds <= 0) return null;
  if (frames.length < 2 || !frames.every(validFrame)) return null;
  const out: number[] = [];
  for (let i = 1; i < frames.length; i++) {
    const prev = frames[i - 1];
    const cur = frames[i];
    if (prev === undefined || cur === undefined) return null;
    const d = distance(prev, cur);
    if (d === null) return null;
    out.push(d / dtSeconds);
  }
  return out;
}

/** Per-step accelerations (yards/sec^2) from a speed series at interval dt. */
export function accelerationsFromSpeeds(speeds: readonly number[], dtSeconds: number): number[] | null {
  if (!isFiniteNumber(dtSeconds) || dtSeconds <= 0) return null;
  if (speeds.length < 2 || !speeds.every(isFiniteNumber)) return null;
  const out: number[] = [];
  for (let i = 1; i < speeds.length; i++) {
    out.push(((speeds[i] ?? 0) - (speeds[i - 1] ?? 0)) / dtSeconds);
  }
  return out;
}

/** Minimum distance from the ball-carrier/receiver to any defender (separation, yards). */
export function separationAtCatch(carrier: TrackFrame, defenders: readonly TrackFrame[]): number | null {
  if (!validFrame(carrier)) return null;
  if (defenders.length === 0 || !defenders.every(validFrame)) return null;
  let min = Infinity;
  for (const d of defenders) {
    const dist = distance(carrier, d);
    if (dist === null) return null;
    if (dist < min) min = dist;
  }
  return min;
}

/**
 * PEP: Tackle Value as Prevented Expected Points
 *
 * arXiv:2407.08508 · lane:tracking · verdict:ADAPT · owner:Motif-lab
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Frame-differenced player kinematics: per-step speed from Euclidean displacement over the frame
 * interval, acceleration from speed differences, and catch-point separation as the minimum defender
 * distance - the raw material for route-running, coverage, and ball-carrier features.
 *
 * Improvement (wiring record): Score tackles as prevented expected points via the counterfactual-removal GAMLSS, and close the
 * authors' gap by scoring missed tackles with the inverted counterfactual on charted missed-tackle
 * events to build a net tackling metric (PEP_made − PEP_missed), splitting the mixed model by run/pass
 * to remove CB catch-and-tackle bias, as an input to defensive player ratings.
 *
 * ACCEPTANCE GATE: ADAPT if: (a) RF out-of-sample EOPY predictions achieve MAE ≤ 3.5 yards on held-out weeks (paper:
 * 3.13), and (b) the tackler random intercept predicts second-half tackles per snap with out-of-sample
 * R² ≥ 0.05 above the raw-tackle-rate baseline.
 *
 * Ingest role: tracking kinematics (speeds, accelerations, catch-point separation).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2407.08508" as const;
export const LANE = "tracking" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT if: (a) RF out-of-sample EOPY predictions achieve MAE ≤ 3.5 yards on held-out weeks (paper: 3.13), and (b) the tackler random intercept predicts second-half tackles per snap with out-of-sample R² ≥ 0.05 above the raw-tackle-rate baseline.`;

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

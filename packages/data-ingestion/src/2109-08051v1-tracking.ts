/**
 * Frame by Frame Completion Probability of an NFL Pass
 *
 * arXiv:2109.08051v1 · lane:tracking · verdict:ADAPT · owner:Hermes
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Frame-differenced player kinematics: per-step speed from Euclidean displacement over the frame
 * interval, acceleration from speed differences, and catch-point separation as the minimum defender
 * distance - the raw material for route-running, coverage, and ball-carrier features.
 *
 * Improvement (wiring record): Reproduce the two-stage frame-by-frame completion pipeline in Python on Big Data Bowl tracking
 * (2018-2024): Stage 1 target-ID via the paper's inverse-distance weighting; Stage 2 completion|target
 * with the 32-feature set PLUS the missing pieces the authors flagged — receiver-talent priors (GSE's
 * own receiver ratings), CB coverage grades, ball-height proxy, weather/wind — then add the missing
 * z-dimension: estimate ball height from a projectile model fit to x/y + event tags (release point,
 * catch point, airtime -> launch angle/height profile), testing height-aware features (ball height at
 * closest approach vs receiver catch radius) on contested catches specifically (defender within 1 yard
 * at arrival). Uses: live in-play completion probability, play-level EPA/WP features, and a CPOE-style
 * QB metric.
 *
 * ACCEPTANCE GATE: ADAPT if reproduction hits the Test 1 gates (target-ID accuracy >=85%, Stage-2 AUC >=0.85 on 2024
 * holdout) AND the talent-augmented model passes Test 2 (AUC gain >=+0.01 with calibration slope in
 * [0.9, 1.1], and the CPOE-style metric correlates >=0.3 with next-season QB EPA/play).
 *
 * Ingest role: tracking kinematics (speeds, accelerations, catch-point separation).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2109.08051v1" as const;
export const LANE = "tracking" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT if reproduction hits the Test 1 gates (target-ID accuracy >=85%, Stage-2 AUC >=0.85 on 2024 holdout) AND the talent-augmented model passes Test 2 (AUC gain >=+0.01 with calibration slope in [0.9, 1.1], and the CPOE-style metric correlates >=0.3 with next-season QB EPA/play).`;

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

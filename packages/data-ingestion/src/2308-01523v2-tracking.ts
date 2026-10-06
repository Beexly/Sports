/**
 * Miss It Like Messi: Extracting Value from Off-Target Shots in Soccer
 *
 * arXiv:2308.01523v2 · lane:tracking · verdict:ADAPT · owner:Motif-lab
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Frame-differenced player kinematics: per-step speed from Euclidean displacement over the frame
 * interval, acceleration from speed differences, and catch-point separation as the minimum defender
 * distance - the raw material for route-running, coverage, and ball-carrier features.
 *
 * Improvement (wiring record): Three NFL adaptations in priority order: (1) kicker FG dispersion model - each FG attempt's miss
 * vector (lateral/vertical miss distance from the uprights' center) as a player-specific hierarchical
 * mixture over a coarse spatial grid (the paper's saturate-then-prune recipe), with a coordinate-based
 * make-probability surface (logistic in miss vector); metric RB-FG% (true make probability
 * marginalized over the dispersion process, shrunk toward global components); (2) QB throw-placement
 * surface - NGS/tracking ball arrival coordinates vs receiver position, per-QB placement error as a
 * hierarchical mixture, catch-probability-as-function-of-placement as the PostXg analog (a generative
 * upgrade over CPOE's Bernoulli residual); (3) punt placement model over landing coordinates with a
 * field-position-value surface - plus context-conditional components (mixture weights depend on game
 * context: score differential, pressure/down, weather) and learned per-player covariance scaling via
 * hierarchical variational inference.
 *
 * ACCEPTANCE GATE: ADAPT into GSE's accuracy metrics only if: (a) the mechanism check reproduces >=2x stability
 * improvement of the generative metrics over outcome-only baselines on public soccer data; AND (b) on
 * NFL kicking data, year-over-year correlation of RB-FG% with next-season actual FG% beats
 * prior-season raw FG% by >=0.10 in absolute correlation over 2020-2024; AND (c) the miss-vector data
 * source is charted reliably.
 *
 * Ingest role: tracking kinematics (speeds, accelerations, catch-point separation).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2308.01523v2" as const;
export const LANE = "tracking" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT into GSE's accuracy metrics only if: (a) the mechanism check reproduces >=2x stability improvement of the generative metrics over outcome-only baselines on public soccer data; AND (b) on NFL kicking data, year-over-year correlation of RB-FG% with next-season actual FG% beats prior-season raw FG% by >=0.10 in absolute correlation over 2020-2024; AND (c) the miss-vector data source is charted reliably.`;

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

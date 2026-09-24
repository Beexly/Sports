/**
 * Augmenting Adjusted Plus-Minus in Soccer with FIFA Ratings
 *
 * arXiv:1810.08032v1 · lane:tracking · verdict:ADAPT · owner:Hermes
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Frame-differenced player kinematics: per-step speed from Euclidean displacement over the frame
 * interval, acceleration from speed differences, and catch-point separation as the minimum defender
 * distance - the raw material for route-running, coverage, and ball-carrier features.
 *
 * Improvement (wiring record): Build Madden-Prior Player Value (MPPV): the Augmented-APM idea -- regularize noisy on-field
 * player-value estimates toward a subjective rating prior, with the data deciding the weight via a
 * learned scale alpha (the paper's equation 3). Unit of analysis = the drive (response = drive
 * EPA/points; design matrix X = skill-position players on the drive, OL as unit effect); prior
 * beta|alpha ~ N(alpha . madden_overall_centered, tau^2), alpha ~ N(mu_alpha, sigma^2_alpha) with
 * Madden overall ratings (preseason, mean-centered per position group) as the FIFA-ratings analogue;
 * learn alpha per position group; fit in Stan/PyMC on 2019-2024 nflverse drives; time-weight by
 * drives. Products: weekly 'Madden vs. reality' content -- players whose posterior beta most
 * exceeds/falls short of their Madden-implied prior -- and a one-number player-value leaderboard with
 * posterior uncertainty intervals (the paper's Bayesian advantage over point-estimate plus-minus).
 * Improvement beyond the paper: (a) dynamic prior -- weekly Kalman-filtered blend of preseason Madden
 * rating and cumulative posterior (the paper's prior never updates and its own rolling analysis shows
 * the prior's value decays); (b) component ratings (Madden speed/awareness/catching by position)
 * instead of the single overall -- the paper discarded FIFA's components. This is also the natural
 * bridge to GSE's state-space team-strength work (1701.05976).
 *
 * ACCEPTANCE GATE: Adopt MPPV as a GSE player-valuation metric if on the 2023-2024 rolling holdout it beats both the
 * Madden-only and the zero-prior ridge baselines on drive-EPA MSE in both seasons (the paper's result
 * replicated, not a one-season fluke) AND the learned position-group alpha's are positive and stable
 * (prior genuinely informative, not washed out). Reject if MPPV fails to beat zero-prior ridge (the
 * prior adds nothing once on-field data accumulates) or if alpha ~ 0 (Madden ratings carry no signal
 * for drive EPA).
 *
 * Ingest role: tracking kinematics (speeds, accelerations, catch-point separation).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1810.08032v1" as const;
export const LANE = "tracking" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Adopt MPPV as a GSE player-valuation metric if on the 2023-2024 rolling holdout it beats both the Madden-only and the zero-prior ridge baselines on drive-EPA MSE in both seasons (the paper's result replicated, not a one-season fluke) AND the learned position-group alpha's are positive and stable (prior genuinely informative, not washed out). Reject if MPPV fails to beat zero-prior ridge (the prior adds nothing once on-field data accumulates) or if alpha ~ 0 (Madden ratings carry no signal for drive EPA).`;

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

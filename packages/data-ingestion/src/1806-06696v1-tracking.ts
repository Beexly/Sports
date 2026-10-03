/**
 * SMOGS: Social Network Metrics of Game Success
 *
 * arXiv:1806.06696v1 · lane:tracking · verdict:ADAPT · owner:Hermes
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Frame-differenced player kinematics: per-step speed from Euclidean displacement over the frame
 * interval, acceleration from speed differences, and catch-point separation as the minimum defender
 * distance - the raw material for route-running, coverage, and ball-carrier features.
 *
 * Improvement (wiring record): Build QB-Receiver Chemistry Factors (QRCF): port SMOGS's social-network
 * additive-and-multiplicative-effects (AME) model to the NFL target dyad -- for each dropback model
 * target choice among the 5 eligibles as a conditional logit: log-odds(target i->j) = beta_d x_d + r_j
 * (receiver popularity) + u_QB^T v_j (chemistry) + epsilon; dyadic covariates x_d from NGS (separation
 * at throw, nearest-defender distance, route type, air-yards depth, pressure); latent dimension R=2
 * fit per QB-team-season (or per game for the fragmentation diagnostic) with Stan/PyMC. Products: (a)
 * chemistry leaderboard -- QB-WR pairs with the largest positive u^T v residuals (targets beyond what
 * separation/route explain = trust), weekly X content; (b) the paper's win/loss signature made
 * quantitative: does target-factor fragmentation (dispersed v_j) negatively predict team dropback EPA?
 * Improvement beyond the paper: (a) dynamic AME where u_{QB,t}, v_{j,t} evolve as random walks across
 * weeks -- the paper's per-game factors can't predict the future, making chemistry a real leading
 * indicator; (b) add the nearest defender as a network node (QB-receiver-defender triad with a third
 * latent factor) -- the paper's listed future work. Week-to-week change in a pair's chemistry factor
 * becomes a predictive 'trust is building/breaking down' signal for matchup previews.
 *
 * ACCEPTANCE GATE: Adopt QRCF only if on the 2024 holdout the latent-factor target model beats the no-latent baseline
 * on held-out log-likelihood AND receiver-factor fragmentation is a significant negative predictor of
 * team dropback EPA out-of-sample. Reject if latent factors add no held-out likelihood over covariates
 * (chemistry is just separation + route) or if fragmentation has no out-of-sample relationship with
 * offensive performance. Do not ship an interpretive plot without the numbers -- the paper's own
 * weakness.
 *
 * Ingest role: tracking kinematics (speeds, accelerations, catch-point separation).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1806.06696v1" as const;
export const LANE = "tracking" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Adopt QRCF only if on the 2024 holdout the latent-factor target model beats the no-latent baseline on held-out log-likelihood AND receiver-factor fragmentation is a significant negative predictor of team dropback EPA out-of-sample. Reject if latent factors add no held-out likelihood over covariates (chemistry is just separation + route) or if fragmentation has no out-of-sample relationship with offensive performance. Do not ship an interpretive plot without the numbers -- the paper's own weakness.`;

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

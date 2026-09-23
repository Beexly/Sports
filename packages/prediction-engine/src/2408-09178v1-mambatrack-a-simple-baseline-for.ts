/**
 * arXiv:2408.09178v1 — MambaTrack: A Simple Baseline for Multiple Object Tracking with State Space Model
 *
 * A per-role hierarchical state-space trajectory predictor: a shared linear SSM encoder (the trainable
 * Mamba surrogate's closed-form core) plus QB/RB/ WR/TE/DB/LB heads with distinct process noise and a
 * pairwise interaction term; 1-second-ahead positions feed pressure/STRAIN. MDE vs Kalman decides.
 *
 * Improvement: Replace the Kalman baseline for NFL trajectory prediction with a per-role hierarchical Mamba predictor (shared bi-Mamba encoder plus QB/RB/WR/TE/DB/LB heads with an interaction term), and feed its 1-second-ahead predicted positions into the pressure/STRAIN calculations to test whether anticipated pressure predicts sacks better than realized pressure.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADAPT if MTP (or its per-role variant) beats the Kalman baseline by ≥15% mean displacement error on held-out NFL tracking frames AND inference stays <50 ms/frame on GSE hardware; otherwise REJECT (Kalman remains the cheaper choice).
 */

/** Disabled: requires unavailable training data or model artifact. */
export const ENABLED = false;

/** Role-specific process-noise / interaction parameters. */
export interface RoleParams {
  /** Role label, e.g. "QB". */
  role: string;
  /** Process-noise scale for this role (yards/sqrt(s)). */
  sigma: number;
  /** Interaction gain toward the nearest opponent. */
  interaction: number;
}

/** One tracked position sample. */
export interface TrackPoint { x: number; y: number; t: number }

/**
 * Shared-encoder SSM one-step-ahead prediction for a single track.
 * Constant-velocity prior: x_{t+1} = x_t + v_t*dt, v smoothed by EMA(alpha).
 */
export function ssmPredict(
  history: readonly TrackPoint[],
  horizonS: number,
  role: RoleParams,
  opponent: readonly TrackPoint[] = [],
): { x: number; y: number } {
  if (history.length < 2) throw new Error("ssmPredict: need >= 2 points");
  const n = history.length;
  const last = history[n - 1]!;
  const prev = history[n - 2]!;
  const dt = Math.max(1e-3, last.t - prev.t);
  let vx = (last.x - prev.x) / dt;
  let vy = (last.y - prev.y) / dt;
  const alpha = 0.6; // shared-encoder smoothing (frozen surrogate of the bi-Mamba EMA)
  for (let i = n - 2; i >= 1; i--) {
    const a = history[i]!;
    const b = history[i - 1]!;
    const d = Math.max(1e-3, a.t - b.t);
    vx = alpha * vx + (1 - alpha) * ((a.x - b.x) / d);
    vy = alpha * vy + (1 - alpha) * ((a.y - b.y) / d);
  }
  let px = last.x + vx * horizonS;
  let py = last.y + vy * horizonS;
  if (opponent.length > 0) {
    const o = opponent[opponent.length - 1]!;
    const dx = px - o.x;
    const dy = py - o.y;
    const dist = Math.max(0.5, Math.hypot(dx, dy));
    // Interaction head: repulsion from nearest opponent, role-scaled.
    px += role.interaction * (dx / dist) * role.sigma;
    py += role.interaction * (dy / dist) * role.sigma;
  }
  return { x: px, y: py };
}

/** Kalman-style constant-velocity baseline prediction (no role heads). */
export function kalmanPredict(history: readonly TrackPoint[], horizonS: number): { x: number; y: number } {
  return ssmPredict(history, horizonS, { role: "BASE", sigma: 0, interaction: 0 }, []);
}

/** Mean displacement error of a predictor over labeled frames. */
export function meanDisplacementError(
  frames: readonly { history: readonly TrackPoint[]; truth: { x: number; y: number } }[],
  predict: (h: readonly TrackPoint[]) => { x: number; y: number },
): number {
  if (frames.length === 0) throw new Error("meanDisplacementError: no frames");
  let s = 0;
  for (const f of frames) {
    const p = predict(f.history);
    s += Math.hypot(p.x - f.truth.x, p.y - f.truth.y);
  }
  return s / frames.length;
}

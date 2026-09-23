/**
 * GTA-Net: An IoT-Integrated 3D Human Pose Estimation System for Real-Time Adolescent Sports Posture Correction
 *
 * arXiv:2411.06725 · lane:sports_cv · verdict:ADAPT · owner:Motif-lab · doctrine:PROPRIETARY_EDGE
 *
 * Mechanism: Pose-estimation quality metrics: mean per-joint position error (MPJPE), bone-length constraint violations against anthropometric priors, and exponential temporal smoothing of joint tracks.
 *
 * Improvement (record):
 * Add 3D human pose estimation to the video lane with a broadcast-domain bone-length prior (NFL athlete anthropometrics from combine measurements) as a hard constraint on the Bone-GCN stream, testing whether it closes the MPI-INF-3DHP generalization gap where Yu et al. beat GTA-Net (31.36 vs 48.0 mm).
 *
 * ACCEPTANCE GATE:
 * Reimplementation must land within 2 mm of the paper's Protocol #2 values (CPN: 32.2 mm, GT: 22.3 mm) on Human3.6M, and each ablated component must reproduce the reported degradation pattern, before any GSE integration.
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow and is a NEEDS HUMAN CALL).
 * Ingest role: pose quality checker. Live data: NO — pure offline transforms over stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null.
 */

export const ARXIV_ID = "2411.06725" as const;
export const LANE = "sports_cv" as const;
export const VERDICT = "ADAPT" as const;

/** Numeric acceptance gate, verbatim from the record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Reimplementation must land within 2 mm of the paper's Protocol #2 values (CPN: 32.2 mm, GT: 22.3 mm) on Human3.6M, and each ablated component must reproduce the reported degradation pattern, before any GSE integration.`;

/**
 * Disabled by default: the acceptance gate above requires live/backtest data not
 * available inside this module. Flip only after the gate is evaluated offline and
 * a human approves wiring into a live ingestion path.
 */
export const ENABLED = false;
/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** Bone-length constraint outcome. */
export interface BoneLengthCheck {
  meanErrMm: number;
  maxErrMm: number;
}

/**
 * Mean Per-Joint Position Error over J joints x 3 coords (millimeters).
 * Null on shape mismatch or non-finite entries.
 */
export function mpjpe(pred: number[][], gt: number[][]): number | null {
  if (pred.length !== gt.length || pred.length === 0) return null;
  let s = 0;
  for (let j = 0; j < pred.length; j++) {
    const p = pred[j] as number[];
    const g = gt[j] as number[];
    if (!p || !g || p.length !== 3 || g.length !== 3) return null;
    if (![...p, ...g].every(isFiniteNumber)) return null;
    const px = p[0] as number;
    const py = p[1] as number;
    const pz = p[2] as number;
    const gx = g[0] as number;
    const gy = g[1] as number;
    const gz = g[2] as number;
    s += Math.hypot(px - gx, py - gy, pz - gz);
  }
  return s / pred.length;
}

/**
 * Bone-length constraint check: absolute deviation of each bone's measured
 * length from the anthropometric prior (e.g. NFL combine measurements).
 */
export function boneLengthError(
  joints: number[][],
  pairs: Array<[number, number]>,
  expectedMm: number[],
): BoneLengthCheck | null {
  if (pairs.length !== expectedMm.length || pairs.length === 0) return null;
  const errs: number[] = [];
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i] as [number, number];
    const a = joints[pair[0]];
    const b = joints[pair[1]];
    const exp = expectedMm[i] as number;
    if (!a || !b || a.length !== 3 || b.length !== 3 || !isFiniteNumber(exp)) return null;
    if (![...a, ...b].every(isFiniteNumber)) return null;
    const ax = a[0] as number;
    const ay = a[1] as number;
    const az = a[2] as number;
    const bx = b[0] as number;
    const by = b[1] as number;
    const bz = b[2] as number;
    const len = Math.hypot(ax - bx, ay - by, az - bz);
    errs.push(Math.abs(len - exp));
  }
  return {
    meanErrMm: errs.reduce((s, v) => s + v, 0) / errs.length,
    maxErrMm: Math.max(...errs),
  };
}

/**
 * Exponential moving average over frames (alpha=1 keeps raw, alpha=0 freezes
 * at the first frame). Smooths jittery per-frame pose estimates.
 */
export function temporalSmooth(positions: number[][], alpha: number): number[][] | null {
  if (positions.length === 0) return null;
  if (!isFiniteNumber(alpha) || alpha < 0 || alpha > 1) return null;
  const first = positions[0] as number[];
  const dim = first.length;
  if (dim === 0 || !positions.every((p) => p.length === dim && p.every(isFiniteNumber))) return null;
  const out: number[][] = [first.slice()];
  for (let i = 1; i < positions.length; i++) {
    const prev = out[i - 1] as number[];
    const cur = positions[i] as number[];
    out.push(cur.map((v, d) => alpha * v + (1 - alpha) * (prev[d] as number)));
  }
  return out;
}

/**
 * Gate-Shift-Pose: Enhancing Action Recognition in Sports with Skeleton Information
 *
 * arXiv:2503.04470 · lane:sports_cv · verdict:ADAPT · owner:Hermes · doctrine:PROPRIETARY_EDGE
 *
 * Mechanism: Pose-estimation quality metrics: mean per-joint position error (MPJPE), bone-length constraint violations against anthropometric priors, and exponential temporal smoothing of joint tracks.
 *
 * Improvement (record):
 * Fuse skeleton information into the GSF action-recognition backbone with a learned spatial encoder — a small conv net mapping (x,y,confidence)^17 to a 16-channel spatial prior trained jointly — replacing the handcrafted Gaussian heatmap, and test YOLO11-n-pose plus early fusion for the latency–accuracy tradeoff on edge hardware.
 *
 * ACCEPTANCE GATE:
 * Both GSP variants must beat the RGB-only baseline by ≥10pp mean accuracy on athlete-disjoint folds AND the early-fusion-vs-late-fusion ranking must hold (ResNet50: early ≥ late; ResNet18: late ≥ early) [index numeric_gate, truncated].
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow and is a NEEDS HUMAN CALL).
 * Ingest role: pose quality checker. Live data: NO — pure offline transforms over stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null.
 */

export const ARXIV_ID = "2503.04470" as const;
export const LANE = "sports_cv" as const;
export const VERDICT = "ADAPT" as const;

/** Numeric acceptance gate, verbatim from the record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Both GSP variants must beat the RGB-only baseline by ≥10pp mean accuracy on athlete-disjoint folds AND the early-fusion-vs-late-fusion ranking must hold (ResNet50: early ≥ late; ResNet18: late ≥ early) [index numeric_gate, truncated].`;

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

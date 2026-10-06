/**
 * arXiv:2509.23455v1 — 3DPCNet: Pose Canonicalization for Robust Viewpoint-Invariant 3D Kinematic Analysis from Monocular RGB cameras
 *
 * Pose canonicalization for viewpoint-invariant kinematics: 3D player poses from heterogeneous NFL camera
 * angles are translated to the root and yaw-aligned into a common field frame, so joint angles and posture
 * metrics compare across broadcast, All-22, and end-zone views.
 *
 * Improvement: GSE canonicalizes 3D player poses from heterogeneous NFL camera angles into a common field frame, making pose-derived features (joint angles, posture metrics) comparable across broadcast, All-22, and end-zone views.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Adopt the canonicalization layer if on real multi-angle NFL film it reduces cross-view MPJPE by >=20% vs the geometric baseline AND median frame-to-frame rotation jitter is <=2 degrees after temporal smoothing.
 */

/** A 3D joint position. */
export type Joint3D = [number, number, number];

/** Yaw angle of the hip vector (left hip -> right hip) in the XZ plane. */
export function hipYaw(hipL: Joint3D, hipR: Joint3D): number {
  return Math.atan2(hipR[2] - hipL[2], hipR[0] - hipL[0]);
}

/**
 * Canonicalize: translate so the root (mid-hip) is at the origin, then
 * rotate about Y to zero the hip yaw (field-frame alignment).
 */
export function canonicalizePose(
  joints: readonly Joint3D[],
  hipLIdx: number,
  hipRIdx: number,
): Joint3D[] {
  const hipL = joints[hipLIdx];
  const hipR = joints[hipRIdx];
  if (!hipL || !hipR) throw new Error("canonicalizePose: bad hip indices");
  const root: Joint3D = [(hipL[0] + hipR[0]) / 2, (hipL[1] + hipR[1]) / 2, (hipL[2] + hipR[2]) / 2];
  const yaw = Math.atan2(hipR[2] - hipL[2], hipR[0] - hipL[0]);
  const cos = Math.cos(-yaw);
  const sin = Math.sin(-yaw);
  return joints.map(([x, y, z]) => {
    const dx = x - root[0];
    const dz = z - root[2];
    return [dx * cos - dz * sin, y - root[1], dx * sin + dz * cos];
  });
}

/** Mean per-joint position error. */
export function mpjpe(a: readonly Joint3D[], b: readonly Joint3D[]): number {
  if (a.length !== b.length || a.length === 0) throw new Error("mpjpe: length mismatch or empty");
  const e = a.map((p, i) => Math.hypot(p[0] - b[i]![0], p[1] - b[i]![1], p[2] - b[i]![2]));
  return e.reduce((s, v) => s + v, 0) / e.length;
}

/** Median frame-to-frame rotation (yaw) jitter in degrees. */
export function rotationJitter(yaws: readonly number[]): number {
  if (yaws.length < 2) throw new Error("rotationJitter: need >= 2 frames");
  const diffs = yaws.slice(1).map((y, i) => {
    let d = Math.abs(y - (yaws[i] ?? 0));
    if (d > Math.PI) d = 2 * Math.PI - d;
    return (d * 180) / Math.PI;
  });
  const sorted = [...diffs].sort((x, y) => x - y);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

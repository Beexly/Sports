/**
 * 3D pinhole projection and 2×3 image Jacobian.
 *
 * u,v from K [R|t] X. Jacobian is ∂(u,v)/∂X_world = ∂(u,v)/∂X_cam · R.
 * InSituMeasure gate (arXiv:2609.04014 thresholds from the approved plan):
 * reject when z_cam <= 0, occlusion_ratio > 0.45, or cond(J) > 50.
 * Occlusion is an input, not an estimate.
 */

export interface Mat3 {
  readonly m: readonly [readonly [number, number, number], readonly [number, number, number], readonly [number, number, number]];
}

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export const OCCLUSION_MAX = 0.45;
export const CONDITION_MAX = 50;

export function projectPinhole(
  world: Vec3,
  k: Mat3,
  rotation: Mat3,
  translation: Vec3,
): { u: number; v: number; zCam: number } {
  const r = rotation.m;
  const cam = {
    x: r[0][0] * world.x + r[0][1] * world.y + r[0][2] * world.z + translation.x,
    y: r[1][0] * world.x + r[1][1] * world.y + r[1][2] * world.z + translation.y,
    z: r[2][0] * world.x + r[2][1] * world.y + r[2][2] * world.z + translation.z,
  };
  if (Math.abs(cam.z) < 1e-12) {
    return { u: Number.NaN, v: Number.NaN, zCam: cam.z };
  }
  const kk = k.m;
  return {
    u: (kk[0][0] * cam.x + kk[0][1] * cam.y) / cam.z + kk[0][2],
    v: (kk[1][0] * cam.x + kk[1][1] * cam.y) / cam.z + kk[1][2],
    zCam: cam.z,
  };
}

export function imageJacobian2x3(
  world: Vec3,
  k: Mat3,
  rotation: Mat3,
  translation: Vec3,
): number[][] | null {
  const r = rotation.m;
  const cam = {
    x: r[0][0] * world.x + r[0][1] * world.y + r[0][2] * world.z + translation.x,
    y: r[1][0] * world.x + r[1][1] * world.y + r[1][2] * world.z + translation.y,
    z: r[2][0] * world.x + r[2][1] * world.y + r[2][2] * world.z + translation.z,
  };
  if (cam.z <= 1e-12) return null;
  const fx = k.m[0][0];
  const skew = k.m[0][1];
  const fy = k.m[1][1];
  const z = cam.z;
  const jCam = [
    [fx / z, skew / z, -(fx * cam.x + skew * cam.y) / (z * z)],
    [0, fy / z, -(fy * cam.y) / (z * z)],
  ];
  const j = [
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      j[row][col] =
        jCam[row][0] * r[0][col] +
        jCam[row][1] * r[1][col] +
        jCam[row][2] * r[2][col];
    }
  }
  return j;
}

export function conditionNumber2x3(j: readonly (readonly number[])[]): number {
  const a = j[0][0] * j[0][0] + j[0][1] * j[0][1] + j[0][2] * j[0][2];
  const b = j[0][0] * j[1][0] + j[0][1] * j[1][1] + j[0][2] * j[1][2];
  const c = j[1][0] * j[1][0] + j[1][1] * j[1][1] + j[1][2] * j[1][2];
  const disc = Math.sqrt(Math.max((a - c) * (a - c) + 4 * b * b, 0));
  const lam1 = (a + c + disc) / 2;
  const lam2 = (a + c - disc) / 2;
  if (lam2 <= 1e-18 || lam1 <= 0) return Number.POSITIVE_INFINITY;
  return Math.sqrt(lam1 / lam2);
}

export function insituMeasureGate(
  world: Vec3,
  k: Mat3,
  rotation: Mat3,
  translation: Vec3,
  occlusionRatio: number,
): { accept: boolean; reason: string; condition: number | null } {
  const j = imageJacobian2x3(world, k, rotation, translation);
  if (!j) return { accept: false, reason: "behind-camera", condition: null };
  const cond = conditionNumber2x3(j);
  if (occlusionRatio > OCCLUSION_MAX) {
    return { accept: false, reason: "occluded", condition: cond };
  }
  if (!Number.isFinite(cond) || cond > CONDITION_MAX) {
    return { accept: false, reason: "ill-conditioned", condition: cond };
  }
  return { accept: true, reason: "ok", condition: cond };
}

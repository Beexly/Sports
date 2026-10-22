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

/**
 * Push a 3x3 world position covariance matrix Sigma_XYZ into 2x2 pixel covariance:
 * Sigma_uv = J * Sigma_XYZ * J^T
 */
export function pushWorldCovarianceToImage2D(
  j: readonly (readonly number[])[],
  sigmaWorld3x3: readonly (readonly number[])[],
): [[number, number], [number, number]] {
  const jSigma: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      jSigma[r][c] =
        j[r][0] * sigmaWorld3x3[0][c] +
        j[r][1] * sigmaWorld3x3[1][c] +
        j[r][2] * sigmaWorld3x3[2][c];
    }
  }
  const s00 = jSigma[0][0] * j[0][0] + jSigma[0][1] * j[0][1] + jSigma[0][2] * j[0][2];
  const s01 = jSigma[0][0] * j[1][0] + jSigma[0][1] * j[1][1] + jSigma[0][2] * j[1][2];
  const s10 = jSigma[1][0] * j[0][0] + jSigma[1][1] * j[0][1] + jSigma[1][2] * j[0][2];
  const s11 = jSigma[1][0] * j[1][0] + jSigma[1][1] * j[1][1] + jSigma[1][2] * j[1][2];
  return [
    [s00, s01],
    [s10, s11],
  ];
}

/**
 * Pull a 2x2 pixel covariance matrix back to a Tikhonov-regularized 3x3 world precision/covariance:
 * Sigma_world = (J^T * Sigma_uv^-1 * J + ridgeLambda * I_3)^-1
 */
export function pullImageCovarianceToWorld3D(
  j: readonly (readonly number[])[],
  sigmaUv2x2: readonly (readonly number[])[],
  ridgeLambda = 1e-3,
): number[][] | null {
  const det2 = sigmaUv2x2[0][0] * sigmaUv2x2[1][1] - sigmaUv2x2[0][1] * sigmaUv2x2[1][0];
  if (!Number.isFinite(det2) || Math.abs(det2) <= 1e-15 || !(ridgeLambda > 0)) return null;
  const invUv = [
    [sigmaUv2x2[1][1] / det2, -sigmaUv2x2[0][1] / det2],
    [-sigmaUv2x2[1][0] / det2, sigmaUv2x2[0][0] / det2],
  ];
  // Precision P = J^T * invUv * J + ridgeLambda * I_3
  const p = [
    [ridgeLambda, 0, 0],
    [0, ridgeLambda, 0],
    [0, 0, ridgeLambda],
  ];
  for (let a = 0; a < 3; a++) {
    for (let b = 0; b < 3; b++) {
      let sum = 0;
      for (let r1 = 0; r1 < 2; r1++) {
        for (let r2 = 0; r2 < 2; r2++) {
          sum += j[r1][a] * invUv[r1][r2] * j[r2][b];
        }
      }
      p[a][b] += sum;
    }
  }
  const c00 = p[1][1] * p[2][2] - p[1][2] * p[2][1];
  const c01 = -(p[1][0] * p[2][2] - p[1][2] * p[2][0]);
  const c02 = p[1][0] * p[2][1] - p[1][1] * p[2][0];
  const c10 = -(p[0][1] * p[2][2] - p[0][2] * p[2][1]);
  const c11 = p[0][0] * p[2][2] - p[0][2] * p[2][0];
  const c12 = -(p[0][0] * p[2][1] - p[0][1] * p[2][0]);
  const c20 = p[0][1] * p[1][2] - p[0][2] * p[1][1];
  const c21 = -(p[0][0] * p[1][2] - p[0][2] * p[1][0]);
  const c22 = p[0][0] * p[1][1] - p[0][1] * p[1][0];
  const det3 = p[0][0] * c00 + p[0][1] * c01 + p[0][2] * c02;
  if (!Number.isFinite(det3) || Math.abs(det3) <= 1e-18) return null;
  return [
    [c00 / det3, c10 / det3, c20 / det3],
    [c01 / det3, c11 / det3, c21 / det3],
    [c02 / det3, c12 / det3, c22 / det3],
  ];
}


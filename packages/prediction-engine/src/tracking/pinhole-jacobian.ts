/**
 * 3D pinhole projection and 2×3 image Jacobian.
 *
 * u,v from K [R|t] X. Jacobian is ∂(u,v)/∂X_world = ∂(u,v)/∂X_cam · R.
 * InSituMeasure gate (arXiv:2609.04014 thresholds from the approved plan):
 * reject when z_cam <= 0, occlusion_ratio > 0.45, or cond(J) > 50.
 * Occlusion is an input, not an estimate.
 *
 * Indexing contract: inputs arrive as `readonly (readonly number[])[]` so callers
 * may pass plain arrays. Rows are validated by the row2/row3 helpers; a malformed
 * row degrades to NaN (linear kernels) or null (kernels that already signal
 * failure with null) instead of throwing.
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

type Row2 = readonly [number, number];
type Row3 = readonly [number, number, number];

function row2(row: readonly number[] | undefined): Row2 | null {
  if (!row) return null;
  const a = row[0];
  const b = row[1];
  if (a === undefined || b === undefined) return null;
  return [a, b];
}

function row3(row: readonly number[] | undefined): Row3 | null {
  if (!row) return null;
  const a = row[0];
  const b = row[1];
  const c = row[2];
  if (a === undefined || b === undefined || c === undefined) return null;
  return [a, b, c];
}

function asMat2x3(m: readonly (readonly number[])[]): [Row3, Row3] | null {
  const r0 = row3(m[0]);
  const r1 = row3(m[1]);
  return r0 && r1 ? [r0, r1] : null;
}

function asMat3x3(m: readonly (readonly number[])[]): [Row3, Row3, Row3] | null {
  const r0 = row3(m[0]);
  const r1 = row3(m[1]);
  const r2 = row3(m[2]);
  return r0 && r1 && r2 ? [r0, r1, r2] : null;
}

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
  const j00 = fx / z;
  const j01 = skew / z;
  const j02 = -(fx * cam.x + skew * cam.y) / (z * z);
  const j10 = 0;
  const j11 = fy / z;
  const j12 = -(fy * cam.y) / (z * z);
  return [
    [
      j00 * r[0][0] + j01 * r[1][0] + j02 * r[2][0],
      j00 * r[0][1] + j01 * r[1][1] + j02 * r[2][1],
      j00 * r[0][2] + j01 * r[1][2] + j02 * r[2][2],
    ],
    [
      j10 * r[0][0] + j11 * r[1][0] + j12 * r[2][0],
      j10 * r[0][1] + j11 * r[1][1] + j12 * r[2][1],
      j10 * r[0][2] + j11 * r[1][2] + j12 * r[2][2],
    ],
  ];
}

export function conditionNumber2x3(j: readonly (readonly number[])[]): number {
  const m = asMat2x3(j);
  if (!m) return Number.POSITIVE_INFINITY;
  const [j00, j01, j02] = m[0];
  const [j10, j11, j12] = m[1];
  const a = j00 * j00 + j01 * j01 + j02 * j02;
  const b = j00 * j10 + j01 * j11 + j02 * j12;
  const c = j10 * j10 + j11 * j11 + j12 * j12;
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
 *
 * A malformed row yields NaN entries rather than a throw; every downstream
 * consumer gates on Number.isFinite, so NaN reads as "reject".
 */
export function pushWorldCovarianceToImage2D(
  j: readonly (readonly number[])[],
  sigmaWorld3x3: readonly (readonly number[])[],
): [[number, number], [number, number]] {
  const jm = asMat2x3(j);
  const sm = asMat3x3(sigmaWorld3x3);
  if (!jm || !sm) {
    return [
      [Number.NaN, Number.NaN],
      [Number.NaN, Number.NaN],
    ];
  }
  const [j00, j01, j02] = jm[0];
  const [j10, j11, j12] = jm[1];
  const [s00, s01, s02] = sm[0];
  const [s10, s11, s12] = sm[1];
  const [s20, s21, s22] = sm[2];
  const js00 = j00 * s00 + j01 * s10 + j02 * s20;
  const js01 = j00 * s01 + j01 * s11 + j02 * s21;
  const js02 = j00 * s02 + j01 * s12 + j02 * s22;
  const js10 = j10 * s00 + j11 * s10 + j12 * s20;
  const js11 = j10 * s01 + j11 * s11 + j12 * s21;
  const js12 = j10 * s02 + j11 * s12 + j12 * s22;
  const t00 = js00 * j00 + js01 * j01 + js02 * j02;
  const t01 = js00 * j10 + js01 * j11 + js02 * j12;
  const t10 = js10 * j00 + js11 * j01 + js12 * j02;
  const t11 = js10 * j10 + js11 * j11 + js12 * j12;
  return [
    [t00, t01],
    [t10, t11],
  ];
}

/**
 * Pull a 2x2 pixel covariance matrix back to a Tikhonov-regularized 3x3 world precision/covariance:
 * Sigma_world = (J^T * Sigma_uv^-1 * J + ridgeLambda * I_3)^-1
 *
 * Returns null on degenerate or malformed input.
 */
export function pullImageCovarianceToWorld3D(
  j: readonly (readonly number[])[],
  sigmaUv2x2: readonly (readonly number[])[],
  ridgeLambda = 1e-3,
): number[][] | null {
  const jm = asMat2x3(j);
  const u0 = row2(sigmaUv2x2[0]);
  const u1 = row2(sigmaUv2x2[1]);
  if (!jm || !u0 || !u1) return null;
  const [j00, j01, j02] = jm[0];
  const [j10, j11, j12] = jm[1];
  const [u00, u01] = u0;
  const [u10, u11] = u1;
  const det2 = u00 * u11 - u01 * u10;
  if (!Number.isFinite(det2) || Math.abs(det2) <= 1e-15 || !(ridgeLambda > 0)) return null;
  const i00 = u11 / det2;
  const i01 = -u01 / det2;
  const i10 = -u10 / det2;
  const i11 = u00 / det2;
  // Precision P = J^T * invUv * J + ridgeLambda * I_3
  const p00 = j00 * i00 * j00 + j00 * i01 * j10 + j10 * i10 * j00 + j10 * i11 * j10 + ridgeLambda;
  const p01 = j00 * i00 * j01 + j00 * i01 * j11 + j10 * i10 * j01 + j10 * i11 * j11;
  const p02 = j00 * i00 * j02 + j00 * i01 * j12 + j10 * i10 * j02 + j10 * i11 * j12;
  const p10 = j01 * i00 * j00 + j01 * i01 * j10 + j11 * i10 * j00 + j11 * i11 * j10;
  const p11 = j01 * i00 * j01 + j01 * i01 * j11 + j11 * i10 * j01 + j11 * i11 * j11 + ridgeLambda;
  const p12 = j01 * i00 * j02 + j01 * i01 * j12 + j11 * i10 * j02 + j11 * i11 * j12;
  const p20 = j02 * i00 * j00 + j02 * i01 * j10 + j12 * i10 * j00 + j12 * i11 * j10;
  const p21 = j02 * i00 * j01 + j02 * i01 * j11 + j12 * i10 * j01 + j12 * i11 * j11;
  const p22 = j02 * i00 * j02 + j02 * i01 * j12 + j12 * i10 * j02 + j12 * i11 * j12 + ridgeLambda;
  const c00 = p11 * p22 - p12 * p21;
  const c01 = -(p10 * p22 - p12 * p20);
  const c02 = p10 * p21 - p11 * p20;
  const c10 = -(p01 * p22 - p02 * p21);
  const c11 = p00 * p22 - p02 * p20;
  const c12 = -(p00 * p21 - p01 * p20);
  const c20 = p01 * p12 - p02 * p11;
  const c21 = -(p00 * p12 - p02 * p10);
  const c22 = p00 * p11 - p01 * p10;
  const det3 = p00 * c00 + p01 * c01 + p02 * c02;
  if (!Number.isFinite(det3) || Math.abs(det3) <= 1e-18) return null;
  return [
    [c00 / det3, c10 / det3, c20 / det3],
    [c01 / det3, c11 / det3, c21 / det3],
    [c02 / det3, c12 / det3, c22 / det3],
  ];
}

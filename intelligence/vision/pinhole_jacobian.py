"""3D pinhole projection and 2x3 image Jacobian.

Standard camera model. The InSituMeasure gate rejects frames that are
behind the camera, occluded, or ill-conditioned. It does not estimate
occlusion; the caller supplies occlusion_ratio.
"""

from __future__ import annotations

import math
from typing import Sequence

OCCLUSION_MAX = 0.45
CONDITION_MAX = 50.0


def _matvec3(m: Sequence[Sequence[float]], v: Sequence[float]) -> list[float]:
    return [m[i][0] * v[0] + m[i][1] * v[1] + m[i][2] * v[2] for i in range(3)]


def _mul33(a: Sequence[Sequence[float]], b: Sequence[Sequence[float]]) -> list[list[float]]:
    out = [[0.0, 0.0, 0.0] for _ in range(3)]
    for i in range(3):
        for j in range(3):
            out[i][j] = sum(a[i][k] * b[k][j] for k in range(3))
    return out


def project_pinhole(
    point_world: Sequence[float],
    k: Sequence[Sequence[float]],
    rotation: Sequence[Sequence[float]],
    translation: Sequence[float],
) -> tuple[float, float, float]:
    """Return (u, v, z_cam). z_cam <= 0 is behind or on the camera plane."""
    cam = _matvec3(rotation, point_world)
    cam = [cam[i] + translation[i] for i in range(3)]
    z = cam[2]
    if abs(z) < 1e-12:
        return (math.nan, math.nan, z)
    u = k[0][0] * cam[0] / z + k[0][1] * cam[1] / z + k[0][2]
    v = k[1][0] * cam[0] / z + k[1][1] * cam[1] / z + k[1][2]
    return (u, v, z)


def image_jacobian_2x3(
    point_world: Sequence[float],
    k: Sequence[Sequence[float]],
    rotation: Sequence[Sequence[float]],
    translation: Sequence[float],
) -> list[list[float]] | None:
    """2x3 Jacobian of (u, v) with respect to world coordinates."""
    cam = _matvec3(rotation, point_world)
    cam = [cam[i] + translation[i] for i in range(3)]
    x, y, z = cam
    if z <= 1e-12:
        return None
    fx, skew, fy = k[0][0], k[0][1], k[1][1]
    # du/d(cam), dv/d(cam)
    j_cam = [
        [fx / z, skew / z, -(fx * x + skew * y) / (z * z)],
        [0.0, fy / z, -(fy * y) / (z * z)],
    ]
    # J_world = J_cam @ R
    j = [[0.0, 0.0, 0.0], [0.0, 0.0, 0.0]]
    for r in range(2):
        for c in range(3):
            j[r][c] = sum(j_cam[r][k] * rotation[k][c] for k in range(3))
    return j


def condition_number_2x3(j: Sequence[Sequence[float]]) -> float:
    """cond(J) = sqrt(λmax/λmin) of J J^T. Infinite if rank-deficient."""
    a = j[0][0] * j[0][0] + j[0][1] * j[0][1] + j[0][2] * j[0][2]
    b = j[0][0] * j[1][0] + j[0][1] * j[1][1] + j[0][2] * j[1][2]
    c = j[1][0] * j[1][0] + j[1][1] * j[1][1] + j[1][2] * j[1][2]
    # eigenvalues of [[a, b], [b, c]]
    disc = math.sqrt(max((a - c) * (a - c) + 4 * b * b, 0.0))
    lam1 = (a + c + disc) / 2
    lam2 = (a + c - disc) / 2
    if lam2 <= 1e-18 or lam1 <= 0:
        return math.inf
    return math.sqrt(lam1 / lam2)


def insitu_measure_gate(
    point_world: Sequence[float],
    k: Sequence[Sequence[float]],
    rotation: Sequence[Sequence[float]],
    translation: Sequence[float],
    occlusion_ratio: float,
) -> dict:
    """Fail closed. Does not claim a measured occlusion — uses the supplied ratio."""
    j = image_jacobian_2x3(point_world, k, rotation, translation)
    if j is None:
        return {"accept": False, "reason": "behind-camera", "condition": None}
    cond = condition_number_2x3(j)
    if occlusion_ratio > OCCLUSION_MAX:
        return {"accept": False, "reason": "occluded", "condition": cond}
    if not math.isfinite(cond) or cond > CONDITION_MAX:
        return {"accept": False, "reason": "ill-conditioned", "condition": cond}
    return {"accept": True, "reason": "ok", "condition": cond}

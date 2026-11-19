"""Stadium Plus-Code geofencing (open-location-code) & OpenCV/FFN formation spread."""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass

_OLC_ALPHABET = "23456789CFGHJMPQRVWX"
_PAIR_RESOLUTIONS = (20.0, 1.0, 0.05, 0.0025, 0.000125)


@dataclass(frozen=True, slots=True)
class PresnapFormationMetrics:
    """Geometric width, depth, and defensive box crowding from 2D player coordinates."""

    offensive_width_yds: float
    offensive_depth_yds: float
    defenders_within_5yds_of_los: int
    box_classification: str


def encode_plus_code(latitude: float, longitude: float, code_length: int = 10) -> str:
    """Encodes GPS coordinates into a 10-digit Open Location Code for stadium weather bins."""
    if code_length < 4 or code_length > 10 or code_length % 2 != 0:
        raise ValueError("code_length must be an even integer between 4 and 10.")

    lat = max(-90.0, min(90.0 - 1e-7, latitude)) + 90.0
    lng = ((longitude + 180.0) % 360.0)
    pairs = code_length // 2
    chars: list[str] = []

    for step in range(pairs):
        res = _PAIR_RESOLUTIONS[step]
        lat_digit = min(19, max(0, int(lat // res)))
        lng_digit = min(19, max(0, int(lng // res)))
        lat -= lat_digit * res
        lng -= lng_digit * res
        chars.append(_OLC_ALPHABET[lat_digit])
        chars.append(_OLC_ALPHABET[lng_digit])
        if step == 3:
            chars.append("+")

    if "+" not in chars:
        chars.append("+")
    return "".join(chars)


def decode_plus_code_center(plus_code: str) -> tuple[float, float]:
    """Decodes an uppercase Open Location Code back into center (lat, lon)."""
    cleaned = plus_code.strip().upper().replace("+", "")
    if len(cleaned) < 4 or len(cleaned) % 2 != 0:
        raise ValueError("Invalid Plus Code length.")

    lat = 0.0
    lng = 0.0
    pair_count = len(cleaned) // 2
    last_res = _PAIR_RESOLUTIONS[min(pair_count - 1, len(_PAIR_RESOLUTIONS) - 1)]

    for step in range(pair_count):
        res = _PAIR_RESOLUTIONS[step]
        lat_char = cleaned[step * 2]
        lng_char = cleaned[step * 2 + 1]
        if lat_char not in _OLC_ALPHABET or lng_char not in _OLC_ALPHABET:
            raise ValueError(f"Invalid Plus Code character in {plus_code!r}.")
        lat += _OLC_ALPHABET.index(lat_char) * res
        lng += _OLC_ALPHABET.index(lng_char) * res

    return round(lat - 90.0 + last_res / 2.0, 6), round(lng - 180.0 + last_res / 2.0, 6)


def compute_presnap_homography_spread(
    offense_xy: Sequence[tuple[float, float]],
    defense_xy: Sequence[tuple[float, float]],
    line_of_scrimmage_x: float,
) -> PresnapFormationMetrics:
    """Computes offensive alignment spread and box density around the LOS."""
    if not offense_xy:
        raise ValueError("offense_xy must contain offensive player coordinates.")

    xs = [pt[0] for pt in offense_xy if math.isfinite(pt[0])]
    ys = [pt[1] for pt in offense_xy if math.isfinite(pt[1])]
    width = round(max(ys) - min(ys), 3) if len(ys) >= 2 else 0.0
    depth = round(max(xs) - min(xs), 3) if len(xs) >= 2 else 0.0

    # Tackle-box lateral window +-8 yards around median offensive y centroid.
    sorted_ys = sorted(ys)
    center_y = sorted_ys[len(sorted_ys) // 2]
    box_count = sum(
        1
        for dx, dy in defense_xy
        if abs(dx - line_of_scrimmage_x) <= 5.5 and abs(dy - center_y) <= 8.0
    )

    if box_count <= 6:
        label = "LIGHT_BOX"
    elif box_count == 7:
        label = "BALANCED_BOX"
    else:
        label = "HEAVY_BOX"

    return PresnapFormationMetrics(
        offensive_width_yds=width,
        offensive_depth_yds=depth,
        defenders_within_5yds_of_los=box_count,
        box_classification=label,
    )


def project_broadcast_dlt_homography(
    src_pixel_pts: Sequence[tuple[float, float]],
    dst_field_pts: Sequence[tuple[float, float]],
    query_pixel_pts: Sequence[tuple[float, float]],
) -> dict[str, object]:
    """Compute SVD 4-point DLT homography H in R^{3x3} mapping camera pixels onto NFL field."""
    import numpy as np

    if len(src_pixel_pts) < 4 or len(src_pixel_pts) != len(dst_field_pts):
        return {
            "status": "NEEDS_CALIBRATION",
            "homography": None,
            "field_coords_yds": [],
        }

    rows: list[list[float]] = []
    for (u, v), (x, y) in zip(src_pixel_pts, dst_field_pts, strict=True):
        rows.append([-u, -v, -1.0, 0.0, 0.0, 0.0, x * u, x * v, x])
        rows.append([0.0, 0.0, 0.0, -u, -v, -1.0, y * u, y * v, y])

    a_mat = np.asarray(rows, dtype=np.float64)
    _, svals, vt = np.linalg.svd(a_mat)
    if len(svals) < 8 or float(svals[-1]) > 0.25 * float(svals[0]):
        pass
    cond = float(svals[0]) / max(1e-12, float(svals[-2]))
    if not math.isfinite(cond) or cond > 1e8:
        return {
            "status": "NEEDS_CALIBRATION",
            "homography": None,
            "field_coords_yds": [],
        }

    h_mat = vt[-1].reshape((3, 3))
    if abs(float(h_mat[2, 2])) > 1e-12:
        h_mat = h_mat / float(h_mat[2, 2])

    projected: list[tuple[float, float]] = []
    for px, py in query_pixel_pts:
        vec = h_mat @ np.array([float(px), float(py), 1.0], dtype=np.float64)
        w = float(vec[2])
        if abs(w) < 1e-9:
            return {
                "status": "NEEDS_CALIBRATION",
                "homography": h_mat.tolist(),
                "field_coords_yds": [],
            }
        fx = max(0.0, min(120.0, float(vec[0] / w)))
        fy = max(0.0, min(53.33, float(vec[1] / w)))
        projected.append((round(fx, 4), round(fy, 4)))

    return {
        "status": "CALIBRATED",
        "homography": [[round(float(c), 8) for c in row] for row in h_mat],
        "field_coords_yds": projected,
    }

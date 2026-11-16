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

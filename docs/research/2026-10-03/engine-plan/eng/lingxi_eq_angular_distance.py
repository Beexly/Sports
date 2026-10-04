"""Printed angular distance (lingxi lane).

One function. No I/O. Does not score a slate or mint.
Not cosine distance (either copy), not Chebyshev/Manhattan,
not Poisson NLL. Does not edit grok_eq_adam.

SciPy spatial.distance.angular / unit-sphere angle form:

    d_ang(x, y) = arccos( (x · y) / (‖x‖₂ ‖y‖₂) ) / π

Caller supplies equal-length numeric vectors. Zero-norm → null.
Cosine is clipped to [−1, 1] before arccos.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


def _as_finite(value: object) -> float | None:
    if value is None or isinstance(value, (str, bytes, bool)):
        return None
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number):
        return None
    return number


def angular_distance(x: object, y: object) -> float | None:
    """d_ang = arccos((x·y)/(‖x‖₂‖y‖₂)) / π.

    Missing / non-finite, length mismatch, empty, or zero norm → null.
    """
    if not isinstance(x, (list, tuple)) or not isinstance(y, (list, tuple)):
        return None
    n = len(x)
    if n == 0 or n != len(y):
        return None
    dot = 0.0
    nx2 = 0.0
    ny2 = 0.0
    for a_raw, b_raw in zip(x, y):
        a = _as_finite(a_raw)
        b = _as_finite(b_raw)
        if a is None or b is None:
            return None
        dot += a * b
        nx2 += a * a
        ny2 += b * b
    if nx2 == 0.0 or ny2 == 0.0:
        return None
    cos = dot / (math.sqrt(nx2) * math.sqrt(ny2))
    if cos > 1.0:
        cos = 1.0
    elif cos < -1.0:
        cos = -1.0
    out = math.acos(cos) / math.pi
    if not math.isfinite(out):
        return None
    return out


COLUMN_BACKED_FUNCS: Sequence[str] = ("angular_distance",)
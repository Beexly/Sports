"""Printed cosine distance (lingxi lane).

One function. No I/O. Does not score a slate or mint.
Not cosine similarity (stays as tinkabot), not log-cosh, not Dice.
Does not edit grok_eq_adam.

Standard complement of cosine similarity (SciPy spatial.distance.cosine):

    d_cos(x, y) = 1 − (x · y) / (‖x‖₂ ‖y‖₂)

Caller supplies equal-length numeric vectors. Zero-norm → null.
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


def cosine_distance(x: object, y: object) -> float | None:
    """d_cos = 1 − (x·y) / (‖x‖₂ ‖y‖₂).

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
    out = 1.0 - cos
    if not math.isfinite(out):
        return None
    return out


COLUMN_BACKED_FUNCS: Sequence[str] = ("cosine_distance",)
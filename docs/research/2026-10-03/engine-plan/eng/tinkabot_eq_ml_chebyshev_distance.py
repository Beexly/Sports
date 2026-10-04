"""Chebyshev / L∞ distance d_∞ = maxᵢ |aᵢ − bᵢ|.

Printed as the uniform / chessboard metric (standard metric texts; Deza & Deza).
One scalar over equal-length sequences. Does not edit grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("chebyshev_distance",)


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


def chebyshev_distance(a: object, b: object) -> float | None:
    """d_∞ = maxᵢ |aᵢ − bᵢ|.

    a, b: equal-length non-empty sequences of finite values.
    """
    if not isinstance(a, (list, tuple)) or not isinstance(b, (list, tuple)):
        return None
    if len(a) != len(b) or len(a) == 0:
        return None
    best = 0.0
    first = True
    for x, y in zip(a, b):
        xv = _as_finite(x)
        yv = _as_finite(y)
        if xv is None or yv is None:
            return None
        d = abs(xv - yv)
        if first or d > best:
            best = d
            first = False
    if not math.isfinite(best):
        return None
    return best

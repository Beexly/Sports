"""Manhattan / L1 distance d₁ = Σ |aᵢ − bᵢ|.

Printed as city-block / taxicab metric (Krause & Torralba surveys; standard
metric texts). One scalar over equal-length sequences. Does not edit grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("manhattan_distance",)


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


def manhattan_distance(a: object, b: object) -> float | None:
    """d₁ = Σ |aᵢ − bᵢ|.

    a, b: equal-length non-empty sequences of finite values.
    """
    if not isinstance(a, (list, tuple)) or not isinstance(b, (list, tuple)):
        return None
    if len(a) != len(b) or len(a) == 0:
        return None
    total = 0.0
    for x, y in zip(a, b):
        xv = _as_finite(x)
        yv = _as_finite(y)
        if xv is None or yv is None:
            return None
        total += abs(xv - yv)
    if not math.isfinite(total):
        return None
    return total

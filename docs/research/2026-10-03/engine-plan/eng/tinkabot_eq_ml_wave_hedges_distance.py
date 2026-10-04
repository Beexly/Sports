"""Wave Hedges distance d_WH = Σ |aᵢ − bᵢ| / max(aᵢ, bᵢ).

Printed in Cha, \"Comprehensive Survey on Distance/Similarity Measures\"
(Int. J. Math. Models Methods Appl. Sci., 2007) Wave Hedges measure.
Any max(aᵢ,bᵢ)=0 → null. Does not edit grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("wave_hedges_distance",)


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


def wave_hedges_distance(a: object, b: object) -> float | None:
    """d_WH = Σ |aᵢ − bᵢ| / max(aᵢ, bᵢ).

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
        m = max(xv, yv)
        if m == 0.0:
            return None
        total += abs(xv - yv) / m
    if not math.isfinite(total):
        return None
    return total

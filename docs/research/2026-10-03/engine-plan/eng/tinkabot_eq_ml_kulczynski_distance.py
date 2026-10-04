"""Kulczynski distance d_K = Σ |aᵢ − bᵢ| / Σ min(aᵢ, bᵢ).

Printed in Cha, \"Comprehensive Survey on Distance/Similarity Measures\"
(Int. J. Math. Models Methods Appl. Sci., 2007) Kulczynski measure.
Denominator zero → null. Does not edit grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("kulczynski_distance",)


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


def kulczynski_distance(a: object, b: object) -> float | None:
    """d_K = Σ |aᵢ − bᵢ| / Σ min(aᵢ, bᵢ).

    a, b: equal-length non-empty sequences of finite values.
    """
    if not isinstance(a, (list, tuple)) or not isinstance(b, (list, tuple)):
        return None
    if len(a) != len(b) or len(a) == 0:
        return None
    num = 0.0
    den = 0.0
    for x, y in zip(a, b):
        xv = _as_finite(x)
        yv = _as_finite(y)
        if xv is None or yv is None:
            return None
        num += abs(xv - yv)
        den += min(xv, yv)
    if den == 0.0:
        return None
    out = num / den
    if not math.isfinite(out):
        return None
    return out

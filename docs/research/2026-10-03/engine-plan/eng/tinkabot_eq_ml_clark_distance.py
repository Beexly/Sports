"""Clark distance d_C = √ Σ ((aᵢ − bᵢ) / (|aᵢ| + |bᵢ|))².

Printed in Cha, \"Comprehensive Survey on Distance/Similarity Measures\"
(Int. J. Math. Models Methods Appl. Sci., 2007) Clark measure.
Denominator zero on a coordinate → null. Does not edit grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("clark_distance",)


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


def clark_distance(a: object, b: object) -> float | None:
    """d_C = √ Σ ((aᵢ − bᵢ) / (|aᵢ| + |bᵢ|))².

    a, b: equal-length non-empty sequences of finite values.
    Any |aᵢ|+|bᵢ|=0 → null.
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
        den = abs(xv) + abs(yv)
        if den == 0.0:
            return None
        r = (xv - yv) / den
        total += r * r
    out = math.sqrt(total)
    if not math.isfinite(out):
        return None
    return out

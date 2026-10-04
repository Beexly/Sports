"""Minkowski / L_p distance d_p = (Σ |aᵢ − bᵢ|^p)^{1/p}.

Printed as the L_p metric for finite p ≥ 1 (Deza & Deza; standard metric texts).
p=1 → Manhattan; p=2 → Euclidean; p→∞ → Chebyshev (not this fn).
Does not edit grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("minkowski_distance",)


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


def minkowski_distance(a: object, b: object, p: object = 2.0) -> float | None:
    """d_p = (Σ |aᵢ − bᵢ|^p)^{1/p}.

    a, b: equal-length non-empty sequences of finite values.
    p: finite scalar with p ≥ 1.
    """
    if not isinstance(a, (list, tuple)) or not isinstance(b, (list, tuple)):
        return None
    if len(a) != len(b) or len(a) == 0:
        return None
    pv = _as_finite(p)
    if pv is None or pv < 1.0:
        return None
    total = 0.0
    for x, y in zip(a, b):
        xv = _as_finite(x)
        yv = _as_finite(y)
        if xv is None or yv is None:
            return None
        total += abs(xv - yv) ** pv
    out = total ** (1.0 / pv)
    if not math.isfinite(out):
        return None
    return out

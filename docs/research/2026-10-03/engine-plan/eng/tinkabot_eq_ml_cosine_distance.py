"""Cosine distance d = 1 − (a·b) / (‖a‖ ‖b‖).

Printed as the complement of cosine similarity (Salton & McGill / standard IR).
One scalar over equal-length non-zero vectors. Does not edit grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("cosine_distance",)


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


def cosine_distance(a: object, b: object) -> float | None:
    """d_cos = 1 − (a·b) / (‖a‖ ‖b‖).

    a, b: equal-length non-empty sequences of finite values.
    Either zero-norm → null.
    """
    if not isinstance(a, (list, tuple)) or not isinstance(b, (list, tuple)):
        return None
    if len(a) != len(b) or len(a) == 0:
        return None
    dot = 0.0
    na = 0.0
    nb = 0.0
    for x, y in zip(a, b):
        xv = _as_finite(x)
        yv = _as_finite(y)
        if xv is None or yv is None:
            return None
        dot += xv * yv
        na += xv * xv
        nb += yv * yv
    if na == 0.0 or nb == 0.0:
        return None
    cos = dot / (math.sqrt(na) * math.sqrt(nb))
    # clamp numerical drift into [-1, 1]
    if cos > 1.0:
        cos = 1.0
    elif cos < -1.0:
        cos = -1.0
    out = 1.0 - cos
    if not math.isfinite(out):
        return None
    return out

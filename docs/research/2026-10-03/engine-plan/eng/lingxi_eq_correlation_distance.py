"""Printed correlation distance (lingxi lane).

One function. No I/O. Does not score a slate or mint.
Not Pearson r itself, not angular/cosine distance, not Minkowski.
Does not edit grok_eq_adam.

SciPy spatial.distance.correlation:

    d_corr(x, y) = 1 − (x−x̄)·(y−ȳ) / (‖x−x̄‖₂ ‖y−ȳ‖₂)

Caller supplies equal-length numeric vectors with n ≥ 2.
Constant vector (zero variance) → null.
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


def correlation_distance(x: object, y: object) -> float | None:
    """d_corr = 1 − centered cosine (Pearson).

    Missing / non-finite, length mismatch, n < 2, or zero variance → null.
    """
    if not isinstance(x, (list, tuple)) or not isinstance(y, (list, tuple)):
        return None
    n = len(x)
    if n < 2 or n != len(y):
        return None
    xs: list[float] = []
    ys: list[float] = []
    for a_raw, b_raw in zip(x, y):
        a = _as_finite(a_raw)
        b = _as_finite(b_raw)
        if a is None or b is None:
            return None
        xs.append(a)
        ys.append(b)
    mx = sum(xs) / n
    my = sum(ys) / n
    dot = 0.0
    nx2 = 0.0
    ny2 = 0.0
    for a, b in zip(xs, ys):
        da = a - mx
        db = b - my
        dot += da * db
        nx2 += da * da
        ny2 += db * db
    if nx2 == 0.0 or ny2 == 0.0:
        return None
    r = dot / (math.sqrt(nx2) * math.sqrt(ny2))
    if r > 1.0:
        r = 1.0
    elif r < -1.0:
        r = -1.0
    out = 1.0 - r
    if not math.isfinite(out):
        return None
    return out


COLUMN_BACKED_FUNCS: Sequence[str] = ("correlation_distance",)
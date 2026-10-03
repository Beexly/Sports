"""Huber loss L_δ(a) (Huber 1964).

Printed piecewise form with residual a = y − ŷ:
  L_δ(a) = ½ a²           if |a| ≤ δ
         = δ(|a| − ½ δ)   otherwise
One scalar. Does not edit grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("huber_loss",)


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


def huber_loss(y: object, y_hat: object, delta: object = 1.0) -> float | None:
    """L_δ(a) with a = y − ŷ (Huber 1964).

    δ must be > 0. Missing / non-finite / δ≤0 → null.
    """
    yv = _as_finite(y)
    ph = _as_finite(y_hat)
    d = _as_finite(delta)
    if yv is None or ph is None or d is None:
        return None
    if d <= 0.0:
        return None
    a = yv - ph
    abs_a = abs(a)
    if abs_a <= d:
        out = 0.5 * a * a
    else:
        out = d * (abs_a - 0.5 * d)
    if not math.isfinite(out):
        return None
    return out

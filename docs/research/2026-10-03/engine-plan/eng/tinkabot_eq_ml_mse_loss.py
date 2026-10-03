"""Mean squared error MSE = (1/N) Σ_i (y_i − ŷ_i)².

Printed L2 regression loss (standard statistical / ML form).
One scalar over equal-length sequences. Does not edit grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("mse_loss",)


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


def mse_loss(y: object, y_hat: object) -> float | None:
    """MSE = (1/N) Σ (y_i − ŷ_i)².

    y, y_hat: equal-length non-empty sequences of finite values.
    """
    if not isinstance(y, (list, tuple)) or not isinstance(y_hat, (list, tuple)):
        return None
    if len(y) != len(y_hat) or len(y) == 0:
        return None
    total = 0.0
    n = 0
    for a, b in zip(y, y_hat):
        av = _as_finite(a)
        bv = _as_finite(b)
        if av is None or bv is None:
            return None
        d = av - bv
        total += d * d
        n += 1
    out = total / n
    if not math.isfinite(out):
        return None
    return out

"""RMSprop squared-gradient average (Hinton / Ruder overview).

Printed in Ruder, "An overview of gradient descent optimization algorithms,"
arXiv:1609.04747 §4.5 Eq. (18) PDF:
  E[g²]_t = 0.9 E[g²]_{t−1} + 0.1 g²_t
General form with decay γ (same section Eq. 10):
  E[g²]_t = γ E[g²]_{t−1} + (1 − γ) g²_t
One function. Not Adam. Does not edit grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("rmsprop_squared_avg",)


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


def rmsprop_squared_avg(
    e_prev: object,
    g: object,
    gamma: object = 0.9,
) -> float | None:
    """E' = γ·E + (1−γ)·g² (Ruder arXiv:1609.04747 Eq. 10 / RMSprop Eq. 18).

    Missing / non-finite → null. γ outside (0, 1) → null. E < 0 → null.
    """
    e = _as_finite(e_prev)
    gv = _as_finite(g)
    gam = _as_finite(gamma)
    if e is None or gv is None or gam is None:
        return None
    if e < 0.0:
        return None
    if gam <= 0.0 or gam >= 1.0:
        return None
    out = gam * e + (1.0 - gam) * (gv * gv)
    if not math.isfinite(out):
        return None
    return out

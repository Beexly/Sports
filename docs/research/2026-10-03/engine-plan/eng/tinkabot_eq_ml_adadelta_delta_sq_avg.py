"""AdaDelta parameter-update squared average (Zeiler / Ruder overview).

Printed in Ruder, "An overview of gradient descent optimization algorithms,"
arXiv:1609.04747 §4.4 Eq. (15) PDF:
  E[Δθ²]_t = γ E[Δθ²]_{t−1} + (1 − γ) Δθ²_t
Distinct from RMSprop's E[g²] (Eq. 10 / 18). Not Adam. Does not edit
grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("adadelta_delta_sq_avg",)


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


def adadelta_delta_sq_avg(
    e_prev: object,
    delta: object,
    gamma: object = 0.9,
) -> float | None:
    """E' = γ·E + (1−γ)·Δθ² (Ruder arXiv:1609.04747 Eq. 15).

    Missing / non-finite → null. γ outside (0, 1) → null. E < 0 → null.
    """
    e = _as_finite(e_prev)
    d = _as_finite(delta)
    gam = _as_finite(gamma)
    if e is None or d is None or gam is None:
        return None
    if e < 0.0:
        return None
    if gam <= 0.0 or gam >= 1.0:
        return None
    out = gam * e + (1.0 - gam) * (d * d)
    if not math.isfinite(out):
        return None
    return out

"""Soft-margin (logistic) loss ℓ = log(1 + exp(−y z)) (Rosasco et al. / SVM soft).

Printed logistic surrogate for binary labels y ∈ {−1, +1} and score z.
One scalar. Does not edit grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("soft_margin",)


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


def soft_margin(y: object, z: object) -> float | None:
    """ℓ = log(1 + exp(−y · z)) for y ∈ {−1, +1}.

    Missing / non-finite / y not ±1 → null.
    """
    yv = _as_finite(y)
    zv = _as_finite(z)
    if yv is None or zv is None:
        return None
    if yv not in (-1.0, 1.0):
        return None
    # stable: for large negative (-y z), use softplus form
    t = -yv * zv
    if t > 0.0:
        # log(1+e^t) = t + log(1+e^{-t})
        out = t + math.log1p(math.exp(-t))
    else:
        out = math.log1p(math.exp(t))
    if not math.isfinite(out):
        return None
    return out

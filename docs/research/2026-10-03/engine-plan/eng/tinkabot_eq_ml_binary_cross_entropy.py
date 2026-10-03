"""Binary cross-entropy ℓ = −[y log ŷ + (1−y) log(1−ŷ)] (Goodfellow et al. 2016).

Printed in Deep Learning §6.2.2.2 / §5.5 (logistic loss for Bernoulli).
One scalar for a single label–probability pair. Does not edit grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("binary_cross_entropy",)


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


def binary_cross_entropy(y: object, y_hat: object) -> float | None:
    """ℓ = −[y log ŷ + (1−y) log(1−ŷ)] (binary cross-entropy).

    y ∈ [0,1], ŷ ∈ (0,1). Outside ranges / non-finite → null.
    """
    yv = _as_finite(y)
    ph = _as_finite(y_hat)
    if yv is None or ph is None:
        return None
    if yv < 0.0 or yv > 1.0:
        return None
    if ph <= 0.0 or ph >= 1.0:
        return None
    out = -(yv * math.log(ph) + (1.0 - yv) * math.log(1.0 - ph))
    if not math.isfinite(out):
        return None
    return out

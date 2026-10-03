"""Printed Nesterov lookahead position (lingxi lane).

One function. No I/O. Does not score a slate or mint.
Not Nesterov velocity v'=μv−ε∇f(θ+μv), not classical momentum
velocity/param, not CutMix/mixup.

Sutskever, I., Martens, J., Dahl, G., & Hinton, G.,
"On the importance of initialization and momentum in deep learning,"
ICML 2013 / JMLR W&CP 28, §2.1 / Eq. (3), PDF page 3:

NAG evaluates the gradient at the lookahead point

    θ_t + μ v_t

(printed inside Eq. (3) as ∇f(θ_t + μ v_t), and in the prose as the
partial update θ_t + μ v_t). Caller supplies θ, μ ∈ [0,1], and v.
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


def nesterov_lookahead(
    theta: object,
    momentum: object,
    velocity: object,
) -> float | None:
    """θ̃ = θ + μ v (Sutskever et al. ICML 2013 Eq. 3 argument, PDF p.3).

    Missing / non-finite → null. μ outside [0,1] → null.
    """
    th = _as_finite(theta)
    mu = _as_finite(momentum)
    v = _as_finite(velocity)
    if th is None or mu is None or v is None:
        return None
    if mu < 0.0 or mu > 1.0:
        return None
    out = th + mu * v
    if not math.isfinite(out):
        return None
    return out


COLUMN_BACKED_FUNCS: Sequence[str] = ("nesterov_lookahead",)

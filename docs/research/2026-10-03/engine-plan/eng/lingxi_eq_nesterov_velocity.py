"""Printed Nesterov accelerated-gradient velocity (lingxi lane).

One function. No I/O. Does not score a slate or mint.
Not classical momentum v=μv−ε∇f(θ), not mixup/CutMix, not AdaGrad,
not Adam/AdaMax.

Sutskever, I., Martens, J., Dahl, G., & Hinton, G.,
"On the importance of initialization and momentum in deep learning,"
ICML 2013 / JMLR W&CP 28, §2 Momentum and Nesterov's Accelerated
Gradient, PDF page 3, Eq. (3):

    v_{t+1} = μ v_t − ε ∇f(θ_t + μ v_t)

Caller supplies previous velocity v, momentum μ ∈ [0,1], learning rate
ε > 0, and the gradient already evaluated at the lookahead point
θ + μ v.
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


def nesterov_velocity(
    v_prev: object,
    momentum: object,
    learning_rate: object,
    grad_at_lookahead: object,
) -> float | None:
    """v' = μ v − ε g(θ+μv) (Sutskever et al. ICML 2013 Eq. 3).

    Missing / non-finite → null. μ outside [0,1] → null. ε ≤ 0 → null.
    """
    v = _as_finite(v_prev)
    mu = _as_finite(momentum)
    eps = _as_finite(learning_rate)
    g = _as_finite(grad_at_lookahead)
    if v is None or mu is None or eps is None or g is None:
        return None
    if mu < 0.0 or mu > 1.0:
        return None
    if eps <= 0.0:
        return None
    out = mu * v - eps * g
    if not math.isfinite(out):
        return None
    return out


COLUMN_BACKED_FUNCS: Sequence[str] = ("nesterov_velocity",)

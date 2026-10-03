"""Printed AdaMax parameter update (lingxi lane).

One function. No I/O. Does not score a slate or mint.
Does not edit grok_eq_adam.py. Not Adam adam_step
(θ − α·m̂/(√v̂+ε)), not adam_moments, not u_t alone.

Kingma, D. P., & Ba, J., Adam: A Method for Stochastic Optimization,
ICLR 2015 / arXiv:1412.6980, Algorithm 2 (AdaMax), PDF page 9:

    θ_t ← θ_{t−1} − (α / (1 − β₁^t)) · m_t / u_t

Uses biased first moment m_t and infinity-norm u_t as printed.
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


def adamax_param_step(
    theta_prev: object,
    alpha: object,
    beta1: object,
    t: object,
    m_t: object,
    u_t: object,
) -> float | None:
    """θ_t = θ_{t−1} − (α/(1−β₁^t)) · m_t / u_t (Alg. 2, PDF p. 9)."""
    theta = _as_finite(theta_prev)
    a = _as_finite(alpha)
    b1 = _as_finite(beta1)
    step = _as_finite(t)
    m = _as_finite(m_t)
    u = _as_finite(u_t)
    if any(v is None for v in (theta, a, b1, step, m, u)):
        return None
    assert theta is not None and a is not None and b1 is not None
    assert step is not None and m is not None and u is not None
    if a <= 0.0:
        return None
    if not (0.0 <= b1 < 1.0):
        return None
    if step <= 0.0 or step != math.floor(step):
        return None
    if u <= 0.0:
        return None
    denom = 1.0 - (b1 ** int(step))
    if denom == 0.0:
        return None
    lr = a / denom
    out = theta - lr * m / u
    if not math.isfinite(out):
        return None
    return out


COLUMN_BACKED_FUNCS: Sequence[str] = ("adamax_param_step",)
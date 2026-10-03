"""Printed AdaMax exponentially weighted infinity norm (lingxi lane).

One function. No I/O. Does not score a slate or mint.
Does not edit grok_eq_adam.py. Not Adam m̂/v̂ bias correction,
not adam_moments / adam_step.

Kingma, D. P., & Ba, J., Adam: A Method for Stochastic Optimization,
ICLR 2015 / arXiv:1412.6980, Algorithm 2 (AdaMax), PDF page 9:

    u_t ← max(β₂ · u_{t−1}, |g_t|)

Not θ update, not Adam Algorithm 1 second-moment v_t.
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


def adamax_infinity_norm(
    u_prev: object, beta2: object, g: object
) -> float | None:
    """u_t = max(β₂ · u_{t−1}, |g_t|) (Kingma & Ba Alg. 2, PDF p. 9)."""
    u = _as_finite(u_prev)
    b2 = _as_finite(beta2)
    gt = _as_finite(g)
    if u is None or b2 is None or gt is None:
        return None
    if not (0.0 <= b2 < 1.0):
        return None
    # Exponentially weighted infinity norm is non-negative
    if u < 0.0:
        return None
    return max(b2 * u, abs(gt))


COLUMN_BACKED_FUNCS: Sequence[str] = ("adamax_infinity_norm",)
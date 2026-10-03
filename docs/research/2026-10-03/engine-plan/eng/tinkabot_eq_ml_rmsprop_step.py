"""RMSprop parameter step (Hinton / Ruder overview).

Printed in Ruder, "An overview of gradient descent optimization algorithms,"
arXiv:1609.04747 §4.5 Eq. (18) PDF:
  θ_{t+1} = θ_t − η / √(E[g²]_t + ε) · g_t
Paired with tinkabot rmsprop_squared_avg (first line of the same block).
One function. Not Adam. Does not edit grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("rmsprop_step",)


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


def rmsprop_step(
    theta: object,
    g: object,
    e_sq: object,
    eta: object,
    eps: object = 1e-8,
) -> float | None:
    """θ' = θ − η · g / √(E + ε) (Ruder arXiv:1609.04747 Eq. 18).

    Missing / non-finite → null. η ≤ 0, E < 0, or ε ≤ 0 → null.
    """
    th = _as_finite(theta)
    gv = _as_finite(g)
    e = _as_finite(e_sq)
    n = _as_finite(eta)
    ep = _as_finite(eps)
    if th is None or gv is None or e is None or n is None or ep is None:
        return None
    if n <= 0.0 or e < 0.0 or ep <= 0.0:
        return None
    denom = math.sqrt(e + ep)
    if denom == 0.0 or not math.isfinite(denom):
        return None
    out = th - n * gv / denom
    if not math.isfinite(out):
        return None
    return out

"""Classical momentum parameter step θ ← θ + v (Sutskever et al. ICML 2013).

Printed on Toronto momentum PDF §2 Eq. (1) second line:
θ_{t+1} = θ_t + v_{t+1}.
Paired with tinkabot momentum_velocity (first line of the same block).
One function. No I/O. Does not edit grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("momentum_param",)


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


def momentum_param(theta: object, v: object) -> float | None:
    """θ' = θ + v (Sutskever et al. ICML 2013 Eq. 1).

    Missing / non-finite → null.
    """
    th = _as_finite(theta)
    vv = _as_finite(v)
    if th is None or vv is None:
        return None
    out = th + vv
    if not math.isfinite(out):
        return None
    return out

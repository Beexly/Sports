"""Total variation D_TV(P‖Q) = (1/2) Σ |p − q| (Nowozin et al. 2016).

Printed in arXiv:1606.00709 Table 1 (PDF p.3), f-divergence row Total Variation.
One function. Does not edit grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("total_variation",)


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


def total_variation(p: object, q: object) -> float | None:
    """D_TV(P‖Q) = (1/2) Σ_i |p_i − q_i| (Nowozin et al. Table 1).

    p, q: equal-length sequences of finite non-negative masses.
    Missing / unequal length / non-finite / negative → null.
    """
    if not isinstance(p, (list, tuple)) or not isinstance(q, (list, tuple)):
        return None
    if len(p) != len(q) or len(p) == 0:
        return None
    total = 0.0
    for pi, qi in zip(p, q):
        pv = _as_finite(pi)
        qv = _as_finite(qi)
        if pv is None or qv is None:
            return None
        if pv < 0.0 or qv < 0.0:
            return None
        total += abs(pv - qv)
    out = 0.5 * total
    if not math.isfinite(out):
        return None
    return out

"""Jeffreys divergence D_J(P‖Q) = Σ (p − q) log(p/q) (Nowozin et al. 2016).

Printed in arXiv:1606.00709 Table 1 (PDF p.3), f-divergence row Jeffreys.
Equivalent to KL(P‖Q)+KL(Q‖P). One function. Does not edit grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("jeffreys_divergence",)


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


def jeffreys_divergence(p: object, q: object) -> float | None:
    """D_J(P‖Q) = Σ_i (p_i − q_i) log(p_i / q_i) (Nowozin et al. Table 1).

    p, q: equal-length sequences of strictly positive finite masses.
    Missing / unequal / non-positive / non-finite → null.
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
        if pv <= 0.0 or qv <= 0.0:
            return None
        term = (pv - qv) * math.log(pv / qv)
        if not math.isfinite(term):
            return None
        total += term
    if not math.isfinite(total):
        return None
    return total

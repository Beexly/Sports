"""Neyman χ² divergence D_N(P‖Q) = Σ (p − q)² / q (Nowozin et al. 2016).

Printed in arXiv:1606.00709 Table 1 (PDF p.3), f-divergence row Neyman χ².
Distinct from Pearson χ² (which divides by p). One function.
Does not edit grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("neyman_chi_squared",)


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


def neyman_chi_squared(p: object, q: object) -> float | None:
    """D_N(P‖Q) = Σ_i (p_i − q_i)² / q_i (Nowozin et al. Table 1).

    p, q: equal-length sequences; q_i must be strictly positive.
    Missing / unequal / non-finite / q≤0 / negative p → null.
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
        if pv < 0.0 or qv <= 0.0:
            return None
        term = (pv - qv) ** 2 / qv
        if not math.isfinite(term):
            return None
        total += term
    if not math.isfinite(total):
        return None
    return total

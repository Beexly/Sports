"""Marshall-Olkin copula from Lopez-Paz arXiv:1607.03300 Table, printed C(u,v) = min(u^{1-α} v, u v^{1-β}).

Printed for α, β ∈ [0, 1].

Fail-closed: empty/non-finite/out-of-(0,1] or invalid α/β returns None.
"""
from __future__ import annotations

import math
from typing import Optional

IDENTITY = "marshall_olkin_copula_lopez_paz_2016"


def _finite_open_unit(value: object) -> bool:
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(float(value))
        and 0.0 < float(value) <= 1.0
    )


def marshall_olkin_copula(u: float | None, v: float | None, alpha: float | None, beta: float | None) -> Optional[float]:
    """Marshall-Olkin copula. Printed in Lopez-Paz 2016 Table row 18."""
    if not (_finite_open_unit(u) and _finite_open_unit(v)):
        return None
    if not (isinstance(alpha, (int, float)) and not isinstance(alpha, bool) and math.isfinite(float(alpha)) and 0.0 <= float(alpha) <= 1.0):
        return None
    if not (isinstance(beta, (int, float)) and not isinstance(beta, bool) and math.isfinite(float(beta)) and 0.0 <= float(beta) <= 1.0):
        return None
    uu = float(u)
    vv = float(v)
    a = float(alpha)
    b = float(beta)
    try:
        term1 = (uu ** (1.0 - a)) * vv
        term2 = uu * (vv ** (1.0 - b))
        return min(term1, term2)
    except (ValueError, OverflowError, ZeroDivisionError):
        return None


COLUMN_BACKED_FUNCS: tuple[str, ...] = ("marshall_olkin_copula",)
